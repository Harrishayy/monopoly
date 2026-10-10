import type { Assessment, Case } from '@casework/core';
import { toEvents, type Party, type PEvent, type Signal } from './events';

/**
 * Deterministic read of a property maintenance job, learned from the 50 example cases
 * (docs/plan/11-property-workflow.md). It finds the stage, who we are waiting on, the facts that
 * matter, risk flags, playbook suggestions and the actions that would break a rule right now.
 * The model decides; this file makes sure it decides on solid ground.
 */

const DAY = 86_400_000;
/** Chase cadence seen in the examples. */
export const CHASE_AFTER_DAYS = { landlord: 3, tenant: 3, contractor: 2, visit: 2, selfManaged: 7 } as const;

interface Milestones {
  intake?: PEvent;
  vacant?: PEvent;
  askedLandlord?: PEvent;
  approval?: PEvent;
  standing?: PEvent;
  selfManaged?: PEvent;
  tenantDiy?: PEvent;
  assigned?: PEvent;
  visit?: PEvent;
  quote?: PEvent;
  quoteSent?: PEvent;
  quoteApproved?: PEvent;
  instructed?: PEvent;
  done?: PEvent;
  tenantResolved?: PEvent;
  invoice?: PEvent;
  noCharge?: PEvent;
  landlordToldDone?: PEvent;
  closed?: PEvent;
  noResults?: PEvent;
  reminders?: PEvent;
  noResponse?: PEvent;
  parseFailed?: PEvent;
}

export function assess(c: Case, opts: { asOf?: string } = {}): Assessment {
  const all = toEvents(c);
  const asOf = opts.asOf ?? all.at(-1)?.at ?? new Date().toISOString();
  const events = all.filter((e) => Date.parse(e.at) <= Date.parse(asOf));
  const request = c.sources.find((s) => s.kind === 'ticket');
  const kind = jobKind(c.title, request?.body ?? '', events);
  const m = milestones(events);
  // Agency-raised void works that ask for an estimate: getting a quote costs nothing, so no approval is needed to ask.
  if (kind === 'void' && /estimate|quote/i.test(initialRequest(request?.body ?? '')) && !m.approval) m.standing ??= m.intake;
  const live = events.filter((e) => !e.noise);
  const ago = (e: PEvent | undefined) => (e ? (Date.parse(asOf) - Date.parse(e.at)) / DAY : Infinity);
  const ids = (...es: (PEvent | undefined)[]) => es.filter((e): e is PEvent => !!e).map((e) => e.id);

  const facts: Assessment['facts'] = [];
  const fact = (text: string, ...es: (PEvent | undefined)[]) => {
    if (es.some(Boolean)) facts.push({ text, sourceIds: ids(...es) });
  };
  if (request) facts.push({ text: `Request: ${initialRequest(request.body)}`, sourceIds: [request.id] });
  if (kind !== 'repair' && request) facts.push({ text: kind === 'void' ? 'Void or check-out works on an empty property' : 'Agency task for the tenant (not a repair)', sourceIds: [request.id] });
  fact('Property is vacant (not tenanted)', m.vacant);
  fact('Landlord was asked how to proceed', m.askedLandlord);
  fact('Landlord approved attendance or works', m.approval);
  fact('Landlord gave standing consent or the agency proceeded on prior agreement', m.standing);
  fact('Landlord is arranging the work themselves', m.selfManaged);
  fact('Landlord is happy for the tenant to do it themselves', m.tenantDiy);
  fact('Contractor assigned', m.assigned);
  fact('Visit date set', m.visit);
  fact(`Quote or estimate received${amountText(m.quote)}`, m.quote);
  fact('Quote sent to the landlord', m.quoteSent);
  fact('Landlord approved the quote', m.quoteApproved);
  fact('Contractor told to go ahead', m.instructed);
  fact('Work reported done', m.done);
  fact('Tenant reports the problem resolved', m.tenantResolved);
  fact(`Invoice mentioned${amountText(m.invoice)}`, m.invoice);
  fact('No charge, warranty, or the contractor bills the landlord directly', m.noCharge);
  fact('Landlord told the work is done', m.landlordToldDone);
  fact('Job closed in the system', m.closed);

  const stage = stageOf(m, kind, live);
  const waitingOn = waitingFor(m, live, events, stage);
  const flags = flagsOf(c, events, m);
  const pending = unanswered(live);
  const { suggested, barred } = playbook(m, stage, waitingOn, pending, flags, ago, live);

  const noise = events
    .filter((e) => e.noise)
    .map((e) => ({ sourceId: e.id, why: e.noise! }))
    .concat(staleAlerts(events, m));

  return {
    asOf: new Date(asOf).toISOString(),
    stage: stage.label,
    waitingOn,
    facts,
    flags,
    suggested,
    barred,
    boundaries: boundariesFor(m),
    noise,
  };
}

