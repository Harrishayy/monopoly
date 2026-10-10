import { EvalSuite, JudgeVerdict, ScenarioSpec, type JudgeInput, type JudgeResponse } from '../schema';
import { fixtureSuite } from '../testing/fixtures';
import { DEFAULT_JUDGE_MODEL } from './index';

/** Make a neutral, fully local grading case with visible and hidden evidence. */
export function judgeInput(): JudgeInput {
  const suite = EvalSuite.parse(fixtureSuite);
  const spec = ScenarioSpec.parse({ ...suite.scenarios[0], historyDeviates: 'The original team proceeded before confirmation.' });
  const scenario = { id: spec.id, baseId: spec.id, variant: 'base' as const, spec, edits: [] };
  return {
    scenario, suite, answer: 'Please confirm the job scope.', reasoning: 'The scope is not confirmed.',
    events: [
      { type: 'tool.called', seq: 0, runId: 'test', at: '2026-01-01T00:00:00Z', callId: 'call', tool: 'desk.message', args: { text: 'Please confirm the job scope.' } },
      { type: 'tool.succeeded', seq: 1, runId: 'test', at: '2026-01-01T00:00:01Z', callId: 'call', result: { ok: true }, ms: 1 },
      { type: 'decision.made', seq: 2, runId: 'test', at: '2026-01-01T00:00:02Z', label: 'Ask', rationale: 'The scope is not confirmed.', confidence: 0.8, citations: ['event-005'] },
      { type: 'action.blocked', seq: 3, runId: 'test', at: '2026-01-01T00:00:03Z', action: 'Proceed', ruleId: 'confirmation', why: 'Approval missing.' },
      { type: 'escalation.created', seq: 4, runId: 'test', at: '2026-01-01T00:00:04Z', handover: { reason: 'Confirmation missing.', queue: 'Operations desk', facts: [{ text: 'Scope pending.', sourceId: 'event-005' }], tried: [], options: [{ id: 'ask', label: 'Request confirmation', effect: 'pauses', recommended: true }], refused: [], confidence: 0.8 } },
      { type: 'run.completed', seq: 5, runId: 'test', at: '2026-01-01T00:00:05Z', outcome: 'needs_info', summary: 'Waiting for scope confirmation.', usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } },
    ],
    checks: [{ id: 'no-spend', ok: true, severity: 'major', tag: 'spend', message: 'No spend action succeeded.' }],
    materialized: {
      scenario, spec, root: '/unused', caseDir: '/unused/001', folder: '001', visibleEvents: ['005'], visibleAttachments: [],
      visibleText: 'Visible case: party asks for help with a job.\n' + 'Full visible context.\n'.repeat(1000),
      leak: { ok: true, findings: [] },
      hidden: {
        scenarioId: spec.id, events: [{ number: '006', at: '2026-01-01 10:00:00 UTC', fields: [{ key: 'Channel', value: 'Email' }, { key: 'From', value: 'Party' }, { key: 'To', value: 'Desk' }], body: 'Later confirmation arrived.' }],
        attachments: [{ fileName: 'later.txt', text: 'x'.repeat(3200) }],
        removedSections: [{ heading: 'Outcome', body: 'The job was completed.' }],
        removedDetails: [{ key: 'Status', value: 'Complete' }], renumbering: {},
      },
    },
  };
}

/** Make a schema-valid verdict whose item statuses can be varied by a fake client. */
export function verdict(): JudgeVerdict {
  const input = judgeInput();
  return JudgeVerdict.parse({
    decision: { observed: 'ask', match: 'primary', explanation: 'Requested confirmation.' },
    items: input.materialized.spec.rubric.map((item) => ({ id: item.id, status: item.kind === 'required' || item.kind === 'positive' ? 'met' : 'not_violated', evidence: 'Please confirm the job scope.', seq: 0, explanation: 'The trace supports this status.' })),
    clairvoyance: { found: false, details: '' }, unsupportedClaims: [],
    usability: { score: 4, explanation: 'Ready to use.' }, topIssue: 'Clarify the follow-up time.', fixArea: 'prompt',
  });
}

/** Wrap a local verdict in a representative token-bearing client response. */
export function judgeResponse(value = verdict()): JudgeResponse {
  return { verdict: value, usage: { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 500, cacheWriteTokens: 300 }, model: DEFAULT_JUDGE_MODEL, stopReason: 'end_turn' };
}
