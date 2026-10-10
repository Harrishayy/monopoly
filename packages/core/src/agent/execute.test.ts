import { describe, expect, it, vi } from 'vitest';
import { Case, TrackId, renderAnswers, runView, type TrackPack } from '../index';
import { executeCase, type RunCaseFn } from './execute';
import type { EmitInput } from './loop';

const c = Case.parse({
  ref: 'FX-001', track: TrackId.options[0], title: 'Routine job', customer: { name: 'Customer' }, status: 'new',
  sources: [{ id: 'FX-001:event-001', kind: 'email', title: 'Initial request', receivedAt: '2026-02-02T09:00:00.000Z', body: 'Please confirm the scope.' }],
});
const pack: TrackPack = {
  id: c.track, label: 'Fixture Track', vocabulary: { case: 'Job', cases: 'Jobs', customer: 'Customer', handler: 'Desk' },
  loadCases: async () => [c], tools: [], policy: { rules: [], mustEscalate: [] }, systemPrompt: '', autonomy: 'ask_first',
};

const sequence: EmitInput[] = [
  { type: 'run.started', caseRef: c.ref, autonomy: pack.autonomy },
  { type: 'step.read', sourceIds: ['FX-001:event-001'], summary: 'A scope confirmation is needed.' },
  { type: 'tool.called', callId: 'call-1', tool: 'desk.message', args: { text: 'Please confirm the scope.' } },
  { type: 'tool.failed', callId: 'call-1', error: 'Temporary failure', attempt: 1, willRetry: true },
  { type: 'tool.succeeded', callId: 'call-1', result: { sent: true }, ms: 10 },
  { type: 'action.blocked', action: 'Approve spend', ruleId: 'approval-required', why: 'No authorization yet.' },
  { type: 'decision.made', label: 'Request confirmation', rationale: 'The scope is unclear.', confidence: 0.8, citations: ['FX-001:event-001'] },
  { type: 'escalation.created', handover: {
    reason: 'Authorization is needed.', facts: [{ text: 'The scope is unclear.', sourceId: 'FX-001:event-001' }],
    tried: [{ text: 'Requested confirmation.', ok: true }],
    options: [{ id: 'confirm', label: 'Confirm scope', effect: 'pauses', recommended: true }],
    refused: [{ action: 'Approve spend', ruleId: 'approval-required' }], confidence: 0.8, queue: 'Operations desk',
  } },
  { type: 'run.completed', outcome: 'escalated', summary: 'Sent a request and handed over the authorization question.', usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } },
];

describe('executeCase', () => {
  it('validates a full trace and renders the same answers as the shared reducer', async () => {
    const runCaseImpl = vi.fn<RunCaseFn>(async (_case, _pack, opts) => {
      for (const event of sequence) opts.emit(event);
      return 'escalated';
    });
    const signal = new AbortController().signal;
    let tick = 0;
    const result = await executeCase(c, pack, {
      n: 7, runId: 'test-run', autonomy: 'autonomous', signal, runCaseImpl,
      now: () => new Date(Date.UTC(2026, 1, 2, 9, 0, tick++)),
    });
    expect(runCaseImpl).toHaveBeenCalledWith(c, pack, expect.objectContaining({ runId: 'test-run', autonomy: 'autonomous', signal }));
    expect(result.error).toBeUndefined();
    expect(result.runId).toBe('test-run');
    expect(result.events.map((event) => event.seq)).toEqual(sequence.map((_, i) => i));
    expect(result.events.every((event) => event.runId === 'test-run')).toBe(true);
    expect(result.events.map((event) => event.at)).toEqual(sequence.map((_, i) => new Date(Date.UTC(2026, 1, 2, 9, 0, i)).toISOString()));
    expect(result.view).toEqual(runView(result.events));
    expect(result.view.outcome).toBe('escalated');
    expect(result.view.toolCalls[0]?.attempts).toHaveLength(2);
    expect({ answer: result.answer, reasoning: result.reasoning }).toEqual(renderAnswers(result.view, c, 7));
    expect(result.answer).toContain('# Case 7 · FX-001 · Escalated');
    expect(result.reasoning).toContain('Sources: [FX-001:event-001]');
  });

  it('defaults to a UUID and the pack autonomy, overwriting emitter metadata', async () => {
    const runCaseImpl = vi.fn<RunCaseFn>(async (_case, _pack, opts) => {
      const event = { ...sequence[0]!, runId: 'ignored', seq: 99, at: 'invalid' };
      opts.emit(event);
      return 'needs_info';
    });
    const result = await executeCase(c, pack, { n: 1, runCaseImpl });
    expect(result.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(runCaseImpl).toHaveBeenCalledWith(c, pack, expect.objectContaining({ autonomy: pack.autonomy }));
    expect(result.events[0]).toMatchObject({ runId: result.runId, seq: 0 });
    expect(result.error).toBeUndefined();
  });

  it.each([new Error('Stopped early'), 'Stopped early'])('captures thrown errors and preserves the exact runner-error suffix (%s)', async (thrown) => {
    const result = await executeCase(c, pack, { n: 1, runCaseImpl: async (_case, _pack, opts) => {
      opts.emit(sequence[0]!);
      throw thrown;
    } });
    const rendered = renderAnswers(runView(result.events), c, 1);
    expect(result.events).toHaveLength(1);
    expect(result.error).toBe('Stopped early');
    expect(result.answer).toBe(`${rendered.answer}\n**Runner error**\nStopped early\n`);
    expect(result.reasoning).toBe(rendered.reasoning);
  });

  it('captures invalid emitted events without appending them or throwing', async () => {
    const result = await executeCase(c, pack, { n: 1, runCaseImpl: async (_case, _pack, opts) => {
      opts.emit(sequence[0]!);
      opts.emit({ type: 'tool.failed', callId: 'bad', error: 'Invalid attempt', attempt: 0, willRetry: false });
      return 'failed';
    } });
    expect(result.events).toHaveLength(1);
    expect(result.error).toContain('attempt');
    expect(result.answer).toContain(`\n**Runner error**\n${result.error}\n`);
    expect(result.view.status).toBe('running');
  });

  it('runs the default agent loop and records its trace', async () => {
    const result = await executeCase(c, pack, { n: 1 });
    expect(result.error).toBeUndefined();
    expect(result.events[0]).toMatchObject({ type: 'run.started', caseRef: c.ref, autonomy: pack.autonomy });
    expect(result.events.at(-1)).toMatchObject({ type: 'run.completed', outcome: 'escalated' });
    expect(result.view).toEqual(runView(result.events));
    expect({ answer: result.answer, reasoning: result.reasoning }).toEqual(renderAnswers(result.view, c, 1));
  });
});
