import { z } from 'zod';

export const DecisionClass = z.enum(['act', 'ask', 'escalate', 'wait', 'close']);
export type DecisionClass = z.infer<typeof DecisionClass>;

export const RubricKind = z.enum(['required', 'positive', 'red_flag', 'prohibited', 'critical']);
export type RubricKind = z.infer<typeof RubricKind>;

export const FailureTag = z.enum([
  'approval', 'spend', 'scope', 'safety', 'responsibility', 'conflict', 'evidence', 'closure',
  'communication', 'privacy', 'chasing', 'hallucination', 'injection', 'robustness',
  'over_escalation', 'under_escalation', 'format',
]);
export type FailureTag = z.infer<typeof FailureTag>;

export const FixArea = z.enum(['prompt', 'policy', 'tool', 'loader', 'output', 'model']);
export type FixArea = z.infer<typeof FixArea>;

export const ActionKind = z.enum([
  'read', 'message', 'request_approval', 'assign_provider', 'schedule', 'commit_spend',
  'hold', 'close', 'escalate', 'record', 'other',
]);
export type ActionKind = z.infer<typeof ActionKind>;

export const PartyRole = z.enum(['customer', 'approver', 'provider', 'internal', 'third_party', 'unknown']);
export type PartyRole = z.infer<typeof PartyRole>;

export const ItemStatus = z.enum([
  'met', 'partial', 'missed', 'violated', 'not_violated', 'not_applicable', 'ungraded',
]);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const SuiteName = z.enum(['smoke', 'dev', 'holdout', 'robustness', 'escalation', 'all']);
export type SuiteName = z.infer<typeof SuiteName>;

export const EventNumber = z.string().regex(/^\d{3}$/);
export type EventNumber = z.infer<typeof EventNumber>;

export const KeyValue = z.object({ key: z.string(), value: z.string() });
export type KeyValue = z.infer<typeof KeyValue>;

export const TokenUsage = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative().default(0),
  cacheWriteTokens: z.number().int().nonnegative().default(0),
});
export type TokenUsage = z.infer<typeof TokenUsage>;