// ---------------------------------------------------------------- milestones

function milestones(events: PEvent[]): Milestones {
  const m: Milestones = {};
  const has = (e: PEvent, s: Signal) => e.signals.has(s);
  for (const e of events) {
    if (e.noise) continue;
    m.intake ??= e;
    if (has(e, 'auto.not_tenanted')) m.vacant ??= e;
    if (e.from === 'agency' && e.to === 'landlord' && !m.approval && !m.selfManaged) m.askedLandlord ??= e;
    if (has(e, 'landlord.self_manage') && !m.assigned) m.selfManaged = e;
    if (has(e, 'landlord.tenant_diy')) m.tenantDiy = e;
    if (has(e, 'landlord.standing')) m.standing ??= e;
    if (has(e, 'approval.confirmed')) m.approval ??= e;
    if (has(e, 'provider.assigned')) m.assigned ??= e;
    if (e.from === 'agency' && e.to === 'contractor' && /attend|instruct|please (can you|could you|arrange|quote)|job for|provide an estimate|quote/i.test(e.body)) {
      m.assigned ??= e;
    }
    if (has(e, 'visit.set')) m.visit = e;
    const realQuote =
      has(e, 'quote') &&
      ((e.from === 'contractor' && (e.amounts.length > 0 || /attached|uploaded|quoted|quote (is|for|of)|estimate (is|for|of)|please find/i.test(e.body))) ||
        (e.from === 'agency' && e.to === 'none' && e.amounts.length > 0) ||
        (e.from === 'none' && e.amounts.length > 0));
    if (realQuote) {
      if (!m.quote || (m.quoteApproved && e.n > m.quoteApproved.n && e.amounts.length)) {
        m.quote = e;
        if (m.quoteApproved && e.n > m.quoteApproved.n) {
          // A new or revised quote after approval needs approving again.
          m.quoteSent = undefined;
          m.quoteApproved = undefined;
          m.instructed = undefined;
        }
      }
    }
    if (m.quote && e.n > m.quote.n && e.from === 'agency' && e.to === 'landlord' && /quote|estimate|£|cost|price/i.test(e.body)) m.quoteSent ??= e;
    if (has(e, 'quote.approved')) m.quoteApproved ??= e;
    if (m.quoteSent && e.n > m.quoteSent.n && e.from === 'landlord' && has(e, 'landlord.yes')) m.quoteApproved ??= e;
    if (m.quoteApproved && e.n > m.quoteApproved.n && e.from === 'agency' && e.to === 'contractor') m.instructed ??= e;
    if (has(e, 'work.done') || has(e, 'auto.work_results') || has(e, 'result.moved') || has(e, 'final.checks')) m.done ??= e;
    if (has(e, 'tenant.resolved')) m.tenantResolved ??= e;
    if (has(e, 'invoice') && (e.from === 'contractor' || e.from === 'none' || e.from === 'agency') && !(e.from === 'agency' && e.to === 'contractor')) {
      if (e.from !== 'agency' || /received|attached|uploaded|sent/i.test(e.body)) m.invoice ??= e;
    }
    if (has(e, 'no.charge')) m.noCharge ??= e;
    if ((m.done || m.tenantResolved) && e.from === 'agency' && e.to === 'landlord' && e.n > (m.done ?? m.tenantResolved)!.n) m.landlordToldDone ??= e;
    if (has(e, 'closed')) m.closed = e;
    if (has(e, 'auto.no_results')) m.noResults = e;
    if (has(e, 'auto.reminders')) m.reminders = e;
    if (has(e, 'auto.no_response')) m.noResponse = e;
    if (has(e, 'auto.parse_failed')) m.parseFailed = e;

    // A landlord yes before any quote is approval to attend (or to proceed as described).
    if (e.from === 'landlord' && has(e, 'landlord.yes') && !m.quoteSent && !has(e, 'landlord.self_manage')) m.approval ??= e;
  }
  // A job closed and then reopened by a new message is open again.
  if (m.closed && events.some((e) => !e.noise && e.n > m.closed!.n && e.from !== 'system' && e.from !== 'none')) {
    m.closed = undefined;
  }
  return m;
}

