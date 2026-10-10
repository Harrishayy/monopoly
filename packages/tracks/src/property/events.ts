import type { Case, Source } from '@casework/core';

/**
 * Turns a property case's sources into typed events: who sent it, to whom, and which workflow
 * signals it carries. Everything here is deterministic and cites the source it came from.
 */

export type Party = 'tenant' | 'landlord' | 'contractor' | 'agency' | 'system' | 'none';

export type Signal =
  // Automated lines from the agency's system
  | 'gate.landlord'
  | 'gate.provider'
  | 'auto.waiting_response'
  | 'auto.no_response'
  | 'auto.message_received'
  | 'auto.reminders'
  | 'auto.no_results'
  | 'auto.parse_failed'
  | 'auto.not_tenanted'
  | 'auto.work_results'
  | 'approval.confirmed'
  | 'quote.approved'
  | 'provider.assigned'
  | 'visit.set'
  | 'result.moved'
  | 'final.checks'
  | 'closed'
  // Read from what people wrote
  | 'ask.approval'
  | 'landlord.yes'
  | 'landlord.self_manage'
  | 'landlord.tenant_diy'
  | 'landlord.standing'
  | 'quote'
  | 'invoice'
  | 'work.done'
  | 'tenant.resolved'
  | 'no.charge'
  | 'question'
  | 'ack'
  | 'hold';

export interface PEvent {
  n: number;
  id: string;
  at: string;
  channel: string;
  from: Party;
  to: Party;
  body: string;
  signals: Set<Signal>;
  /** Amounts in pence mentioned in the body, in order. */
  amounts: number[];
  /** Why this event is noise, if it is. */
  noise?: string;
}

const SYSTEM_LINES: [RegExp, Signal][] = [
  [/landlord approval step first/i, 'gate.landlord'],
  [/approve selection of provider/i, 'gate.provider'],
  [/waiting for landlord\/tenant response/i, 'auto.waiting_response'],
  [/no landlord\/tenant response after/i, 'auto.no_response'],
  [/message received from landlord\/tenant|check if we need to provide a response/i, 'auto.message_received'],
  [/\d\+? reminders have been sent to provider/i, 'auto.reminders'],
  [/no work results/i, 'auto.no_results'],
  [/expected data could not be extracted/i, 'auto.parse_failed'],
  [/not tenanted/i, 'auto.not_tenanted'],
  [/work results isset/i, 'auto.work_results'],
  [/landlord approval confirmed|landlord has approved/i, 'approval.confirmed'],
  [/quote was approved/i, 'quote.approved'],
  [/maintenance provider assigned/i, 'provider.assigned'],
  [/visit date (selected|confirmed)|moved to visit date/i, 'visit.set'],
  [/moved to result/i, 'result.moved'],
  [/marked as completed, lets do the final checks/i, 'final.checks'],
  [/all checks have been completed|completed without payment|completed by supervisor|request is now closed/i, 'closed'],
];

