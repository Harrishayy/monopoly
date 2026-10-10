import { z } from 'zod';

export const Outcome = z.enum(['resolved', 'escalated', 'needs_info', 'failed', 'declined']);
export type Outcome = z.infer<typeof Outcome>;

export const HandoverOption = z.object({
  id: z.string(),
  label: z.string(),
  effect: z.enum(['reversible', 'irreversible', 'pauses']),
  recommended: z.boolean().default(false),
});
export type HandoverOption = z.infer<typeof HandoverOption>;

/** Everything a person needs to decide, in one object. */
export const Handover = z.object({
  /** One sentence, plain English. */
  reason: z.string(),
  facts: z.array(z.object({ text: z.string(), sourceId: z.string() })).min(1),
  tried: z.array(z.object({ text: z.string(), ok: z.boolean() })),
  options: z.array(HandoverOption).min(1),
  refused: z.array(z.object({ action: z.string(), ruleId: z.string() })),
  confidence: z.number().min(0).max(1),
  /** e.g. "Fraud · Priority" */
  queue: z.string(),
});
export type Handover = z.infer<typeof Handover>;

export const HumanDecision = z.object({
  caseRef: z.string(),
  runId: z.string(),
  optionId: z.string(),
  note: z.string().optional(),
  decidedBy: z.string(),
  at: z.iso.datetime(),
});
export type HumanDecision = z.infer<typeof HumanDecision>;