// ---------------------------------------------------------------- stage

type StageId =
  | 'task_new'
  | 'task_waiting'
  | 'task_answered'
  | 'closed'
  | 'close_out'
  | 'work_done'
  | 'quote_approved'
  | 'quote_with_landlord'
  | 'quote_received'
  | 'visit_booked'
  | 'contractor_assigned'
  | 'landlord_self_managing'
  | 'tenant_diy'
  | 'approved'
  | 'awaiting_landlord'
  | 'new';

interface Stage {
  id: StageId;
  label: string;
}

export type JobKind = 'repair' | 'void' | 'tenant_task';

/** Tenant repairs are the norm; agency-raised void works and tenant tasks run differently. */
export function jobKind(title: string, caseFile: string, events: PEvent[]): JobKind {
  const req = `${title}\n${initialRequest(caseFile)}`;
  const role = caseFile.match(/source role:\s*(.+)/i)?.[1] ?? '';
  const agencyRaised = !/tenant/i.test(role);
  if (events.some((e) => e.signals.has('auto.not_tenanted')) || /vacat|check[- ]?out|end of tenancy|\bvoid\b/i.test(req)) return 'void';
  if (agencyRaised && /\b(photo|reading|meter|inspection|tenant (to|must|should|needs)|obligation|follow[- ]up)\b/i.test(req)) return 'tenant_task';
  return 'repair';
}

function stageOf(m: Milestones, kind: JobKind = 'repair', live: PEvent[] = []): Stage {
  const done = m.done ?? m.tenantResolved;
  if (m.closed) return { id: 'closed', label: 'Closed in the system' };
  if (kind === 'tenant_task' && !m.assigned) {
    const out = [...live].reverse().find((e) => e.from === 'agency' && e.to === 'tenant');
    const reply = out && live.find((e) => e.n > out.n && e.from === 'tenant' && !e.signals.has('ack'));
    if (!out) return { id: 'task_new', label: 'Agency task for the tenant; tenant not yet asked' };
    if (reply) return { id: 'task_answered', label: 'Tenant has responded to the agency task' };
    return { id: 'task_waiting', label: 'Waiting for the tenant to complete the agency task' };
  }
  if (done && (m.landlordToldDone || m.selfManaged || m.noCharge)) return { id: 'close_out', label: 'Work done and landlord informed; ready for final checks and close' };
  if (done) return { id: 'work_done', label: 'Work reported done; landlord not yet told' };
  if (m.quoteApproved && !m.instructed) return { id: 'quote_approved', label: 'Quote approved; contractor not yet told to go ahead' };
  if (m.quoteSent && !m.quoteApproved) return { id: 'quote_with_landlord', label: 'Quote with the landlord for approval' };
  if (m.quote && !m.quoteSent && !m.quoteApproved) return { id: 'quote_received', label: 'Quote received; not yet sent to the landlord' };
  if (m.visit) return { id: 'visit_booked', label: 'Visit booked; waiting for the contractor to attend and report' };
  if (m.assigned || m.instructed) return { id: 'contractor_assigned', label: 'Contractor assigned; waiting for a booking or report' };
  if (m.selfManaged) return { id: 'landlord_self_managing', label: 'Landlord is arranging the work themselves; agency monitors' };
  if (m.tenantDiy) return { id: 'tenant_diy', label: 'Landlord has left it to the tenant to fix' };
  if (m.approval || m.standing) return { id: 'approved', label: 'Landlord approved; contractor not yet assigned' };
  if (m.askedLandlord) return { id: 'awaiting_landlord', label: 'Waiting for the landlord to approve or decide' };
  return { id: 'new', label: 'New request; landlord not yet asked' };
}

