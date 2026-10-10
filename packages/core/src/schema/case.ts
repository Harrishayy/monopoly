import { z } from 'zod';
import { TrackId } from './common';

export const SourceKind = z.enum(['call', 'email', 'doc', 'crm', 'ticket', 'sms', 'note']);
export type SourceKind = z.infer<typeof SourceKind>;

export const CaseStatus = z.enum([
  'new',
  'running',
  'resolved',
  'escalated',
  'needs_info',
  'failed',
  'blocked',
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

/** One piece of evidence. `id` is stable and is what facts cite. */
export const Source = z.object({
  id: z.string(),
  kind: SourceKind,
  title: z.string(),
  receivedAt: z.iso.datetime(),
  /** Transcript, email text or extracted document text. */
  body: z.string(),
  meta: z.record(z.string(), z.unknown()).default({}),
});
export type Source = z.infer<typeof Source>;

export const Case = z.object({
  ref: z.string(),
  track: TrackId,
  title: z.string(),
  customer: z.object({ id: z.string().optional(), name: z.string() }),
  status: CaseStatus,
  slaDueAt: z.iso.datetime().optional(),
  sources: z.array(Source),
});
export type Case = z.infer<typeof Case>;

/** What list views need, without source bodies. */
export const CaseSummary = Case.omit({ sources: true }).extend({
  channel: SourceKind,
  updatedAt: z.iso.datetime(),
});
export type CaseSummary = z.infer<typeof CaseSummary>;
