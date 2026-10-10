import { basename } from 'node:path';
import type { Case, Source, SourceKind, TrackPack } from '@casework/core';
import { getPack } from '@casework/tracks';
import { cutCase, load } from '../a';
import type { RunInput } from '../agent';
import { loadCase } from '../b/ingest/casefile';
import { buildLedger } from '../b/facts/ledger';
import type { CaseFile } from '../b/types';

/**
 * Loads a case for agent D. Agent A's loader comes first, because the rules were built on its sources.
 * If that loader fails, or finds no events (renamed files, a JSON or CSV history, a missing history
 * file), D falls back to agent B's format-tolerant ingest and maps its events onto the same source ids,
 * so the assessment and prompt work unchanged.
 */
export async function loadForD(input: RunInput): Promise<{ c: Case; pack: TrackPack; note?: string; clocks: string[] }> {
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
        return { c: cutCase(r.c, statedCut), pack: r.pack, note: `the case states its decision moment, so events from ${statedCut} onwards were set aside as later follow-through`, clocks: clockLines(cf, r.c.ref, input.asOf) };
      }
      return { ...r, clocks: clockLines(cf, r.c.ref, input.asOf) };
    }
    note = 'the standard loader found no events';
  } catch (e) {
    note = `the standard loader failed (${e instanceof Error ? e.message : String(e)})`;
  }
  if (!cf) throw new Error(`Could not load ${input.dir}: ${note}; format-tolerant loader: ${bError}`);
  const c = fromCaseFile(cf, getPack(track));
  return { c, pack: getPack(track), note: `${note}; read with the format-tolerant loader instead`, clocks: clockLines(cf, c.ref, input.asOf) };
}

/**
 * Clocks computed in code from B's ledger: who last wrote to whom and how long ago, requests still
 * unanswered, and dates people promised with whether they have passed. Models are poor at date sums;
 * these lines give them the answer. Ids are mapped to D's source ids.
 */
export function clockLines(cf: CaseFile | undefined, ref: string, asOf?: string): string[] {
  if (!cf) return [];
  try {
    // Measure from the decision moment, which can be later than the last event kept.
    const l = buildLedger(asOf && !Number.isNaN(Date.parse(asOf)) ? { ...cf, asOf: new Date(asOf).toISOString() } : cf);
    const id = (x: string) => x.replace(/^E(\d+)$/, (_, n: string) => `${ref}:event-${n.padStart(3, '0')}`);
    const days = (d?: number) => (d === undefined ? '' : ` (${d.toFixed(1)} days ago)`);
    const out: string[] = [];
    for (const p of l.parties) {
      if (!p.sent && !p.received) continue;
      if (/lettings|agency|internal|system|homes\b|estates|property management/i.test(p.name)) continue;
      const parts = [`${p.name}:`];
      if (p.lastReceivedId) parts.push(`last wrote to us ${p.lastReceivedAt?.slice(0, 10) ?? ''}${days(p.daysSinceLastReceived)} [${id(p.lastReceivedId)}];`);
      if (p.lastSentId) parts.push(`we last wrote to them ${p.lastSentAt?.slice(0, 10) ?? ''}${days(p.daysSinceLastSent)} [${id(p.lastSentId)}];`);
      parts.push(p.unansweredAsks ? `${p.unansweredAsks} request(s) from us still unanswered [${p.unansweredAskIds.map(id).join(', ')}].` : 'nothing we asked is unanswered.');
      out.push(parts.join(' '));
    }
    for (const d of l.dates.slice(-8)) out.push(`Date mentioned${d.by ? ` by ${d.by}` : ''}: "${d.text}" = ${d.iso.slice(0, 10)}, ${d.passed ? 'already passed' : 'not yet reached'} [${id(d.sourceId)}].`);
    for (const f of l.failures.slice(-5)) out.push(`Failed contact or action: "${f.marker}" [${id(f.sourceId)}].`);
    if (l.daysSinceLastEvent !== undefined) out.push(`Days since the last event: ${l.daysSinceLastEvent.toFixed(1)}.`);
    return out;
  } catch {
    return [];
  }
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