const NOISE: [RegExp, string][] = [
  [/priority cannot be (de|in)creased|validation error/i, 'System validation error'],
  [/manually updated via|task manager was manually updated/i, 'Manual status edit'],
  [/^\W*(\[)?(no )?text\/transcription (is )?(missing|absent|unavailable)/i, 'No content recorded'],
  [/^\W*\[?no text\/transcription/i, 'No content recorded'],
];

const YES = /\b(yes|yeah|yep|go ahead|please proceed|proceed|approved?|agrees?|agreed to|that'?s fine|is fine|fine to|ok(ay)? to|happy (for|to|with)|please (get|arrange|mend|fix|send|replace|instruct|book|go)|sounds good|agreed?|thumbs up)\b|👍/i;
const SELF_MANAGE = /\b((his|her|their) (own )?(contractor|plumber|electrician|builder|handyman|gardener|operative)|own (contractor|plumber|electrician|builder|handyman|gardener|operative|guy)|my (plumber|contractor|builder|handyman|electrician|gardener|guy|operative|son|husband)|(i|we)('ll| will| shall) (sort|arrange|fix|get (it|this|someone)|deal|handle|organise|book)|(we|i) (are|am) (sorting|arranging|dealing)|will sort (it|this)|deal with it (myself|ourselves)|himself|herself|site meeting|awaiting quotes)\b/i;
const TENANT_DIY = /\b(tenant[s']{0,2} (can|could|may|to) (fix|do|sort|replace|repair)|diy)\b/i;
const STANDING = /\b(already agreed|ll already|if (it )?is something (easy|simple|cheap)|if (it'?s )?(easy|simple|cheap)|i will proceed|i have raised a job|go ahead with whatever)/i;
const ASK_APPROVAL = /\b(confirm (how|if|whether)|would you like (us|me)|happy for (us|me)|let (us|me) know (how|if|your)|do you approve|for your approval|can you approve|please approve|instruct a contractor|arrange your own|your own (contractor|preferred)|our contractor|how you'?d like us to (respond|proceed))/i;
const QUOTE = /\b(quote|quotation|estimate)\b/i;
const INVOICE = /\binvoice/i;
const DONE = /\b(job (is |has been )?(now )?(done|complete[d]?)|work (is |has been )?(now )?(done|complete[d]?)|has been (completed|fixed|repaired|replaced|sorted|done|resolved)|(all|now|it'?s) (done|fixed|sorted|working)|completed the (job|work|repair)|(i'?ve|i have|we have|we'?ve) (done|completed|fixed|replaced|repaired)|replaced (the|a)|repaired|fixed it|done repair|cleaned and greased|all completed|advising job done|job complete)/i;
/** A report that opens with "Done." or "Completed today", or names a part as replaced or fitted ("TRV replaced"). */
const DONE_SHORT = /^\s*(done|completed?|finished|all done)\b(?! (by|on|before)\b)|\b(valve|trv|cartridge|washer|part|cylinder|seal|tap|fan|unit|element|thermostat|pump|hinge|lock)s? (replaced|fitted|renewed)\b/i;
const NOT_DONE = /\b(will be|to be|once|when (it|the job)|if|needs? to be|not (yet )?(done|fixed|completed)|hasn'?t been|could not|couldn'?t|can'?t fix|unable|whether|inquir\w*|enquir\w*|asks? (if|whether|about)|discuss\w*|waiting for|awaiting|any update)\b/i;
/** "Fixed X, but please send someone for Y" is not the whole job resolved. */
const STILL_OPEN = /\b(send (somebody|someone|an? \w+)|still|but the|however|apart from|except)\b/i;
const TENANT_RESOLVED = /\b(working (fine|again|now)|now works|it works|(is|it'?s) (warm|fine|draining|working|fixed|ok|okay) now|cleared|sorted (it|now)|problem (is )?solved|no longer (an issue|needed)|fixed (it|now)|managed to)\b/i;
const NO_CHARGE = /\b(no charge|free of charge|without payment|no invoice (is )?required|pays? (the )?contractor directly|invoices? (the )?landlord directly|under (warranty|guarantee))\b/i;
const ACK_ONLY = /^(hi\b[^\n]*\n+)?\s*(thanks?( you)?( so much| very much)?|thank you|great|perfect|ok(ay)?|noted|cheers|lovely|brilliant|👍|😀)[\s.!,]*([\n\s]*(kind )?regards?[\s\S]{0,60})?$/i;

export function partyOf(raw: string | undefined, channel: string, body: string): Party {
  const s = (raw ?? '').toLowerCase().trim();
  if (!s || /not specified|unspecified|^internal$|^staff$/.test(s)) return 'none';
  if (s.includes('tenant')) return 'tenant';
  if (s.includes('landlord')) return 'landlord';
  if (/contractor|provider|maintenance/.test(s)) return 'contractor';
  // "Agency / system" and "<Agency> system" are the system only on automated Update lines.
  if (/agency|lettings|system/.test(s)) return /update/i.test(channel) || (/system/.test(s) && SYSTEM_LINES.some(([re]) => re.test(body))) ? 'system' : 'agency';
  // Company names in "To"/"From" are the agency's providers (e.g. "Cedar Homes", "Juniper Surveying").
  if (/homes|surveying|compliance|works|services|solutions|maintenance|utilities|plumbing|electrical/.test(s)) return 'contractor';
  return 'none';
}

/** "£172.51", "£1,370", "GBP 75.11" → pence. */
export function amountsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(?:£|GBP\s?)\s?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?/gi)) {
    const pounds = Number(m[1]!.replace(/,/g, ''));
    const pence = m[2] ? Number(m[2].padEnd(2, '0')) : 0;
    if (Number.isFinite(pounds)) out.push(pounds * 100 + pence);
  }
  return out;
}

export function eventNumber(sourceId: string): number | undefined {
  const m = sourceId.match(/:event-(\d+)$/);
  return m ? Number(m[1]) : undefined;
}

export function toEvents(c: Case): PEvent[] {
  const events: PEvent[] = [];
  for (const s of c.sources) {
    const n = eventNumber(s.id);
    if (n === undefined) continue;
    events.push(classify(s, n));
  }
  events.sort((a, b) => a.n - b.n);
  markDuplicates(events);
  return events;
}

function classify(s: Source, n: number): PEvent {
  const meta = s.meta as Record<string, string | undefined>;
  const channel = meta.channel ?? s.kind;
  const body = s.body ?? '';
  const from = partyOf(meta.from, channel, body);
  const to = partyOf(meta.to, channel, body);
  const signals = new Set<Signal>();
  const e: PEvent = { n, id: s.id, at: s.receivedAt, channel, from, to, body, signals, amounts: amountsIn(body) };

  for (const [re, why] of NOISE) if (re.test(body)) e.noise = why;
  if (!body.trim()) e.noise = 'Empty event';
  if (/call may be recorded/i.test(body) && body.length < 200) e.noise = 'Call-recording notice only';

  const isSystem = from === 'system' || /update/i.test(channel);
  for (const [re, sig] of SYSTEM_LINES) if (re.test(body) && (isSystem || sig === 'approval.confirmed' || sig === 'closed')) signals.add(sig);
  if (/hold/i.test(channel)) signals.add('hold');
  if (isSystem) return e;

  const text = body;
  const fromPerson = from === 'tenant' || from === 'landlord' || from === 'contractor';
  if (from === 'agency' && to === 'landlord' && ASK_APPROVAL.test(text)) signals.add('ask.approval');
  if (from === 'landlord') {
    if (SELF_MANAGE.test(text)) signals.add('landlord.self_manage');
    if (TENANT_DIY.test(text)) signals.add('landlord.tenant_diy');
    if (YES.test(text)) signals.add('landlord.yes');
  }
  if ((from === 'landlord' || from === 'agency') && STANDING.test(text)) signals.add('landlord.standing');
  if (from === 'agency' && /\b(ll|landlord)\b[^.\n]{0,40}\b(approved|agreed|has approved|confirmed)\b|landlord has approved|approved by (the )?landlord/i.test(text)) {
    signals.add('approval.confirmed');
  }
  if (QUOTE.test(text) && (from === 'contractor' || e.amounts.length || /attached|uploaded/i.test(text))) signals.add('quote');
  if (INVOICE.test(text)) signals.add('invoice');
  if (NO_CHARGE.test(text)) signals.add('no.charge');
  if ((fromPerson || from === 'agency') && (DONE.test(text) || DONE_SHORT.test(text)) && !NOT_DONE.test(text) && !STILL_OPEN.test(text)) {
    signals.add('work.done');
  }
  if (from === 'tenant' && TENANT_RESOLVED.test(text) && !STILL_OPEN.test(text)) signals.add('tenant.resolved');
  if (fromPerson && /\?/.test(text)) signals.add('question');
  if (fromPerson && text.length < 160 && ACK_ONLY.test(text.trim())) signals.add('ack');
  return e;
}

/** The same body from the same sender within 30 minutes is a duplicate send. */
function markDuplicates(events: PEvent[]) {
  for (let i = 1; i < events.length; i++) {
    const e = events[i]!;
    if (e.noise) continue;
    for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
      const p = events[j]!;
      const close = Math.abs(Date.parse(e.at) - Date.parse(p.at)) < 30 * 60_000;
      if (close && p.from === e.from && p.to === e.to && p.body.trim() === e.body.trim() && e.body.trim().length > 20) {
        e.noise = `Duplicate of event ${p.n}`;
        break;
      }
    }
  }
}
