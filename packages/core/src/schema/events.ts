import { z } from 'zod';
import { Autonomy, Usage } from './common';
import { Handover, Outcome } from './handover';

const base = {
  runId: z.string(),
  /** Monotonic per run. Used as the SSE event id for resuming. */
  seq: z.number().int().nonnegative(),
  at: z.iso.datetime(),
};

/**
 * Append-only run events. Every screen, the mascot and ANSWERS/ are views of this stream.
 * Adding a type means updating: run/view.ts, run/mascot.ts and answers/render.ts.
 */
export const RunEvent = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('run.started'), caseRef: z.string(), autonomy: Autonomy }),
  z.object({
    ...base,
    type: z.literal('step.read'),
    sourceIds: z.array(z.string()),
    summary: z.string(),
  }),
  z.object({
    ...base,
    type: z.literal('tool.called'),
    callId: z.string(),
    tool: z.string(),
    args: z.unknown(),
  }),
  z.object({
    ...base,
    type: z.literal('tool.succeeded'),
    callId: z.string(),
    result: z.unknown(),
    ms: z.number().nonnegative(),
  }),
  z.object({
    ...base,
    type: z.literal('tool.failed'),
    callId: z.string(),
    error: z.string(),
    attempt: z.number().int().positive(),
    willRetry: z.boolean(),
  }),
  z.object({
    ...base,
    type: z.literal('action.blocked'),
    action: z.string(),
    ruleId: z.string(),
    why: z.string(),
  }),
  z.object({
    ...base,
    type: z.literal('decision.made'),
    label: z.string(),
    rationale: z.string(),
    confidence: z.number().min(0).max(1),
    citations: z.array(z.string()),
  }),
  z.object({ ...base, type: z.literal('escalation.created'), handover: Handover }),
  z.object({
    ...base,
    type: z.literal('run.completed'),
    outcome: Outcome,
    summary: z.string(),
    usage: Usage,
  }),
]);
export type RunEvent = z.infer<typeof RunEvent>;
export type RunEventType = RunEvent['type'];
export type RunEventOf<T extends RunEventType> = Extract<RunEvent, { type: T }>;
