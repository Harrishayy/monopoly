import { z } from 'zod';
import { TrackId } from '@casework/core';
import { ActionKind, DecisionClass, FailureTag, FixArea, ItemStatus, RubricKind, SuiteName, TokenUsage } from './common';

const decisionMatch = z.enum(['primary', 'acceptable', 'wrong']);
const unitScore = z.number().min(0).max(1);

export const LedgerEntry = z.object({
  tool: z.string(), kind: ActionKind, args: z.unknown(), idempotencyKey: z.string(), attempt: z.number(),
  outcome: z.enum(['ok', 'error', 'timeout', 'bad_data']), at: z.string(), error: z.string().optional(),
});
export type LedgerEntry = z.infer<typeof LedgerEntry>;

export const CheckResult = z.object({
  id: z.string(), itemId: z.string().optional(), ok: z.boolean(),
  severity: z.enum(['critical', 'major', 'minor', 'info']), tag: FailureTag,
  message: z.string(), seq: z.number().optional(), quote: z.string().optional(),
});
export type CheckResult = z.infer<typeof CheckResult>;

export const JudgeItem = z.object({
  id: z.string(), status: z.enum(['met', 'partial', 'missed', 'violated', 'not_violated', 'not_applicable']),
  evidence: z.string(), seq: z.number().nullable(), explanation: z.string(),
  uncertain: z.boolean().default(false),
});
export type JudgeItem = z.infer<typeof JudgeItem>;

export const JudgeVerdict = z.object({
  decision: z.object({ observed: DecisionClass, match: decisionMatch, explanation: z.string() }),
  items: z.array(JudgeItem), clairvoyance: z.object({ found: z.boolean(), details: z.string() }),
  unsupportedClaims: z.array(z.object({ claim: z.string(), explanation: z.string() })),
  usability: z.object({ score: z.number().int().min(0).max(4), explanation: z.string() }),
  topIssue: z.string(), fixArea: FixArea,
});
export type JudgeVerdict = z.infer<typeof JudgeVerdict>;

export const JudgeRecord = z.object({
  verdict: JudgeVerdict.nullable(), model: z.string(), samples: z.number(), agreement: z.number().nullable(),
  cached: z.boolean(), usage: TokenUsage, costUsd: z.number().nullable(), error: z.string().nullable(),
});
export type JudgeRecord = z.infer<typeof JudgeRecord>;

export const ItemResult = z.object({
  id: z.string(), kind: RubricKind, tag: FailureTag, text: z.string(), weight: z.number(), status: ItemStatus,
  source: z.enum(['check', 'judge', 'both', 'none']), evidence: z.string().nullable(), seq: z.number().nullable(),
  explanation: z.string().nullable(), fix: FixArea.nullable(), uncertain: z.boolean(),
});
export type ItemResult = z.infer<typeof ItemResult>;

export const ScenarioScores = z.object({
  completed: z.boolean(), critical: z.boolean(), outcome: unitScore, judgement: unitScore,
  engineering: unitScore, usability: unitScore.nullable(), decisionObserved: DecisionClass.nullable(),
  decisionMatch: decisionMatch.nullable(),
});
export type ScenarioScores = z.infer<typeof ScenarioScores>;

export const ScenarioResult = z.object({
  runId: z.string(), scenarioId: z.string(), baseId: z.string(),
  variant: z.enum(['base', 'perturbed', 'escalation']), repeat: z.number(), title: z.string(), tags: z.array(z.string()),
  agent: z.string(), expectedDecision: DecisionClass, ms: z.number(), agentError: z.string().nullable(),
  agentUsage: TokenUsage.nullable(), checks: z.array(CheckResult), items: z.array(ItemResult), judge: JudgeRecord.nullable(),
  scores: ScenarioScores, topIssue: z.string().nullable(), fixArea: FixArea.nullable(), artifactsDir: z.string(),
});
export type ScenarioResult = z.infer<typeof ScenarioResult>;

export const RunConfig = z.object({
  runId: z.string(), createdAt: z.string(), suite: z.union([SuiteName, z.literal('custom')]),
  scenarioIds: z.array(z.string()), agent: z.string(), track: TrackId, dataDir: z.string(),
  gitSha: z.string().nullable(), gitDirty: z.boolean().nullable(),
  models: z.object({ decide: z.string().nullable(), fast: z.string().nullable(), judge: z.string().nullable() }),
  judge: z.object({ enabled: z.boolean(), samples: z.number(), effort: z.string() }),
  rubricVersion: z.string(), concurrency: z.number(), repeat: z.number(), timeoutMs: z.number(),
});
export type RunConfig = z.infer<typeof RunConfig>;

export const TagSummary = z.object({
  tag: FailureTag, count: z.number(), weight: z.number(), scenarios: z.array(z.string()),
});
export type TagSummary = z.infer<typeof TagSummary>;

export const RunSummary = z.object({
  runId: z.string(), config: RunConfig,
  counts: z.object({
    scenarios: z.number(), results: z.number(), completed: z.number(), critical: z.number(),
    ungradedItems: z.number(), leaks: z.number(),
  }),
  scores: z.object({
    outcome: z.number(), coverage: z.number(), judgement: z.number(), engineering: z.number(),
    usability: z.number().nullable(), technical: z.number(), technicalPoints: z.number(),
  }),
  decisionMatrix: z.record(DecisionClass, z.record(z.string(), z.number())), tags: z.array(TagSummary),
  latency: z.object({ p50Ms: z.number(), p95Ms: z.number(), meanMs: z.number() }),
  tokens: z.object({ agent: TokenUsage, judge: TokenUsage }), costUsd: z.object({ judge: z.number().nullable() }),
  flaky: z.array(z.string()),
});
export type RunSummary = z.infer<typeof RunSummary>;

const changedScenario = z.object({
  scenarioId: z.string(), before: z.number(), after: z.number(), reason: z.string(),
});
export const Comparison = z.object({
  previousRunId: z.string(),
  deltas: z.object({
    outcome: z.number(), coverage: z.number(), judgement: z.number(), engineering: z.number(),
    usability: z.number().nullable(), technical: z.number(),
  }),
  regressions: z.array(changedScenario), improvements: z.array(changedScenario),
  newCritical: z.array(z.string()), fixedCritical: z.array(z.string()),
});
export type Comparison = z.infer<typeof Comparison>;
