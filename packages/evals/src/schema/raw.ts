import { z } from 'zod';
import { KeyValue } from './common';

export const RawEvent = z.object({
  number: z.string(), at: z.string(), fields: z.array(KeyValue), body: z.string(),
});
export type RawEvent = z.infer<typeof RawEvent>;

export const RawAttachment = z.object({
  fileName: z.string(), sourcePath: z.string(), text: z.string().nullable(),
});
export type RawAttachment = z.infer<typeof RawAttachment>;

export const RawIndex = z.object({
  h1: z.string(), title: z.string(), details: z.array(KeyValue),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
});
export type RawIndex = z.infer<typeof RawIndex>;

export const RawHistory = z.object({
  h1: z.string(), preamble: z.string(), events: z.array(RawEvent),
});
export type RawHistory = z.infer<typeof RawHistory>;

export const RawCase = z.object({
  trackFolder: z.string(), folder: z.string(), index: RawIndex,
  history: RawHistory, attachments: z.array(RawAttachment),
});
export type RawCase = z.infer<typeof RawCase>;
