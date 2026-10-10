import { daysBetween, findDates } from '../ingest/dates';
import type { Amount, CaseFile, DateMention, Ledger, PartyStats } from '../types';

/** Words that make a message a request for something. */
const ASK = /\?|\b(please|could you|can you|would you|kindly|confirm|let (us|me) know|advise|approve|approval|send (us|me|over)|provide|arrange|respond|reply|update us|awaiting your)\b/i;
const FAILURE = [
  /\b(delivery )?fail(ed|ure|s)?\b/i,
  /\bbounced?\b/i,
  /\bundeliver(able|ed)\b/i,
  /\b(could not|couldn't|cannot|can't|unable to|was not able to)\s+(be\s+)?(deliver|reach|contact|process|upload|complete|access|find|locate|attend|send|verify|connect)\w*/i,
  /\bno results?\b/i,
  /\bparse (failed|error)\b/i,
  /\berror\b/i,
  /\bnot uploaded\b/i,
  /\b(rejected|declined|refused)\b/i,
  /\btimed? ?out\b/i,
  /\b(no answer|no response|went to voicemail|voicemail|unreachable|not answering)\b/i,
  /\bwrong (number|address|email|account)\b/i,
  /\breturned to sender\b/i,
  /\b(missed|no[- ]show|did not attend|didn't attend)\b/i,
];

const CURRENCY: [RegExp, string][] = [
  [/(£|GBP\s?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g, 'GBP'],
  [/(\$|USD\s?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g, 'USD'],
  [/(€|EUR\s?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g, 'EUR'],
];

export function findAmounts(text: string, sourceId: string): Amount[] {
  const out: Amount[] = [];
  for (const [re, currency] of CURRENCY) {
    for (const m of text.matchAll(re)) {
      const whole = Number(m[2]!.replace(/,/g, ''));
      const frac = m[3] ? Number(m[3].padEnd(2, '0')) : 0;
      const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 30);
      const vat = /^\s*(\+|plus|ex\.?|excl\w*|exc\.?|net of)\s*vat/i.test(after) ? 'ex' : /^\s*(inc\w*\.?|including)\s*vat/i.test(after) ? 'inc' : undefined;
      out.push({ text: m[0].trim(), pence: whole * 100 + frac, currency, vat, sourceId });
    }
  }
  return out;
}

const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
/** "Max, Fieldstone Cover" and "max (fieldstone cover)" are the same party. */
const partyKey = (s: string) => norm(s).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
const isUnknown = (s: string | undefined) => !s || /^(not specified|unknown|n\/a|none|-)$/i.test(s.trim());

export function buildLedger(c: CaseFile): Ledger {
  const asOf = c.asOf;
  const dated = c.events.filter((e) => e.at);
  const firstAt = dated[0]?.at;

  /* Parties ------------------------------------------------------------ */
  const parties = new Map<string, PartyStats>();
  const party = (raw: string) => {
    const key = partyKey(raw);
    let p = parties.get(key);
    if (!p) {
      p = { name: raw.trim(), sent: 0, received: 0, unansweredAsks: 0, unansweredAskIds: [] };
      parties.set(key, p);
    }
    return p;
  };
  for (const e of c.events) {
    if (!isUnknown(e.from)) {
      const p = party(e.from!);
      p.sent++;
      p.lastSentId = e.id;
      p.lastSentAt = e.at ?? p.lastSentAt;
      // A message from this party answers whatever was asked of them before.
      p.unansweredAsks = 0;
      p.unansweredAskIds = [];
    }
    if (!isUnknown(e.to)) {
      for (const to of e.to!.split(/\s*(?:;|,(?=\s*[A-Z][a-z]+\s+[A-Z])|\band\b)\s*/).filter(Boolean)) {
        const p = party(to);
        p.received++;
        p.lastReceivedId = e.id;
        p.lastReceivedAt = e.at ?? p.lastReceivedAt;
        if (ASK.test(e.body)) {
          p.unansweredAsks++;
          p.unansweredAskIds.push(e.id);
        }
      }
    }
  }
  for (const p of parties.values()) {
    if (p.lastSentAt) p.daysSinceLastSent = daysBetween(p.lastSentAt, asOf);
    if (p.lastReceivedAt) p.daysSinceLastReceived = daysBetween(p.lastReceivedAt, asOf);
  }

  /* Amounts, dates, failures -------------------------------------------- */
  const amounts: Amount[] = [];
  const dates: DateMention[] = [];
  const failures: Ledger['failures'] = [];
  const texts: { id: string; text: string; at?: string; by?: string }[] = [
    ...c.sections.map((s) => ({ id: s.id, text: s.body })),
    ...c.events.map((e) => ({ id: e.id, text: e.body, at: e.at, by: e.from })),
    ...c.attachments.filter((a) => a.text).map((a) => ({ id: a.id, text: a.text! })),
  ];
  for (const t of texts) {
    amounts.push(...findAmounts(t.text, t.id));
    if (t.id.startsWith('E')) {
      for (const d of findDates(t.text, t.at)) {
        // Dates the event was written on are not commitments.
        if (t.at && d.iso.slice(0, 10) === t.at.slice(0, 10) && !/today|end of/i.test(d.text)) continue;
        dates.push({ text: d.text, iso: d.iso, sourceId: t.id, by: isUnknown(t.by) ? undefined : t.by, passed: Date.parse(d.iso) < Date.parse(asOf.slice(0, 10)) });
      }
      for (const re of FAILURE) {
        const m = t.text.match(re);
        if (m) {
          failures.push({ sourceId: t.id, marker: m[0] });
          break;
        }
      }
    }
  }

  /* Repeats (system loops, duplicate notes) ------------------------------- */
  const byBody = new Map<string, string[]>();
  for (const e of c.events) {
    const k = norm(e.body).slice(0, 300);
    if (k.length < 8) continue;
    byBody.set(k, [...(byBody.get(k) ?? []), e.id]);
  }
  const repeats = [...byBody.entries()].filter(([, ids]) => ids.length > 1).map(([text, sourceIds]) => ({ text: text.slice(0, 120), sourceIds }));

  const lastAt = dated.at(-1)?.at;
  return {
    asOf,
    firstAt,
    eventCount: c.events.length,
    spanDays: firstAt && lastAt ? daysBetween(firstAt, lastAt) : undefined,
    daysSinceLastEvent: lastAt ? daysBetween(lastAt, asOf) : undefined,
    parties: [...parties.values()].sort((a, b) => b.sent + b.received - (a.sent + a.received)),
    amounts,
    dates,
    failures,
    repeats,
    channels: [...new Set(c.events.map((e) => e.channel).filter((x): x is string => !!x))],
  };
}

/** Plain-text table of the ledger for the model and REASONING.md. */
export function renderLedger(l: Ledger): string {
  const lines: string[] = [];
  lines.push(`As of: ${l.asOf}${l.firstAt ? ` · first event ${l.firstAt}` : ''} · ${l.eventCount} events${l.spanDays !== undefined ? ` over ${l.spanDays} days` : ''}`);
  if (l.channels.length) lines.push(`Channels seen: ${l.channels.join(', ')}`);
  if (l.parties.length) {
    lines.push('', 'Parties (sent / received · last message from them · unanswered requests to them since):');
    for (const p of l.parties) {
      const last = p.lastSentId ? `last from them ${p.lastSentId}${p.daysSinceLastSent !== undefined ? ` (${p.daysSinceLastSent}d before as-of)` : ''}` : 'never wrote';
      const asks = p.unansweredAsks ? ` · ${p.unansweredAsks} unanswered request(s): ${p.unansweredAskIds.join(', ')}` : '';
      lines.push(`- ${p.name}: ${p.sent} / ${p.received} · ${last}${asks}`);
    }
  }
  if (l.amounts.length) {
    lines.push('', 'Amounts:');
    for (const a of l.amounts) lines.push(`- ${a.text}${a.vat ? ` (${a.vat === 'ex' ? 'excl.' : 'incl.'} VAT)` : ''} [${a.sourceId}]`);
  }
  if (l.dates.length) {
    lines.push('', 'Dates mentioned (resolved against when they were written):');
    for (const d of l.dates) lines.push(`- "${d.text}" → ${d.iso.slice(0, 10)} ${d.passed ? '(passed)' : '(NOT YET REACHED at as-of)'}${d.by ? ` · written by ${d.by}` : ''} [${d.sourceId}]`);
  }
  if (l.failures.length) {
    lines.push('', 'Possible failures (keyword match, check the text):');
    for (const f of l.failures) lines.push(`- "${f.marker}" [${f.sourceId}]`);
  }
  if (l.repeats.length) {
    lines.push('', 'Repeated identical messages:');
    for (const r of l.repeats) lines.push(`- ${r.sourceIds.join(', ')}: "${r.text}"`);
  }
  return lines.join('\n');
}
