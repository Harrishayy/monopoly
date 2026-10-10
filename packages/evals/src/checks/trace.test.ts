import { describe, expect, it } from 'vitest';
import type { ActionMapEntry } from '../schema';
import { actionsFromTrace, condenseTrace, sourceRefMatches } from './index';
import { completion, decision, escalation, event, succeeded } from './fixtures';

const map: ActionMapEntry[] = [{ tool: 'desk.message', kind: 'message', toPath: 'party.role', toRoles: { customer: 'customer' }, textPaths: ['content.0.text', 'content.1.text', 'absent'], amountPath: 'budget.pence' }];

describe('actionsFromTrace', () => {
  it('extracts map metadata and preserves call order despite out-of-order results', () => {
    const events = [
      event(1, { type: 'tool.called', callId: 'a', tool: 'desk.message', args: { party: { role: 'CUSTOMER' }, content: [{ text: 'First' }, { text: 'Second' }], budget: { pence: 42 } } }),
      event(2, { type: 'tool.called', callId: 'b', tool: 'job.read', args: {} }),
      event(3, { type: 'tool.succeeded', callId: 'b', result: {}, ms: 1 }),
      event(4, { type: 'tool.succeeded', callId: 'a', result: {}, ms: 1 }),
    ];
    const actions = actionsFromTrace(events, map);
    expect(actions.map((action) => action.callId)).toEqual(['a', 'b']);
    expect(actions[0]).toMatchObject({ seq: 1, kind: 'message', status: 'succeeded', attempts: 1, to: 'customer', amountPence: 42, text: 'First\nSecond\n' });
    expect(actions[1]).toMatchObject({ seq: 2, kind: 'read', status: 'succeeded', text: '' });
  });

  it('counts failures plus one success, with success overriding final failure', () => {
    const events = [
      event(1, { type: 'tool.called', callId: 'a', tool: 'job.update', args: {} }),
      event(2, { type: 'tool.failed', callId: 'a', error: 'Temporary', attempt: 1, willRetry: true }),
      event(3, { type: 'tool.failed', callId: 'a', error: 'Stopped', attempt: 2, willRetry: false }),
      event(4, { type: 'tool.succeeded', callId: 'a', result: {}, ms: 1 }),
      event(5, { type: 'tool.succeeded', callId: 'a', result: {}, ms: 1 }),
      event(6, { type: 'tool.failed', callId: 'a', error: 'Late failure', attempt: 3, willRetry: false }),
    ];
    expect(actionsFromTrace(events, [])[0]).toMatchObject({ status: 'succeeded', attempts: 4 });
  });

  it('distinguishes retry-then-failure, retry-pending, and untouched calls', () => {
    const events = [
      event(1, { type: 'tool.called', callId: 'a', tool: 'job.update', args: {} }),
      event(2, { type: 'tool.failed', callId: 'a', error: 'Temporary', attempt: 1, willRetry: true }),
      event(3, { type: 'tool.failed', callId: 'a', error: 'Stopped', attempt: 2, willRetry: false }),
      event(4, { type: 'tool.called', callId: 'b', tool: 'job.update', args: {} }),
      event(5, { type: 'tool.failed', callId: 'b', error: 'Temporary', attempt: 1, willRetry: true }),
      event(6, { type: 'tool.called', callId: 'c', tool: 'job.update', args: {} }),
    ];
    expect(actionsFromTrace(events, []).map(({ status, attempts }) => ({ status, attempts }))).toEqual([
      { status: 'failed', attempts: 2 }, { status: 'pending', attempts: 1 }, { status: 'pending', attempts: 0 },
    ]);
  });

  it('ignores orphan results before a call and blocked actions, and adds handovers in order', () => {
    const events = [
      event(0, { type: 'tool.succeeded', callId: 'a', result: {}, ms: 1 }),
      event(1, { type: 'tool.failed', callId: 'missing', error: 'Unknown', attempt: 1, willRetry: false }),
      event(2, { type: 'action.blocked', action: 'job.book', ruleId: 'approval', why: 'Needs approval.' }),
      event(3, { type: 'tool.called', callId: 'a', tool: 'job.read', args: {} }),
      escalation(4),
    ];
    expect(actionsFromTrace(events, []).map(({ callId, status, seq }) => ({ callId, status, seq }))).toEqual([
      { callId: 'a', status: 'pending', seq: 3 }, { callId: 'escalation-4', status: 'succeeded', seq: 4 },
    ]);
    expect(actionsFromTrace(events, [])[1]).toMatchObject({ kind: 'escalate', attempts: 1 });
  });

  it.each([42.5, '42', null, undefined, Infinity])('does not treat %s as integer pence', (amount) => {
    const args = { budget: { pence: amount } };
    const action = actionsFromTrace(succeeded(1, 'desk.message', args), map)[0]!;
    expect(action.amountPence).toBeUndefined();
    expect(action.to).toBe('unknown');
    expect(action.text).toBe('\n\n');
  });

  it('respects a fixed role over a dynamic role and accepts zero or negative integer amounts', () => {
    for (const pence of [0, -1]) {
      const action = actionsFromTrace(succeeded(1, 'desk.message', { budget: { pence } }), [{ ...map[0]!, to: 'internal' }])[0]!;
      expect(action.to).toBe('internal');
      expect(action.amountPence).toBe(pence);
    }
  });

  it('joins text path values in order, including empty, missing, numeric and boolean values', () => {
    const entry: ActionMapEntry = { tool: 'desk.message', kind: 'message', textPaths: ['a', 'missing', 'b', 'c', 'd', 'e'] };
    const action = actionsFromTrace(succeeded(1, entry.tool, { a: 'First', b: null, c: '', d: 0, e: false }), [entry])[0]!;
    expect(action.text).toBe('First\n\n\n\n0\nfalse');
  });

  it('returns no actions for an absent or empty trace', () => {
    expect(actionsFromTrace(null, [])).toEqual([]);
    expect(actionsFromTrace([], [])).toEqual([]);
  });
});