function waitingFor(m: Milestones, live: PEvent[], all: PEvent[], current: Stage): Assessment['waitingOn'] {
  const lastOut = (party: Party) => [...live].reverse().find((e) => e.from === 'agency' && e.to === party);
  const lastIn = (party: Party) => [...live].reverse().find((e) => e.from === party);
  const hold = [...all].reverse().find((e) => e.signals.has('hold'));
  const holdParty: Party | undefined = hold
    ? /waiting for landlord/i.test(hold.body)
      ? 'landlord'
      : /waiting for provider/i.test(hold.body)
        ? 'contractor'
        : /tenant/i.test(hold.body)
          ? 'tenant'
          : undefined
    : undefined;
  const stage = current.id;
  if (stage === 'closed') return undefined;
  const party: Party | undefined =
    stage === 'task_waiting'
      ? 'tenant'
      : stage === 'awaiting_landlord' || stage === 'quote_with_landlord' || stage === 'landlord_self_managing'
      ? 'landlord'
      : stage === 'contractor_assigned' || stage === 'visit_booked' || (stage === 'work_done' && !m.invoice && !m.noCharge)
        ? 'contractor'
        : stage === 'tenant_diy'
          ? 'tenant'
          : holdParty;
  if (!party) return undefined;
  const out = lastOut(party);
  const inn = lastIn(party);
  // Waiting since our last message to them, unless they replied after it.
  const since = out && (!inn || inn.n < out.n) ? out : (inn ?? out);
  const anchor = since ?? m.assigned ?? m.askedLandlord;
  if (!anchor) return undefined;
  return { party, since: new Date(anchor.at).toISOString(), sourceIds: [anchor.id] };
}

/** The latest message from a person that the agency has not answered yet (ignoring acknowledgements). */
function unanswered(live: PEvent[]): PEvent | undefined {
  for (let i = live.length - 1; i >= 0; i--) {
    const e = live[i]!;
    if (e.from === 'agency') return undefined;
    if ((e.from === 'tenant' || e.from === 'landlord' || e.from === 'contractor') && !e.signals.has('ack')) return e;
  }
  return undefined;
}

// ---------------------------------------------------------------- flags

const FLAG_RULES: { id: string; re: RegExp; text: string; mustEscalate?: boolean; from?: Party[] }[] = [
  { id: 'safety.critical', re: /\b(gas (leak|smell)|smell(s|ing)? of gas|carbon monoxide|co alarm|sparking|electric shock|exposed wir\w*|burning smell|water (pouring|gushing)|ceiling (has )?collapsed|flooding)\b/i, text: 'Possible safety emergency', mustEscalate: true },
  { id: 'safety.risk', re: /\b(shatter\w*|structural|unsafe|dangerous|hazard|trip hazard|no (heating|hot water)|insecure|can'?t lock|won'?t lock|not locking)\b/i, text: 'Safety or security risk mentioned' },
  { id: 'vulnerable', re: /\b(elderly|pregnan\w*|disabilit\w*|disabled|wheelchair|newborn|vulnerable|medical condition|hospital)\b/i, text: 'Possible vulnerable occupant' },
  { id: 'legal', re: /\b(solicitor|ombudsman|legal action|court|tribunal|environmental health|section 11)\b/i, text: 'Legal or regulatory threat', mustEscalate: true },
  { id: 'complaint', re: /\b(complain\w*|disappointed|unacceptable|ridiculous|furious|not happy|appalling|compensation)\b/i, text: 'Complaint or dissatisfaction', from: ['tenant', 'landlord'] },
  { id: 'liability', re: /\b(deposit|deduct\w*|recharge\w*|tenant liab\w*|liable|tenant damage|caused by the tenant|misuse)\b/i, text: 'Deposit, recharge or liability question', from: ['tenant', 'landlord', 'contractor'] },
  { id: 'warranty', re: /\b(warrant(y|ee)|guarantee)\b/i, text: 'Warranty or guarantee question' },
  { id: 'alteration', re: /\b(not approved|without (permission|consent)|unauthori[sz]ed|unapproved)\b/i, text: 'Possible unapproved alteration or action', from: ['landlord', 'tenant'] },
  { id: 'access', re: /\b(no access|refused access|won'?t let|not answering|can'?t (get hold|reach|contact)|unable to (contact|reach))\b/i, text: 'Access or contact problem' },
];

