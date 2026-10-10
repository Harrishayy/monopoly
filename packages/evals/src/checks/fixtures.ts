import { RunEvent } from '@casework/core';
import { EvalSuite, ScenarioSpec, type CheckInput, type TraceCheck } from '../schema';
import { fixtureSuite } from '../testing/fixtures';
import { ANSWER_SECTIONS } from './sections';

/** Build a validated event with neutral defaults for check unit tests. */
export function event(seq: number, fields: Record<string, unknown>): RunEvent {
  return RunEvent.parse({ runId: 'run', seq, at: '2026-01-01T00:00:00Z', ...fields });
}

/** Build a validated successful completion event for check unit tests. */
export function completion(seq = 20, outcome = 'resolved'): RunEvent {
  return event(seq, { type: 'run.completed', outcome, summary: 'The requested job is ready.', usage: { inputTokens: 1, outputTokens: 1 } });
}

/** Build a validated decision carrying the specified citations for check unit tests. */
export function decision(seq = 10, citations = ['FX-001:event-001']): RunEvent {
  return event(seq, { type: 'decision.made', label: 'wait', confidence: 0.8, rationale: 'The approver needs more context.', citations });
}

/** Build a validated handover event with neutral evidence and options for check unit tests. */
export function escalation(seq = 15, sourceId = 'FX-001:event-001'): RunEvent {
  return event(seq, { type: 'escalation.created', handover: {
    queue: 'Operations desk', reason: 'A person must choose the next step.',
    facts: [{ text: 'The requested scope is unclear.', sourceId }], tried: [], refused: [], confidence: 0.7,
    options: [{ id: 'ask', label: 'Request more context', effect: 'reversible' }],
  } });
}

/** Build a called/succeeded event pair using validated RunEvents. */
export function succeeded(seq: number, tool: string, args: unknown = {}, callId = `call-${seq}`): RunEvent[] {
  return [event(seq, { type: 'tool.called', callId, tool, args }), event(seq + 1, { type: 'tool.succeeded', callId, result: { ok: true }, ms: 2 })];
}

/** Render the required answer section layout with optional failure text and heading style. */
export function answerText(failure = 'Nothing', headings = false): string {
  return ANSWER_SECTIONS.map((title) => `${headings ? `## ${title}` : `**${title}**`}\n${title === 'What failed' ? failure : 'The available context was used.'}`).join('\n\n');
}

/** Build a complete, neutral deterministic-check input, optionally with one rubric check. */
export function checkInput(check?: TraceCheck): CheckInput {
  const suite = EvalSuite.parse(fixtureSuite);
  const spec = ScenarioSpec.parse({
    ...suite.scenarios[0], hiddenFacts: [], rubric: [{ id: 'check-item', kind: 'required', tag: 'robustness', text: 'Use the available context carefully.', ...(check ? { check } : {}) }],
  });
  const scenario: CheckInput['scenario'] = { id: spec.id, baseId: spec.id, variant: 'base', spec, edits: [] };
  return {
    scenario, suite, answer: answerText(), reasoning: '## Step 1 · wait\nThe next step needs more context.',
    events: [decision(), completion()], ledger: [], agentError: null,
    materialized: {
      scenario, spec, root: '/unused', caseDir: '/unused/001', folder: '001',
      visibleEvents: ['001', '002'], visibleAttachments: ['note.txt'], visibleText: 'Visible context.',
      hidden: { scenarioId: spec.id, events: [{ number: '003', at: '', fields: [], body: 'Later context.' }], attachments: [], removedSections: [], removedDetails: [], renumbering: {} },
      leak: { ok: true, findings: [] },
    },
  };
}