describe('condenseTrace', () => {
  const events = [
    event(0, { type: 'run.started', caseRef: 'FX-001', autonomy: 'autonomous' }),
    event(1, { type: 'step.read', sourceIds: ['FX-001:case'], summary: 'Read the context.' }),
    ...succeeded(2, 'job.update', { body: 'First\nSecond' }),
    event(4, { type: 'tool.failed', callId: 'a', error: 'Temporary\nproblem', attempt: 1, willRetry: true }),
    event(5, { type: 'action.blocked', action: 'job.book', ruleId: 'approval', why: 'Not authorized.' }),
    decision(6), escalation(7), completion(8),
  ];

  it('prints every event type with one physical line per event and useful details', () => {
    const trace = condenseTrace(events);
    expect(trace.split('\n')).toHaveLength(events.length);
    for (const entry of events) expect(trace).toContain(`#${entry.seq} ${entry.type}`);
    for (const detail of ['job.update', '{"body":', 'result={"ok":true}', 'error=Temporary problem', 'rule=approval', 'wait confidence=0.8', 'Operations desk:', 'resolved:']) expect(trace).toContain(detail);
  });

  it('reports the exact number of omitted events while staying in budget', () => {
    const first = condenseTrace([events[0]!]);
    const budget = first.length + '\n… (+8 more events)'.length;
    expect(condenseTrace(events, budget)).toBe(`${first}\n… (+8 more events)`);
    expect(condenseTrace(events, budget).length).toBeLessThanOrEqual(budget);
    expect(condenseTrace(events, condenseTrace(events).length)).toBe(condenseTrace(events));
  });

  it('handles null, empty traces, tiny budgets, and oversized args', () => {
    expect(condenseTrace(null)).toBe('');
    expect(condenseTrace([])).toBe('');
    expect(condenseTrace(events, 0)).toBe('');
    expect(condenseTrace(events, -1)).toBe('');
    expect(condenseTrace(events, 1)).toBe('…');
    expect(condenseTrace(succeeded(1, 'job.update', { text: 'x'.repeat(7000) }))).toBe('… (+2 more events)');
  });
});

describe('sourceRefMatches', () => {
  it.each([
    ['FX-001:event-012', 'event-012', true], ['OTHER:event-012', 'event-012', true],
    ['FX-001:event-013', 'event-012', false], ['FX-001:event-012-extra', 'event-012', false],
    ['FX-001:case', 'case', true], ['FX-001:case', 'index:details', true], ['FX-001:case', 'index:initial-request', true],
    ['FX-001:event-001', 'index:details', false], ['FX-001:note.txt', 'note.txt', true],
    ['FX-001:other-note.txt', 'note.txt', false], ['FX-001:note.txt', 'FX-001:note.txt', true],
    ['FX-001:README', 'README', true], ['FX-001:longREADME', 'README', false],
    ['FX-001:note.txt', 'OTHER:note.txt', false], ['standalone', 'standalone', true], ['standalone', 'other', false],
  ])('matches %s against %s: %s', (sourceId, ref, expected) => {
    expect(sourceRefMatches(String(sourceId), String(ref))).toBe(expected);
  });
});