function flagsOf(c: Case, events: PEvent[], m: Milestones): Assessment['flags'] {
  const flags: Assessment['flags'] = [];
  const add = (id: string, text: string, sourceIds: string[], mustEscalate = false) => {
    const f = flags.find((x) => x.id === id);
    if (f) f.sourceIds = [...new Set([...f.sourceIds, ...sourceIds])].slice(0, 6);
    else flags.push({ id, text, sourceIds, mustEscalate });
  };
  const request = c.sources.find((s) => s.kind === 'ticket');
  for (const rule of FLAG_RULES) {
    if (request && !rule.from && rule.re.test(initialRequest(request.body))) add(rule.id, rule.text, [request.id], rule.mustEscalate);
    for (const e of events) {
      if (e.noise || e.from === 'system') continue;
      if (rule.from && !rule.from.includes(e.from)) continue;
      if (rule.re.test(e.body)) add(rule.id, rule.text, [e.id], rule.mustEscalate);
    }
  }
  // Money that does not line up.
  const q = m.quote?.amounts.at(-1);
  const inv = m.invoice?.amounts.at(-1);
  if (q && inv && inv > q * 1.25) add('cost.over_quote', `Invoice (£${(inv / 100).toFixed(2)}) is well above the quote (£${(q / 100).toFixed(2)})`, [m.quote!.id, m.invoice!.id]);
  const quotes = events.filter((e) => e.signals.has('quote') && e.amounts.length && e.from === 'contractor');
  if (quotes.length > 1) {
    const first = quotes[0]!.amounts.at(-1)!;
    const last = quotes.at(-1)!.amounts.at(-1)!;
    if (last > first * 1.1) add('cost.increase', 'A later quote is higher than the first; the landlord must approve the new amount', [quotes[0]!.id, quotes.at(-1)!.id]);
  }
  if (m.parseFailed && !events.some((e) => e.n > m.parseFailed!.n && e.from === 'contractor')) {
    add('unreadable', 'An inbound message could not be read; check the original before relying on it', [m.parseFailed.id]);
  }
  return flags;
}

/** Automated chasers that fire after the thing they chase has already happened. */
function staleAlerts(events: PEvent[], m: Milestones): Assessment['noise'] {
  const out: Assessment['noise'] = [];
  const done = m.done ?? m.tenantResolved;
  for (const e of events) {
    if (!done || e.n <= done.n) continue;
    if (e.signals.has('auto.reminders') || e.signals.has('auto.no_results')) {
      out.push({ sourceId: e.id, why: `Automated chaser after the work was already reported done (event ${done.n})` });
    }
  }
  for (const e of events) {
    if (e.signals.has('auto.message_received')) {
      const prev = events.filter((p) => p.n < e.n && p.from !== 'system').at(-1);
      if (prev?.signals.has('ack')) out.push({ sourceId: e.id, why: `Triggered by an acknowledgement only (event ${prev.n}); no reply needed` });
    }
  }
  return out;
}

// ---------------------------------------------------------------- playbook

type Suggest = Assessment['suggested'];
type Bar = Assessment['barred'];

