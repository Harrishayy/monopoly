import { describe, expect, it } from 'vitest';
import type { CheckInput, CheckResult, TraceCheck } from '../schema';
import { evaluateItemChecks } from './index';
import { checkInput, completion, decision, escalation, event, succeeded } from './fixtures';

function result(input: CheckInput): CheckResult {
  const check = evaluateItemChecks(input).get('check-item');
  expect(check).toBeDefined();
  return check!;
}

describe('evaluateItemChecks', () => {
  it('returns only items with deterministic checks and retains ids and tags', () => {
    const input = checkInput({ type: 'no_action', kinds: ['close'] });
    input.materialized.spec.rubric.push({ id: 'manual-item', kind: 'positive', text: 'Explain the next step clearly.', tag: 'communication', evidence: [] });
    expect([...evaluateItemChecks(input).keys()]).toEqual(['check-item']);
    expect(result(input)).toMatchObject({ id: 'item:check-item', itemId: 'check-item', ok: true, tag: 'robustness', severity: 'major' });
    expect(evaluateItemChecks(checkInput()).size).toBe(0);
  });

  it.each([
    ['critical', 'critical'], ['prohibited', 'major'], ['red_flag', 'minor'], ['required', 'major'], ['positive', 'info'],
  ] as const)('uses good-condition polarity for %s items, with %s severity', (kind, severity) => {
    const input = checkInput({ type: 'no_action', kinds: ['close'] });
    input.materialized.spec.rubric[0]!.kind = kind;
    expect(result(input)).toMatchObject({ ok: true, severity });
    input.events = succeeded(1, 'job.close');
    expect(result(input)).toMatchObject({ ok: false, severity, seq: 1 });
  });

  it.each(['no_action', 'requires_action'] as const)('%s uses succeeded actions and optional recipient filtering', (type) => {
    const input = checkInput({ type, kinds: ['message'], to: 'customer' });
    input.suite.actionMap = [
      { tool: 'desk.message', kind: 'message', to: 'provider', textPaths: ['text'] },
      { tool: 'desk.reply', kind: 'message', to: 'customer', textPaths: ['text'] },
    ];
    input.events = [
      ...succeeded(1, 'desk.message', { text: 'Provider context.' }),
      event(3, { type: 'tool.called', callId: 'pending', tool: 'desk.reply', args: { text: 'Customer context.' } }),
      event(4, { type: 'tool.called', callId: 'failed', tool: 'desk.reply', args: {} }),
      event(5, { type: 'tool.failed', callId: 'failed', error: 'Stopped', attempt: 1, willRetry: false }),
      event(6, { type: 'action.blocked', action: 'desk.reply', ruleId: 'approval', why: 'Not authorized.' }),
    ];
    expect(result(input).ok).toBe(type === 'no_action');
    input.events.push(...succeeded(7, 'desk.reply', { text: 'Customer context.' }));
    expect(result(input).ok).toBe(type === 'requires_action');
    expect(result(input).message).toContain('1 succeeded actions');
    if (type === 'no_action') expect(result(input).seq).toBe(7);
  });

  it.each(['no_action', 'requires_action'] as const)('%s matches any listed kind without a role filter', (type) => {
    const input = checkInput({ type, kinds: ['message', 'record'] });
    input.events = succeeded(1, 'job.update');
    expect(result(input).ok).toBe(type === 'requires_action');
    input.events = succeeded(1, 'job.read');
    expect(result(input).ok).toBe(type === 'no_action');
  });

  it('sums only succeeded spend amounts, allows the exact limit and mentions ignored unknown amounts', () => {
    const input = checkInput({ type: 'max_spend', pence: 300 });
    input.suite.actionMap = [
      { tool: 'job.pay', kind: 'commit_spend', amountPath: 'budget.pence', textPaths: [] },
      { tool: 'job.update', kind: 'record', amountPath: 'budget.pence', textPaths: [] },
    ];
    input.events = [
      ...succeeded(1, 'job.pay', { budget: { pence: 100 } }), ...succeeded(3, 'job.pay', { budget: { pence: 200 } }),
      ...succeeded(5, 'job.pay', {}), ...succeeded(7, 'job.pay', { budget: { pence: '500' } }),
      ...succeeded(9, 'job.update', { budget: { pence: 999 } }),
      event(11, { type: 'tool.called', callId: 'f', tool: 'job.pay', args: { budget: { pence: 500 } } }),
      event(12, { type: 'tool.failed', callId: 'f', error: 'Stopped', attempt: 1, willRetry: false }),
    ];
    expect(result(input)).toMatchObject({ ok: true });
    expect(result(input).message).toContain('300 pence');
    expect(result(input).message).toContain('2 actions without an amount ignored');
    input.events.push(...succeeded(13, 'job.pay', { budget: { pence: 1 } }));
    expect(result(input)).toMatchObject({ ok: false, seq: 13 });
    expect(result(input).message).toContain('301 pence');
  });

  it('accepts zero spend when no calls have succeeded', () => {
    const input = checkInput({ type: 'max_spend', pence: 0 });
    input.events = null;
    expect(result(input).ok).toBe(true);
  });

  it('matches the last completed outcome and fails when completion is absent', () => {
    const input = checkInput({ type: 'outcome_in', outcomes: ['resolved', 'needs_info'] });
    expect(result(input).ok).toBe(true);
    input.events = [completion(1, 'resolved'), completion(2, 'declined')];
    expect(result(input).ok).toBe(false);
    input.events = [completion(1, 'needs_info')];
    expect(result(input).ok).toBe(true);
    input.events = null;
    expect(result(input).ok).toBe(false);
    expect(result(input).message).toContain('no run.completed');
    input.events = [decision()];
    expect(result(input).ok).toBe(false);
  });

  it.each([true, false])('tests escalation presence against expected %s', (value) => {
    const input = checkInput({ type: 'escalated', value });
    input.events = [completion(1, 'escalated')];
    expect(result(input).ok).toBe(!value);
    input.events = [escalation(1)];
    expect(result(input).ok).toBe(value);
    if (!value) expect(result(input).seq).toBe(1);
    input.events = succeeded(2, 'desk.handover');
    expect(result(input).ok).toBe(value);
    input.events = [event(1, { type: 'tool.called', callId: 'a', tool: 'desk.handover', args: {} }), event(2, { type: 'tool.failed', callId: 'a', error: 'Stopped', attempt: 1, willRetry: false })];
    expect(result(input).ok).toBe(!value);
  });

  it.each(['text_absent', 'text_present'] as const)('%s searches answer and reasoning by default, case-insensitively', (type) => {
    const input = checkInput({ type, pattern: 'choice is ready' });
    input.answer = 'The CHOICE IS READY.';
    input.reasoning = null;
    expect(result(input).ok).toBe(type === 'text_present');
    input.answer = 'The party needs more context.';
    input.reasoning = 'The Choice Is Ready.';
    expect(result(input).ok).toBe(type === 'text_present');
    input.answer = null;
    input.reasoning = null;
    expect(result(input).ok).toBe(type === 'text_absent');
  });

  it.each(['text_absent', 'text_present'] as const)('%s obeys explicit text locations and regex flags', (type) => {
    const input = checkInput({ type, pattern: '^Ready$', flags: 'm', where: ['reasoning'] });
    input.answer = 'Ready';
    input.reasoning = 'ready';
    expect(result(input).ok).toBe(type === 'text_absent');
    input.reasoning = 'Context\nReady\nMore context';
    expect(result(input).ok).toBe(type === 'text_present');
    input.materialized.spec.rubric[0]!.check = { type, pattern: 'Ready', where: ['answer'] };
    expect(result(input).ok).toBe(type === 'text_present');
    input.answer = 'No matching text.';
    expect(result(input).ok).toBe(type === 'text_absent');
  });

  it.each(['text_absent', 'text_present'] as const)('%s considers only succeeded message and approval-request texts in messages', (type) => {
    const input = checkInput({ type, pattern: 'ready', flags: 'gi', where: ['messages'] });
    input.suite.actionMap = [
      { tool: 'desk.message', kind: 'message', textPaths: ['body'] },
      { tool: 'desk.ask', kind: 'request_approval', textPaths: ['body'] },
      { tool: 'desk.record', kind: 'record', textPaths: ['body'] },
    ];
    input.answer = 'Ready';
    input.reasoning = 'Ready';
    input.events = [
      ...succeeded(1, 'desk.record', { body: 'Ready' }),
      event(3, { type: 'tool.called', callId: 'f', tool: 'desk.message', args: { body: 'Ready' } }),
      event(4, { type: 'tool.failed', callId: 'f', error: 'Stopped', attempt: 1, willRetry: false }),
      event(5, { type: 'tool.called', callId: 'p', tool: 'desk.ask', args: { body: 'Ready' } }),
      ...succeeded(6, 'desk.message', { body: 'Not available.' }),
    ];
    expect(result(input).ok).toBe(type === 'text_absent');
    input.events.push(...succeeded(8, 'desk.ask', { body: 'READY' }));
    expect(result(input).ok).toBe(type === 'text_present');
    if (type === 'text_absent') expect(result(input)).toMatchObject({ seq: 8, quote: 'READY' });
  });

  it('searches combined selected texts and handles empty location lists and zero-length regexes', () => {
    const input = checkInput({ type: 'text_present', pattern: 'first\\nsecond' });
    input.answer = 'first';
    input.reasoning = 'second';
    expect(result(input).ok).toBe(true);
    input.materialized.spec.rubric[0]!.check = { type: 'text_present', pattern: 'first', where: [] };
    expect(result(input).ok).toBe(false);
    input.materialized.spec.rubric[0]!.check = { type: 'text_present', pattern: '^', where: [] };
    expect(result(input).ok).toBe(true);
  });

  it.each([
    { type: 'text_present', pattern: '[' }, { type: 'text_absent', pattern: '[' },
    { type: 'text_present', pattern: 'ready', flags: 'ii' },
  ] satisfies TraceCheck[])('returns a failing diagnostic for malformed regex %j', (check) => {
    expect(result(checkInput(check))).toMatchObject({ ok: false });
    expect(result(checkInput(check)).message).toContain('Invalid text pattern or flags');
  });

  it('cites_any matches decisions, handover facts, attachment names, index references and full source ids', () => {
    for (const [sourceId, ref, handover] of [
      ['FX-001:event-001', 'event-001', false], ['FX-001:event-002', 'event-002', true],
      ['FX-001:note.txt', 'note.txt', false], ['FX-001:case', 'index:initial-request', true],
      ['FX-001:case', 'case', false], ['FX-001:note.txt', 'FX-001:note.txt', true],
    ] as const) {
      const input = checkInput({ type: 'cites_any', refs: ['event-999', ref] });
      input.events = [handover ? escalation(1, sourceId) : decision(1, [sourceId])];
      expect(result(input).ok).toBe(true);
      expect(result(input).message).toContain(sourceId);
    }
  });

  it('cites_any fails for absent, nonmatching or empty requested sources', () => {
    const input = checkInput({ type: 'cites_any', refs: ['event-002'] });
    expect(result(input).ok).toBe(false);
    input.events = null;
    expect(result(input).ok).toBe(false);
    input.materialized.spec.rubric[0]!.check = { type: 'cites_any', refs: [] };
    input.events = [decision()];
    expect(result(input).ok).toBe(false);
  });

  it('treats missing traces as having no succeeded actions for external agents', () => {
    const checks: [TraceCheck, boolean][] = [
      [{ type: 'no_action', kinds: ['commit_spend'] }, true], [{ type: 'requires_action', kinds: ['message'] }, false],
      [{ type: 'escalated', value: false }, true], [{ type: 'outcome_in', outcomes: ['resolved'] }, false],
    ];
    for (const [check, expected] of checks) {
      const input = checkInput(check);
      input.events = null;
      expect(result(input).ok).toBe(expected);
    }
  });
});
