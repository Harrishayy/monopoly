import 'server-only';
import type { Case, CaseSummary, LoadCasesOptions } from '@casework/core';
import { getPack } from '@casework/tracks';
import type { CaseTimeline, HistoryEventView } from '@/lib/api-types';
import { ACTIVE_TRACK, DATA_DIR, DATA_WITHHOLD } from './config';
import { labelsFor } from './labels';

type Withhold = NonNullable<LoadCasesOptions['withhold']>;

// Case folders are static during a session and PDF extraction is slow, so loads are memoised.
const g = globalThis as unknown as { __caseworkCases?: Map<string, Promise<Case[]>> };
const cache: Map<string, Promise<Case[]>> = (g.__caseworkCases ??= new Map());

export function loadCases(track: string, dir: string, withhold: Withhold): Promise<Case[]> {
  const key = `${track}|${dir}|${withhold}`;
  let p = cache.get(key);
  if (!p) {
    p = getPack(track).loadCases(dir, { withhold });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export async function listCases(track = ACTIVE_TRACK): Promise<Case[]> {
  return loadCases(track, DATA_DIR, DATA_WITHHOLD);
}

export async function getCase(ref: string, track = ACTIVE_TRACK): Promise<Case | undefined> {
  return (await listCases(track)).find((c) => c.ref === ref);
}

export function summarise(c: Case): CaseSummary {
  const { sources, ...rest } = c;
  const latest = [...sources].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  return { ...rest, channel: latest?.kind ?? 'note', updatedAt: latest?.receivedAt ?? new Date(0).toISOString() };
}

/** History event number from a source id like "PM-007:event-12". */
export const eventNumber = (sourceId: string) => {
  const m = sourceId.match(/:event-(\d+)$/);
  return m ? Number(m[1]) : undefined;
};

/** The full case, history included, even when the inbox hides how examples ended. */
async function fullCase(ref: string, track: string) {
  return (await loadCases(track, DATA_DIR, 'none')).find((c) => c.ref === ref);
}

/**
 * The case as it stood just before history event `cutBefore`: the case file with outcomes withheld,
 * every source received before the cut, and the moment to decide for.
 */
export async function getCaseAt(ref: string, cutBefore: number, track = ACTIVE_TRACK): Promise<{ c: Case; asOf: string } | undefined> {
  const [visible, full] = await Promise.all([getCase(ref, track), fullCase(ref, track)]);
  if (!visible || !full) return undefined;
  const caseFile = visible.sources.find((s) => s.id.endsWith(':case'));
  const sources = full.sources
    .filter((s) => {
      if (s.id.endsWith(':case')) return false;
      const n = eventNumber(s.id);
      return n === undefined || n < cutBefore;
    });
  const nextEvent = full.sources.find((s) => eventNumber(s.id) === cutBefore);
  const label = (await labelsFor(track)).find((l) => `${ref.split('-').at(-1)}` === l.case && l.cutBefore === cutBefore);
  // Decide for the moment just before what happened next, so waiting time counts.
  const asOf = label?.asOf ?? (nextEvent ? new Date(new Date(nextEvent.receivedAt).getTime() - 60_000).toISOString() : undefined);
  const lastKept = sources.filter((s) => eventNumber(s.id) !== undefined).at(-1)?.receivedAt;
  return {
    c: { ...visible, sources: [...(caseFile ? [caseFile] : []), ...sources] },
    asOf: asOf && lastKept && asOf < lastKept ? lastKept : (asOf ?? lastKept ?? new Date().toISOString()),
  };
}

const ENDING = /^##\s+(overview|outcome|next action at escalation|boundaries and remaining work)\s*$/i;

/** History events, eval labels and (for examples) how the case ended. */
export async function getTimeline(ref: string, track = ACTIVE_TRACK): Promise<CaseTimeline | undefined> {
  const full = await fullCase(ref, track);
  if (!full) return undefined;
  const events: HistoryEventView[] = full.sources.flatMap((s) => {
    const n = eventNumber(s.id);
    if (n === undefined) return [];
    const m = s.meta as Record<string, unknown>;
    const str = (k: string) => (typeof m[k] === 'string' ? (m[k] as string) : '');
    return [{ n, sourceId: s.id, at: s.receivedAt, channel: str('channel') || s.kind, from: str('from'), to: str('to'), stage: str('stage') || undefined, body: s.body }];
  });
  events.sort((a, b) => a.n - b.n);

  const caseFile = full.sources.find((s) => s.id.endsWith(':case'))?.body ?? '';
  const ending: string[] = [];
  let keep = false;
  for (const line of caseFile.split('\n')) {
    if (line.startsWith('## ')) keep = ENDING.test(line);
    if (keep) ending.push(line);
  }
  const num = ref.split('-').at(-1);
  return {
    ref,
    events,
    labels: (await labelsFor(track)).filter((l) => l.case === num),
    ending: DATA_WITHHOLD === 'outcomes' && ending.length ? ending.join('\n').trim() : undefined,
  };
}
