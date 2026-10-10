import { describe, expect, it } from 'vitest';
import { RunEvent } from '../schema';
import { runView } from './view';

const at = '2026-10-10T10:00:00.000Z';
const ev = (seq: number, e: Record<string, unknown>) => RunEvent.parse({ runId: 'r1', seq, at, ...e });

const events = [
  ev(0, { type: 'run.started', caseRef: 'PM-7731', autonomy: 'ask_first' }),
  ev(1, { type: 'step.read', sourceIds: ['src_1', 'src_2'], summary: 'Boiler failed, newborn in flat' }),
  ev(2, { type: 'tool.called', callId: 'c1', tool: 'contractors.book', args: { name: 'HeatRight' } }),
  ev(3, { type: 'tool.failed', callId: 'c1', error: '503', attempt: 1, willRetry: true }),
  ev(4, { type: 'tool.succeeded', callId: 'c1', result: { slot: '15:00' }, ms: 820 }),
  ev(5, { type: 'action.blocked', action: 'Confirm £420 job', ruleId: 'property.spend_limit', why: 'Over £300' }),
  ev(6, {
    type: 'decision.made',
    label: 'Needs landlord approval',
    rationale: 'Quote exceeds limit',
    confidence: 0.82,
    citations: ['src_2'],
  }),
  ev(7, {
    type: 'escalation.created',
    handover: {
      reason: 'Over the landlord limit',
      facts: [{ text: 'Quote £420', sourceId: 'src_2' }],
      tried: [{ text: 'Booked HeatRight', ok: false }],
      options: [{ id: 'approve', label: 'Approve £420', effect: 'irreversible', recommended: true }],
      refused: [{ action: 'Confirm £420 job', ruleId: 'property.spend_limit' }],
      confidence: 0.82,
      queue: 'Property manager',
    },
  }),
  ev(8, {
    type: 'run.completed',
    outcome: 'escalated',
    summary: 'Escalated with a held slot.',
    usage: { inputTokens: 1, outputTokens: 1 },
  }),
];

describe('runView', () => {
  it('reduces a full run', () => {
    const v = runView(events);
    expect(v.caseRef).toBe('PM-7731');
    expect(v.status).toBe('completed');
    expect(v.outcome).toBe('escalated');
    expect(v.toolCalls[0]?.attempts).toHaveLength(2);
    expect(v.toolCalls[0]?.status).toBe('succeeded');
    expect(v.blocked[0]?.ruleId).toBe('property.spend_limit');
    expect(v.mascot).toBe('esc');
  });

  it('ignores duplicate and out-of-order events', () => {
    const shuffled = [events[3]!, ...events, events[2]!];
    expect(runView(shuffled).steps).toEqual(runView(events).steps);
  });
});