function playbook(
  m: Milestones,
  stage: Stage,
  waitingOn: Assessment['waitingOn'],
  pending: PEvent | undefined,
  flags: Assessment['flags'],
  ago: (e: PEvent | undefined) => number,
  live: PEvent[],
): { suggested: Suggest; barred: Bar } {
  const s: Suggest = [];
  const add = (action: string, why: string) => {
    if (!s.some((x) => x.action === action)) s.push({ action, why });
  };
  const waited = waitingOn ? ago({ at: waitingOn.since } as PEvent) : 0;

  if (flags.some((f) => f.mustEscalate)) add('case.escalate', 'A flag requires a person (safety emergency or legal threat)');

  // Someone asked us something: answer them first.
  if (pending) {
    const who = pending.from as 'tenant' | 'landlord' | 'contractor';
    const isReport = ['quote', 'invoice', 'work.done', 'tenant.resolved'].some((s) => pending.signals.has(s as Signal));
    if (pending.signals.has('question') && !isReport) {
      add(`${who}.update`, `Event ${pending.n} from the ${who} has not been answered`);
    }
  }

  switch (stage.id) {
    case 'task_new':
      add('tenant.ask', 'Ask the tenant for what the task needs (photos, reading, access)');
      add('case.wait', 'If the task is not due yet, hold until it is');
      break;
    case 'task_waiting':
      if (waited >= CHASE_AFTER_DAYS.tenant) add('tenant.chase', `No reply from the tenant for ${Math.floor(waited)} days`);
      add('case.wait', 'Tenant asked recently; give them time');
      break;
    case 'task_answered':
      add('landlord.update', 'Pass what the tenant sent to the landlord');
      add('case.close', 'Task complete once the landlord has it');
      break;
    case 'new':
      add('landlord.request_approval', 'No landlord decision yet; the landlord approves before any contractor is sent');
      add('tenant.update', 'Acknowledge the tenant and say the landlord is being asked');
      add('tenant.ask', 'If the report is vague or a self-help step is likely to fix it, ask the tenant first');
      break;
    case 'awaiting_landlord':
      if (waited >= CHASE_AFTER_DAYS.landlord) add('landlord.chase', `No landlord decision for ${Math.floor(waited)} days`);
      add('case.wait', 'Landlord asked recently; give them time to reply');
      if (waited < CHASE_AFTER_DAYS.landlord) add('landlord.chase', 'Chase sooner only if the issue is urgent');
      break;
    case 'approved':
      add('contractor.assign', 'Landlord approved; assign a contractor and tell the tenant');
      add('tenant.update', 'Tell the tenant a contractor will be in touch');
      break;
    case 'landlord_self_managing':
      if (waited >= CHASE_AFTER_DAYS.selfManaged) add('landlord.chase', `Landlord is arranging it; no update for ${Math.floor(waited)} days`);
      add('case.wait', "Landlord is arranging their own contractor; monitor");
      add('tenant.update', 'Tell the tenant the landlord is arranging the work');
      break;
    case 'tenant_diy':
      add('tenant.update', 'Tell the tenant the landlord is happy for them to fix it and ask them to confirm when done');
      if (waited >= CHASE_AFTER_DAYS.tenant) add('tenant.chase', `No word from the tenant for ${Math.floor(waited)} days`);
      add('case.wait', 'Waiting for the tenant to confirm');
      break;
    case 'contractor_assigned':
      if (m.reminders || waited >= CHASE_AFTER_DAYS.contractor) add('contractor.chase', m.reminders ? `Automated reminders unanswered (event ${m.reminders.n})` : `No booking for ${Math.floor(waited)} days`);
      add('case.wait', 'Contractor assigned recently; wait for them to book with the tenant');
      add('contractor.update', 'Give the contractor tenant contact or access details if they need them');
      break;
    case 'visit_booked': {
      const visitPassed = m.noResults || ago(m.visit) >= CHASE_AFTER_DAYS.visit;
      if (visitPassed) add('contractor.chase', m.noResults ? `System reports no work results (event ${m.noResults.n})` : 'Visit date has passed with no report');
      add('case.wait', 'Visit booked; wait for the report');
      break;
    }
    case 'quote_received':
      add('landlord.send_quote', 'A quote is in; the landlord approves every quote, whatever the amount');
      break;
    case 'quote_with_landlord':
      if (waited >= CHASE_AFTER_DAYS.landlord) add('landlord.chase', `Quote with the landlord for ${Math.floor(waited)} days`);
      add('case.wait', 'Quote sent recently; wait for the landlord');
      break;
    case 'quote_approved':
      add('contractor.instruct', 'Landlord approved the quote; tell the contractor to go ahead');
      add('tenant.update', 'Tell the tenant the work is approved and the contractor will book in');
      break;
    case 'work_done':
      add('landlord.update', 'Tell the landlord the work is done (with the invoice if there is one)');
      if (!m.invoice && !m.noCharge && !m.selfManaged && (m.assigned || m.instructed)) add('contractor.chase', 'Ask the contractor for the invoice (PDF) and completion photos');
      add('tenant.ask', 'Confirm with the tenant that the problem is fixed');
      break;
    case 'close_out':
      add('case.close', 'Completion is evidenced and the landlord is informed');
      add('tenant.ask', 'Optionally confirm with the tenant before closing');
      break;
    case 'closed':
      add('case.wait', 'Job is closed; nothing to do unless something new arrives');
      break;
  }
  if (flags.some((f) => ['complaint', 'liability', 'alteration', 'warranty', 'cost.over_quote', 'cost.increase'].includes(f.id))) {
    add('case.escalate', 'A flagged risk may need a person to decide');
  }
  add('case.escalate', 'Always available when the facts conflict or a decision is not the agency’s to make');

  // ---------------- barred: the rules from the examples, enforced by the guard
  const b: Bar = [];
  const approved = !!(m.approval || m.standing);
  // Landlord messages (and agency notes about the landlord) can lift an approval bar if the model cites one.
  const landlordSays = live.filter((e) => e.from === 'landlord' || (e.from === 'agency' && e.to === 'none' && /\b(ll|landlord)\b/i.test(e.body))).map((e) => e.id);
  const sinceQuote = m.quote ? landlordSays.filter((id) => live.find((e) => e.id === id)!.n > m.quote!.n) : landlordSays;
  if (!approved && !m.assigned) {
    b.push({ action: 'contractor.assign', ruleId: 'property.landlord_approval', why: 'No landlord approval or standing consent found. Ask the landlord first.', unlessCites: landlordSays });
  } else if (m.selfManaged && !m.assigned) {
    b.push({ action: 'contractor.assign', ruleId: 'property.landlord_self_managing', why: 'The landlord is arranging their own contractor.' });
  }
  if (m.quote && !m.quoteApproved) {
    b.push({ action: 'contractor.instruct', ruleId: 'property.quote_approval', why: `The quote (event ${m.quote.n}) has not been approved by the landlord.`, unlessCites: sinceQuote });
  } else if (!approved && !m.quoteApproved) {
    b.push({ action: 'contractor.instruct', ruleId: 'property.landlord_approval', why: 'No landlord approval found for any work.', unlessCites: landlordSays });
  }
  if (!(m.done || m.tenantResolved) && !m.closed && stage.id !== 'task_answered') {
    b.push({ action: 'case.close', ruleId: 'property.completion_evidence', why: 'No completion report from the contractor, landlord or tenant.' });
  }
  const lastOut = (p: Party) => [...live].reverse().find((e) => e.from === 'agency' && e.to === p);
  const lastIn = (p: Party) => [...live].reverse().find((e) => e.from === p);
  for (const p of ['landlord', 'tenant', 'contractor'] as const) {
    const out = lastOut(p);
    const inn = lastIn(p);
    if (!out && !(p === 'contractor' && m.assigned)) {
      b.push({ action: `${p}.chase`, ruleId: 'property.nothing_to_chase', why: `Nothing has been sent to the ${p} yet, so there is nothing to chase.` });
    } else if (out && inn && inn.n > out.n && !inn.signals.has('ack') && p !== 'contractor') {
      b.push({ action: `${p}.chase`, ruleId: 'property.already_replied', why: `The ${p} replied (event ${inn.n}) after our last message.` });
    }
  }
  if (flags.some((f) => f.mustEscalate)) {
    for (const action of ['case.close', 'case.wait']) b.push({ action, ruleId: 'property.must_escalate', why: 'A flagged risk needs a person; do not close or sit on it.' });
  }
  return { suggested: s.filter((x) => !b.some((y) => y.action === x.action)), barred: b };
}

