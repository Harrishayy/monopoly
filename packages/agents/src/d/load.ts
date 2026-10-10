import { basename } from 'node:path';
import type { Case, Source, SourceKind, TrackPack } from '@casework/core';
import { getPack } from '@casework/tracks';
import { cutCase, load } from '../a';
import type { RunInput } from '../agent';
import { loadCase } from '../b/ingest/casefile';
import type { CaseFile } from '../b/types';

/**
 * Loads a case for agent D. Agent A's loader comes first, because the rules were built on its sources.
 * If that loader fails, or finds no events (renamed files, a JSON or CSV history, a missing history
 * file), D falls back to agent B's format-tolerant ingest and maps its events onto the same source ids,
 * so the assessment and prompt work unchanged.
 */
export async function loadForD(input: RunInput): Promise<{ c: Case; pack: TrackPack; note?: string }> {
  const track = input.track === 'insurance' ? 'claims' : input.track;
  // B's ingest finds the stated decision moment ("the escalation snapshot comprises events 001–002",
  // "Recorded action: event 3") even when nothing is withheld, as in the Reality Test. Later events in
  // the file are follow-through and must not be read as already known.
  let cf: CaseFile | undefined;
  let bError: string | undefined;
  try {
    cf = await loadCase(input.dir, { withhold: input.withhold, cutBefore: input.cutBefore, track: input.track });
  } catch (e) {
    bError = e instanceof Error ? e.message : String(e);
  }
  const statedCut = cf ? snapshotCut(cf) : undefined;

  let note: string;
  try {
    const r = await load(input);
    if (r.c.sources.some((s) => /:event-\d+$/.test(s.id))) {
      if (statedCut !== undefined && (input.cutBefore === undefined || statedCut < input.cutBefore)) {
        return { c: cutCase(r.c, statedCut), pack: r.pack, note: `the case states its decision moment, so events from ${statedCut} onwards were set aside as later follow-through` };
      }
      return { ...r };
    }
    note = 'the standard loader found no events';
  } catch (e) {
    note = `the standard loader failed (${e instanceof Error ? e.message : String(e)})`;
  }
  if (!cf) throw new Error(`Could not load ${input.dir}: ${note}; format-tolerant loader: ${bError}`);
  return { c: fromCaseFile(cf, getPack(track)), pack: getPack(track), note: `${note}; read with the format-tolerant loader instead` };
}

/** The first event to hide when the case itself states where its snapshot ends (not an evaluation cut). */
export function snapshotCut(cf: CaseFile): number | undefined {
  for (const w of cf.withheld) {
    const m = w.match(/^Events from (\d+) onwards .*because (the case states|the case records)/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

const PREFIX: Record<string, string> = { property: 'PM', claims: 'IC', banking: 'BK', logistics: 'DL' };

function kindOf(channel: string | undefined): SourceKind {
  const c = (channel ?? '').toLowerCase();
  if (c.includes('email')) return 'email';
  if (c.includes('sms') || c.includes('text') || c.includes('whatsapp')) return 'sms';
  if (c.includes('call') || c.includes('phone') || c.includes('voice')) return 'call';
  if (c.includes('note')) return 'note';
  return 'crm';
}

const iso = (s: string | undefined, fallback: string) => {
  const t = s ? Date.parse(s) : NaN;
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
};

export function fromCaseFile(cf: CaseFile, pack: TrackPack): Case {
  const track = pack.id;
  const ref = `${PREFIX[track] ?? track.toUpperCase()}-${cf.name || basename(cf.dir)}`;
  const asOf = iso(cf.asOf, new Date().toISOString());
  const first = iso(cf.events.find((e) => e.at)?.at, asOf);
  const record = [
    ...cf.fields.filter((f) => !f.section).map((f) => `- ${f.key}: ${f.value}`),
    ...cf.sections.map((s) => `## ${s.heading}\n\n${s.body}`),
  ].join('\n\n');
  const sources: Source[] = [{ id: `${ref}:case`, kind: 'ticket', title: cf.title, receivedAt: first, body: record || cf.title, meta: { file: 'record' } }];
  cf.events.forEach((e, i) => {
    const n = e.n ?? i + 1;
    sources.push({
      id: `${ref}:event-${String(n).padStart(3, '0')}`,
      kind: kindOf(e.channel),
      title: `Event ${String(n).padStart(3, '0')} · ${e.channel ?? 'Event'} · ${e.from ?? 'Unknown'}`,
      receivedAt: iso(e.at, asOf),
      body: e.body,
      meta: { channel: e.channel, from: e.from, to: e.to, ...(e.atRaw ? { atRaw: e.atRaw } : {}) },
    });
  });
  cf.attachments.forEach((a, i) => {
    if (!a.text) return;
    sources.push({ id: `${ref}:attachment-${i + 1}`, kind: 'doc', title: a.name, receivedAt: asOf, body: a.text, meta: { file: a.name } });
  });
  return { ref, track, title: cf.title, customer: { name: 'Tenant' }, status: 'running', sources };
}
