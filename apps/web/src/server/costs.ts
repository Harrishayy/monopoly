import 'server-only';
import type { Usage } from '@casework/core';
import type { CostBucket, CostReport } from '@/lib/api-types';
import { listLiveCaseRows, listOutbound } from './live/store';
import { allRunRecords } from './runs';

/**
 * Claude Haiku 5.5 list prices in US dollars per million tokens, for prompts of 100K tokens or
 * fewer. Source: https://claude.com/pricing, checked 2026-10-10. Cache reads are billed at a
 * tenth of input; cache writes (5-minute TTL) at 1.25x input.
 */
export const HAIKU_PRICE_USD_PER_MTOK = { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 } as const;

/** Conversion used for every £ figure on the page. An assumption, not a live rate. */
export const USD_TO_GBP = 0.79;

/** What a person would otherwise spend, in minutes, by how the run ended. Plain assumptions. */
export const MINUTES = {
  triage: 6,
  draft: 4,
  review: 1,
  coordinatorPencePerHour: 1_600,
} as const;

/** Model cost of one run in (fractional) pence. Input tokens exclude cache reads and writes. */
export function costPence(u: Usage): number {
  const p = HAIKU_PRICE_USD_PER_MTOK;
  const usd = (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.cacheWrite) / 1_000_000;
  return usd * USD_TO_GBP * 100;
}

const quantile = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  return s[lo]! + (s[Math.ceil(i)]! - s[lo]!) * (i - lo);
};

type Ending = 'handled' | 'held' | 'escalated' | 'needs_info' | 'failed';

/** Minutes of a person's time the run saved, by how it ended. */
const saved = (e: Ending) =>
  e === 'handled' ? MINUTES.triage + MINUTES.draft : e === 'held' ? MINUTES.triage + MINUTES.draft - MINUTES.review : e === 'escalated' || e === 'needs_info' ? MINUTES.triage - MINUTES.review : 0;

export function costReport(): CostReport {
  const live = new Map(listLiveCaseRows().map((c) => [c.ref, c]));
  const held = new Set(listOutbound({ status: 'awaiting_approval' }).map((o) => o.runId));
  const runs = allRunRecords().filter((r) => r.finished && r.view.usage);

  const rows = runs.map((r) => {
    const v = r.view;
    const pence = costPence(v.usage!);
    const c = live.get(r.meta.caseRef);
    const channel = !c ? 'example' : c.channel === 'note' ? 'portal' : c.channel;
    const kind = r.meta.groupId ? 'eval / batch' : r.meta.tag?.kind === 'live' || c ? 'live' : 'ad hoc';
    const ending: Ending =
      v.outcome === 'failed' || v.outcome === 'declined' || r.error
        ? 'failed'
        : v.outcome === 'escalated' || v.handover
          ? 'escalated'
          : v.outcome === 'needs_info'
            ? 'needs_info'
            : held.has(r.meta.runId)
              ? 'held'
              : 'handled';
    return { caseRef: r.meta.caseRef, pence, channel, kind, ending, usage: v.usage! };
  });

  const bucket = (key: (x: (typeof rows)[number]) => string): CostBucket[] => {
    const m = new Map<string, { runs: number; pence: number }>();
    for (const x of rows) {
      const b = m.get(key(x)) ?? { runs: 0, pence: 0 };
      b.runs += 1;
      b.pence += x.pence;
      m.set(key(x), b);
    }
    return [...m.entries()].map(([label, b]) => ({ label, ...b })).sort((a, b) => b.pence - a.pence);
  };

  const perCase = [...rows.reduce((m, x) => m.set(x.caseRef, (m.get(x.caseRef) ?? 0) + x.pence), new Map<string, number>()).values()];
  const totalPence = rows.reduce((s, x) => s + x.pence, 0);
  const endings = (['handled', 'held', 'escalated', 'needs_info', 'failed'] as const).map((e) => ({ ending: e, runs: rows.filter((x) => x.ending === e).length }));
  const minutesSaved = rows.reduce((s, x) => s + saved(x.ending), 0);
  const tokens = rows.reduce(
    (t, x) => ({
      input: t.input + x.usage.inputTokens,
      output: t.output + x.usage.outputTokens,
      cacheRead: t.cacheRead + x.usage.cacheReadTokens,
      cacheWrite: t.cacheWrite + x.usage.cacheWriteTokens,
    }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );

  return {
    model: process.env.MODEL_DECIDE ?? 'claude-haiku-5-5',
    runs: rows.length,
    cases: perCase.length,
    totalPence,
    perRunPence: rows.length ? totalPence / rows.length : 0,
    perCaseMedianPence: quantile(perCase, 0.5),
    perCaseP90Pence: quantile(perCase, 0.9),
    tokens,
    byChannel: bucket((x) => x.channel),
    byKind: bucket((x) => x.kind),
    endings,
    minutesSaved,
    personPenceSaved: Math.round((minutesSaved / 60) * MINUTES.coordinatorPencePerHour),
    assumptions: [
      `Model prices are Haiku 5.5 list prices: $${HAIKU_PRICE_USD_PER_MTOK.input} per million input tokens, $${HAIKU_PRICE_USD_PER_MTOK.output} output, $${HAIKU_PRICE_USD_PER_MTOK.cacheRead} cache read, $${HAIKU_PRICE_USD_PER_MTOK.cacheWrite} cache write (claude.com/pricing, checked 10 Oct 2026). Every call is assumed to be under 100K tokens, where the lower tier applies.`,
      `Dollars are converted at $1 = £${USD_TO_GBP}.`,
      `A coordinator spends about ${MINUTES.triage} minutes reading and triaging a message, and about ${MINUTES.draft} minutes drafting the next message.`,
      `Handled without a person saves ${saved('handled')} minutes. Held for approval saves ${saved('held')} minutes (the person still spends about ${MINUTES.review} minute reviewing the draft). Escalated or waiting on information saves ${saved('escalated')} minutes: the handover replaces the triage, but the person still makes the decision. Failed runs save nothing.`,
      `A coordinator's time is valued at £${(MINUTES.coordinatorPencePerHour / 100).toFixed(2)} an hour.`,
      'Only finished runs held by this server are counted: live runs since the store was created, plus any eval or batch runs from this session. Runs without a model (rules only) cost nothing and are counted at £0.',
    ],
  };
}
