import type { Case, Source } from '@casework/core';
import { author, isExternal } from './triggers';

/**
 * Disagreements found by rules: places where the latest word from a party names a different property from the
 * job's, or a landlord approves an amount that matches no price in the case. They are hints for the model and
 * gates for the guard: while one is open, the job does not move forward on it (see check.ts, d.conflict.open).
 * The model settles each one in its "disagreements" field: by citing a later message that settles it, or by
 * saying the message belongs to another job.
 */
export interface CodeConflict {
  id: string;
  fact: 'property' | 'amount';
  /** What the job record says, and what the party said. */
  record: string;
  said: string;
  sourceId: string;
  party: string;
  /** Who can settle it. */
  ask: 'tenant' | 'landlord' | 'contractor';
}

interface Address {
  flat?: string;
  street?: string;
  text: string;
}

const FLAT = /\b(?:flat|apartment|apt\.?|unit)\s*(\d+[a-z]?)\b/gi;
const STREET =
  /\b(\d+[a-z]?)\s+((?:[A-Z][a-z']+\s+){1,3}(?:Road|Street|Lane|Avenue|Close|Court|Way|Walk|Row|Grove|Terrace|Place|Drive|Gardens|Mews|Quay|View|Crescent|Square|Hill|Park|Rise|Green|Parade|Yard))\b/g;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** The addresses a text names: flat numbers and "22 Alder Lane" style streets, in order. */
export function addresses(text: string): Address[] {
  const flats = [...text.matchAll(FLAT)].map((m) => ({ at: m.index ?? 0, flat: m[1]!.toLowerCase(), text: m[0] }));
  const streets = [...text.matchAll(STREET)].map((m) => ({ at: m.index ?? 0, street: norm(`${m[1]} ${m[2]}`), text: m[0] }));
  const out: Address[] = [];
  for (const f of flats) {
    const s = streets.find((x) => x.at > f.at && x.at - f.at < 12);
    out.push({ flat: f.flat, street: s?.street, text: s ? `${f.text}, ${s.text}` : f.text });
  }
  for (const s of streets) if (!out.some((a) => a.street === s.street)) out.push({ street: s.street, text: s.text });
  return out;
}

/** True when two addresses cannot be the same place: a different flat number, or a different street. */
function differs(a: Address, home: Address): boolean {
  if (a.flat && home.flat && a.flat !== home.flat) return true;
  if (a.street && home.street && a.street !== home.street) return true;
  return false;
}

export function recordProperty(c: Case): Address | undefined {
  const record = c.sources.find((s) => s.kind === 'ticket' || s.id.endsWith(':case'));
  const line = record?.body.match(/property\**:?\**\s*:?\s*([^\n]+)/i)?.[1];
  const a = line ? addresses(line)[0] : undefined;
  return a?.flat || a?.street ? a : undefined;
}

type Party = CodeConflict['ask'];

function partyOf(s: Source): Party | undefined {
  const a = author(s);
  if (/tenant|occupant|resident/.test(a)) return 'tenant';
  if (/landlord|owner/.test(a)) return 'landlord';
  if (isExternal(s)) return 'contractor';
  return undefined;
}

const POUNDS = /£\s?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?/g;
const pence = (m: RegExpMatchArray) => Number(m[1]!.replace(/,/g, '')) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
const APPROVES = /\b(approve\w*|go ahead|proceed|agreed?|happy (for|to|with)|ok(ay)?\b)/i;
const PRICE = /\b(quote\w*|estimate|price|cost|total|invoice)\b/i;

/**
 * The disagreements still open at the decision moment. For each party, only their latest message that names a
 * property counts, so a contractor who resends the right document settles their own earlier mistake.
 */
export function findConflicts(c: Case, asOf: string, noise: Set<string> = new Set()): CodeConflict[] {
  const now = Date.parse(asOf);
  const live = c.sources.filter((s) => !noise.has(s.id) && Date.parse(s.receivedAt) <= now && s.kind !== 'ticket' && !s.id.endsWith(':case'));
  const out: CodeConflict[] = [];

  const record = recordProperty(c);
  if (record) {
    const latest = new Map<Party, { s: Source; as: Address[] }>();
    for (const s of live) {
      const p = partyOf(s);
      const as = p ? addresses(s.body) : [];
      if (p && as.length) latest.set(p, { s, as });
    }
    // When the tenant and the landlord now agree on another address, the record is what is out of date.
    const t = latest.get('tenant')?.as[0];
    const l = latest.get('landlord')?.as[0];
    const agreed = t && l && !differs(t, l) && !differs(l, t) && differs(t, record) ? { flat: t.flat ?? l.flat, street: t.street ?? l.street, text: l.text.length >= t.text.length ? l.text : t.text } : undefined;
    const home = agreed ?? record;
    for (const [p, { s, as }] of latest) {
      // A message that also names this job's property is talking about it ("the certificate is for Flat 14, not Flat 4").
      if (as.some((a) => !differs(a, home))) continue;
      const other = as.find((a) => differs(a, home))!;
      out.push({
        id: `property:${s.id}`,
        fact: 'property',
        record: home.text,
        said: other.text,
        sourceId: s.id,
        party: p,
        ask: p,
      });
    }
  }

  // A landlord "yes" that names an amount no contractor price in the case supports (allowing VAT either way).
  const prices = new Set<number>();
  for (const s of live) {
    if (partyOf(s) !== 'contractor' && !PRICE.test(s.body)) continue;
    for (const m of s.body.matchAll(POUNDS)) {
      const v = pence(m);
      for (const x of [v, Math.round(v * 1.2), Math.round(v / 1.2)]) prices.add(x);
    }
  }
  const lastLandlord = [...live].reverse().find((s) => partyOf(s) === 'landlord');
  if (lastLandlord && prices.size && APPROVES.test(lastLandlord.body)) {
    const named = [...lastLandlord.body.matchAll(POUNDS)].map(pence);
    const unknown = named.filter((v) => ![...prices].some((p) => Math.abs(p - v) <= 100));
    // A single figure above every price is a spending cap ("up to £500"), not a disagreement.
    const top = Math.max(...prices);
    const odd = unknown.filter((v) => v < top);
    if (odd.length) {
      out.push({
        id: `amount:${lastLandlord.id}`,
        fact: 'amount',
        record: 'the quoted price',
        said: `£${(odd[0]! / 100).toFixed(2)}`,
        sourceId: lastLandlord.id,
        party: 'landlord',
        ask: 'landlord',
      });
    }
  }
  return out;
}

export const describe = (k: CodeConflict) =>
  k.fact === 'property'
    ? `${k.sourceId}: the ${k.party}'s latest message names ${k.said}, but this job is for ${k.record}. Ask the ${k.ask} which property it is, unless a later message settles it or the message belongs to another job.`
    : `${k.sourceId}: the landlord approved ${k.said}, which matches no price in the case. Ask the landlord which figure they approve.`;
