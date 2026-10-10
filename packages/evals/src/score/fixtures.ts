import { TrackId } from '@casework/core';
import type { z } from 'zod';
import { RunConfig, ScenarioResult, ScenarioSpec, JudgeVerdict, type RubricItem, type ItemResult, type ScenarioScores } from '../schema';

/** Build a neutral scenario with overridable rubric and decision. */
export function makeSpec(overrides: Partial<ScenarioSpec> = {}): ScenarioSpec {
  return ScenarioSpec.parse({ id: 'FX-001@002', case: '001', cutAfter: '002', title: 'Choose the next job action',
    expected: { decision: 'act', summary: 'Complete the authorized next action with available evidence.' },
    rubric: [{ id: 'do-job', kind: 'required', tag: 'scope', text: 'Complete the authorized job action.' }], ...overrides });
}

/** Build a rubric result with the default passing status. */
export function makeItem(overrides: Partial<ItemResult> = {}): ItemResult {
  return { id: 'do-job', kind: 'required', tag: 'scope', text: 'Complete the authorized job action.', weight: 3,
    status: 'met', source: 'judge', evidence: null, seq: null, explanation: null, fix: null, uncertain: false, ...overrides };
}

/** Parse verdict input defaults, starting with one passing item. */
export function makeVerdict(overrides: Partial<z.input<typeof JudgeVerdict>> = {}): JudgeVerdict {
  return JudgeVerdict.parse({ decision: { observed: 'act', match: 'primary', explanation: 'The next action was completed.' },
    items: [{ id: 'do-job', status: 'met', evidence: 'Job updated.', seq: 3, explanation: 'Matches the required action.' }],
    clairvoyance: { found: false, details: '' }, unsupportedClaims: [], usability: { score: 3, explanation: 'Clear summary.' },
    topIssue: 'Explain the follow-up time.', fixArea: 'output', ...overrides });
}

/** Build a run configuration without embedding track knowledge. */
export function makeConfig(overrides: Partial<RunConfig> = {}): RunConfig {
  return RunConfig.parse({ runId: 'run-current', createdAt: '2026-01-01T00:00:00Z', suite: 'smoke', scenarioIds: ['FX-001@002'],
    agent: 'test-agent', track: TrackId.options[0], dataDir: '/tmp/cases', gitSha: 'abc123', gitDirty: false,
    models: { decide: 'agent-model', fast: null, judge: null }, judge: { enabled: false, samples: 1, effort: 'high' },
    rubricVersion: 'v1', concurrency: 1, repeat: 1, timeoutMs: 1000, ...overrides });
}

/** Build a persisted result with independently overridable scores. */
export function makeResult(overrides: Partial<ScenarioResult> = {}, scores: Partial<ScenarioScores> = {}): ScenarioResult {
  return ScenarioResult.parse({ runId: 'run-current', scenarioId: 'FX-001@002', baseId: 'FX-001@002', variant: 'base', repeat: 1,
    title: 'Choose the next job action', tags: [], agent: 'test-agent', expectedDecision: 'act', ms: 100, agentError: null,
    agentUsage: null, checks: [], items: [makeItem()], judge: null,
    scores: { completed: true, critical: false, outcome: 1, judgement: 1, engineering: 1, usability: null,
      decisionObserved: 'act', decisionMatch: 'primary', ...scores }, topIssue: null, fixArea: null, artifactsDir: 'agent/job/r1', ...overrides });
}

/** Build a complete rubric item using neutral fixture text. */
export function makeRubric(overrides: Partial<RubricItem> = {}): RubricItem {
  return { id: 'do-job', kind: 'required', tag: 'scope', text: 'Complete the authorized job action.', evidence: [], ...overrides };
}
