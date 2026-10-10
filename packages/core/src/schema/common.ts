import { z } from 'zod';

export const TrackId = z.enum(['claims', 'property', 'banking', 'logistics']);
export type TrackId = z.infer<typeof TrackId>;

/** How much the agent may do without asking. */
export const Autonomy = z.enum(['suggest', 'ask_first', 'autonomous']);
export type Autonomy = z.infer<typeof Autonomy>;

/** Money is always integer minor units (pence). Format with lib/format.money in the web app. */
export const Money = z.object({
  amount: z.number().int(),
  currency: z.literal('GBP'),
});
export type Money = z.infer<typeof Money>;

export const Usage = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative().default(0),
  cacheWriteTokens: z.number().int().nonnegative().default(0),
});
export type Usage = z.infer<typeof Usage>;
