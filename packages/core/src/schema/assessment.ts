import { z } from 'zod';

/** A statement about the case and the source ids that prove it. */
export const Evidence = z.object({ text: z.string(), sourceIds: z.array(z.string()) });
export type Evidence = z.infer<typeof Evidence>;

/**
 * The deterministic read of a case, built by the track pack before the model runs.
 * The model sees it, the guard enforces `barred`, and ANSWERS show it.
 */
export const Assessment = z.object({
  /** The moment the decision is for. */
  asOf: z.iso.datetime(),
  /** Where the case stands, in the pack's words, e.g. "Waiting for landlord approval". */
  stage: z.string(),
  /** Who the next move is waiting on, if anyone, and since when. */
  waitingOn: z.object({ party: z.string(), since: z.iso.datetime(), sourceIds: z.array(z.string()) }).optional(),
  facts: z.array(Evidence),
  /** Risks and conflicts. `mustEscalate` flags force a handover. */
  flags: z.array(Evidence.extend({ id: z.string(), mustEscalate: z.boolean().default(false) })),
  /** Playbook suggestions, best first. `action` is a tool name. */
  suggested: z.array(z.object({ action: z.string(), why: z.string() })),
  /** Tools that would break a rule right now. The guard refuses them. */
  barred: z.array(
    z.object({
      action: z.string(),
      ruleId: z.string(),
      why: z.string(),
      /** Citing any of these sources lifts the bar (e.g. a landlord message the rules may have misread). */
      unlessCites: z.array(z.string()).optional(),
    }),
  ),
  /** Things the answer must not claim or do. */
  boundaries: z.array(z.string()),
  /** Sources recognised as noise and why, so they are not acted on. */
  noise: z.array(z.object({ sourceId: z.string(), why: z.string() })),
});
export type Assessment = z.infer<typeof Assessment>;

/** The single next step a run recommends (and, under autonomy, takes). */
export const NextStep = z.object({
  /** Tool name, e.g. "landlord.send_quote". */
  action: z.string(),
  /** Who it goes to, in plain words. */
  recipient: z.string(),
  channel: z.string(),
  /** The message to send, the call script or the note. */
  message: z.string(),
  reason: z.string(),
  citations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  boundaries: z.array(z.string()),
  /** What is still open or unconfirmed after this step. */
  remainingWork: z.array(z.string()),
  /** Whether the model chose it or the deterministic playbook did (model unavailable or failed). */
  decidedBy: z.enum(['model', 'playbook']),
});
export type NextStep = z.infer<typeof NextStep>;