// ---------------------------------------------------------------- boundaries

function boundariesFor(m: Milestones): string[] {
  const b: string[] = [];
  if (m.approval && !m.quote) b.push('Landlord approval to attend is not approval of any quote or extra work.');
  if (m.quote && !m.quoteApproved) b.push('A quote is not approved until the landlord says so.');
  if (m.assigned && !m.done) b.push('A contractor being assigned or booked does not mean anyone has visited.');
  if (m.done && !m.tenantResolved) b.push('The contractor says the work is done; the tenant has not confirmed it.');
  if (m.invoice) b.push('An invoice received or forwarded is not an invoice paid.');
  if (m.selfManaged) b.push("The landlord's own contractor is the landlord's responsibility; do not claim the agency arranged it.");
  b.push('Do not invent a spending limit; every cost goes to the landlord unless they gave standing consent.');
  b.push("Do not share the tenant's contact details with a third party without the tenant's consent.");
  return b;
}

// ---------------------------------------------------------------- helpers

function initialRequest(caseFile: string): string {
  const m = caseFile.match(/## Initial request\s+([\s\S]*?)(\n## |$)/i);
  return (m?.[1] ?? caseFile).trim().slice(0, 400);
}

function amountText(e: PEvent | undefined) {
  const a = e?.amounts.at(-1);
  return a ? ` (£${(a / 100).toFixed(2)})` : '';
}
