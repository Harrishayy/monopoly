import { z } from 'zod';
import { KeyValue } from './common';
import { RawEvent } from './raw';

export const HiddenContinuation = z.object({
  scenarioId: z.string(), events: z.array(RawEvent),
  attachments: z.array(z.object({ fileName: z.string(), text: z.string().nullable() })),
  removedSections: z.array(z.object({ heading: z.string(), body: z.string() })),
  removedDetails: z.array(KeyValue), renumbering: z.record(z.string(), z.string().nullable()),
});
export type HiddenContinuation = z.infer<typeof HiddenContinuation>;

export const LeakFinding = z.object({
  kind: z.enum(['event_text', 'attachment', 'section', 'detail', 'event_count', 'hidden_fact']), detail: z.string(),
});
export type LeakFinding = z.infer<typeof LeakFinding>;

export const LeakAudit = z.object({ ok: z.boolean(), findings: z.array(LeakFinding) });
export type LeakAudit = z.infer<typeof LeakAudit>;
