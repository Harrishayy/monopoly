import { z } from 'zod';

/** The property pack's 14 actions. D answers with one of them as structured output, never free text. */
export const ACTIONS = [
  'landlord.request_approval',
  'landlord.send_quote',
  'landlord.update',
  'landlord.chase',
  'tenant.ask',
  'tenant.update',
  'tenant.chase',
  'contractor.assign',
  'contractor.instruct',
  'contractor.chase',
  'contractor.update',
  'case.wait',
  'case.close',
  'case.escalate',
] as const;
export type Action = (typeof ACTIONS)[number];

/** One proposed next step, from a Haiku vote, the supervisor, a retry or the fallback. */
export const Proposal = z.object({
  explanation: z.string().describe('Why this is the right step now, in one to three sentences, citing event ids.'),
  action: z.enum(ACTIONS),
  channel: z.enum(['email', 'sms', 'call', 'note']),
  message: z.string().describe('The exact message, call script or internal note.'),
  citations: z.array(z.string()).describe('Source ids exactly as given, e.g. "PM-007:event-012".'),
  remainingWork: z.array(z.string()),
  triggerId: z.string().nullable().describe('For case.escalate only: the reason a person must decide.'),
  missingFact: z.string().nullable().describe('For *.ask only: the fact needed and the step it unlocks.'),
  reviewNote: z.string().nullable().describe('Optional, non-blocking: something a person should glance at while the job keeps moving.'),
  recheckInDays: z.number().int().nullable().describe('For case.wait only: when to look again.'),
  amountPence: z.number().int().nullable().describe('When the step involves a price, in pence.'),
  alternatives: z.array(z.object({ action: z.enum(ACTIONS), whyNot: z.string() })).describe('Other defensible steps and why this one is better.'),
});
export type Proposal = z.infer<typeof Proposal>;

/** The supervisor's adjudication between the Haiku candidates. */
export const Supervision = z.object({
  review: z.array(z.object({ candidate: z.number().int(), right: z.string(), wrong: z.string() })),
  chosenCandidate: z.number().int().nullable().describe('Index of the chosen candidate, or null when proposing a different step.'),
  missedFact: z.string().nullable().describe('If no candidate was chosen: the fact they all missed.'),
  decision: Proposal,
});
export type Supervision = z.infer<typeof Supervision>;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Estimated from per-model prices; see model.ts. */
  costUsd: number;
}

export interface ModelCallRecord {
  role: 'vote' | 'retry' | 'supervisor';
  model: string;
  ok: boolean;
  ms: number;
  usage: Usage;
  error?: string;
}

/** How D reached its answer. Shown in REASONING.md and used to measure each route. */
export type Route = 'forced' | 'easy' | 'supervised' | 'majority' | 'retried' | 'fallback';

export interface Refusal {
  by: string;
  action: string;
  ruleId: string;
  why: string;
}

export interface TriggerView {
  id: string;
  label: string;
  sourceId: string;
  quote: string;
  queue: string;
  firstStep: string;
}

export interface DResult {
  caseRef: string;
  asOf: string;
  route: Route;
  final: Proposal;
  /** A second message sent at the same moment (safety advice to the tenant on a forced escalation). */
  companion?: { action: Action; message: string };
  votes: Proposal[];
  supervision?: Supervision;
  refusals: Refusal[];
  forced: TriggerView[];
  /** Warning triggers (e.g. text addressed to an AI): shown to the model and supervisor, never acted on. */
  warnings: TriggerView[];
  calls: ModelCallRecord[];
  usage: Usage;
  stage?: string;
  boundaries: string[];
  failures: string[];
  ms: number;
}
