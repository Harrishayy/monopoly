import type { Outcome } from '@casework/core';
import type { AgentRunInput, BaselineKind, RunCaseFn } from '../schema';

const zeros = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

function spendArgs(path: string): Record<string, unknown> {
  const parts = path.split('.');
  const args: Record<string, unknown> = {};
  let current = args;
  for (const part of parts.slice(0, -1)) {
    const next: Record<string, unknown> = {};
    Object.defineProperty(current, part, { value: next, enumerable: true, writable: true });
    current = next;
  }
  Object.defineProperty(current, parts.at(-1)!, { value: 500000, enumerable: true, writable: true });
  return args;
}

/** Build a baseline closure with the suite and hidden continuation available only to the baseline. */
export function baselineRunCase(kind: BaselineKind, input: AgentRunInput): RunCaseFn {
  return async (c, pack, opts) => {
    const emit = opts.emit;
    emit({ type: 'run.started', caseRef: c.ref, autonomy: opts.autonomy });
    emit({ type: 'step.read', sourceIds: c.sources.map((source) => source.id), summary: 'Read the case' });
    let outcome: Outcome;
    let summary: string;
    if (kind === 'escalate') {
      const source = c.sources.find((s) => s.id.endsWith(':case'));
      if (!source) throw new Error('Baseline escalation requires a case-file source ending in :case');
      emit({ type: 'decision.made', label: 'Escalate to a person', rationale: 'Baseline: hands every case to a person without acting.', confidence: 0.5, citations: [source.id] });
      emit({ type: 'escalation.created', handover: {
        reason: 'Baseline escalation: every case goes to a person.', facts: [{ text: source.body.slice(0, 200), sourceId: source.id }],
        tried: [], options: [{ id: 'review', label: 'Review the case and decide the next step', effect: 'pauses', recommended: true }],
        refused: [], confidence: 0.5, queue: pack.vocabulary.handler,
      } });
      outcome = 'escalated';
      summary = 'Escalated without acting (baseline).';
    } else if (kind === 'reckless') {
      for (const action of ['commit_spend', 'assign_provider', 'close'] as const) {
        const entry = input.suite.actionMap.find((item) => item.kind === action);
        const callId = `baseline:${action}`;
        emit({ type: 'tool.called', callId, tool: entry?.tool ?? `baseline.${action}`, args: action === 'commit_spend' ? spendArgs(entry?.amountPath ?? 'amountPence') : {} });
        emit({ type: 'tool.succeeded', callId, result: { ok: true }, ms: 1 });
      }
      emit({ type: 'decision.made', label: 'Approve and close', rationale: 'Baseline: approves spend, assigns a provider and closes without checks.', confidence: 0.9, citations: [] });
      outcome = 'resolved';
      summary = 'Approved spend, assigned a provider and closed the case (baseline).';
    } else {
      const senders = input.suite.agentSenders.map((pattern) => new RegExp(pattern, 'i'));
      const bodies: string[] = [];
      for (const event of input.materialized.hidden.events) {
        const from = event.fields.find((field) => field.key.toLowerCase() === 'from')?.value ?? '';
        if (!senders.some((pattern) => pattern.test(from))) break;
        bodies.push(event.body);
      }
      const rationale = bodies.length ? bodies.join('\n\n').slice(0, 2000) : 'No recorded action before the next inbound message.';
      emit({ type: 'decision.made', label: 'Next recorded action', rationale, confidence: 1, citations: [] });
      outcome = bodies.some((body) => /\b(completed|closed)\b/i.test(body)) ? 'resolved' : 'needs_info';
      summary = rationale.slice(0, 300);
    }
    emit({ type: 'run.completed', outcome, summary, usage: zeros });
    return outcome;
  };
}
