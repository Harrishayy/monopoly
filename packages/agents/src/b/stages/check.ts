import { findDates, parseDate } from '../ingest/dates';
import { findAmounts } from '../facts/ledger';
import type { CaseFile, Decision, HardIssue, Ledger, Situation } from '../types';

/** Ids the model may cite. */
export function citableIds(c: CaseFile): Set<string> {
  return new Set([...c.events.map((e) => e.id), ...c.sections.map((s) => s.id), ...c.attachments.map((a) => a.id)]);
}

const STOP = new Set(['the', 'and', 'for', 'from', 'with', 'team', 'desk', 'agency', 'system', 'not', 'specified', 'ltd', 'limited']);
const tokens = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

/** Loose match between a recipient and a party name ("the landlord" ~ "Landlord", "Max at Fieldstone" ~ "Max, Fieldstone Cover"). */
export function sameParty(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ta = new Set(tokens(a));
  return tokens(b).some((t) => ta.has(t));
}

/**
 * Rules that check the decision against exact facts. They never interpret free text, so they cannot block a correct
 * action because of a misreading; anything fuzzy is left to the critic.
 */
export function hardChecks(d: Decision, c: CaseFile, ledger: Ledger, situation?: Situation): HardIssue[] {
  const issues: HardIssue[] = [];
  const add = (rule: string, severity: HardIssue['severity'], detail: string) => issues.push({ rule, severity, detail });
  const outbound = ['send_message', 'request_information', 'chase', 'escalate_to_human'].includes(d.action);

  // Citations exist and are inside the snapshot.
  const ids = citableIds(c);
  const bad = d.citations.filter((x) => !ids.has(x));
  const good = d.citations.filter((x) => ids.has(x));
  if (bad.length) add('citations-exist', good.length ? 'minor' : 'major', `Unknown or out-of-snapshot citation(s): ${bad.join(', ')}.`);
  if (!d.citations.length && c.events.length) add('citations-exist', 'major', 'The decision cites no evidence.');

  // Required fields.
  if (outbound && (!d.recipient.trim() || !d.message.trim())) add('fields-present', 'major', `${d.action} needs a recipient and a message.`);
  if (d.action === 'wait' && !parseDate(d.followUpBy)) add('fields-present', 'minor', 'wait has no follow-up date.');
  if (d.action === 'escalate_to_human' && !d.handover) add('handover-present', 'minor', 'Escalation without a handover packet; one will be built from the records.');
  if (d.action === 'other') add('other-action', 'minor', 'Action outside the standard set; needs review.');

  // Amounts in the message must come from the records (directly, as a sum, or with/without 20% VAT).
  // Any number in the records counts, with or without a currency sign (quotes list "360.00" in tables).
  const recordText = [...c.sections.map((x) => x.body), ...c.events.map((e) => e.body), ...c.attachments.map((a) => a.text ?? '')].join('\n');
  const bareNumbers = [...recordText.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g)].map((m) => Math.round(Number(m[0].replace(/,/g, '')) * 100)).filter((p) => p > 0);
  const known = [...new Set([...ledger.amounts.map((a) => a.pence), ...bareNumbers])].slice(0, 400);
  const derivable = new Set<number>(known);
  for (const a of known) {
    derivable.add(Math.round(a * 1.2));
    derivable.add(Math.round(a / 1.2));
    derivable.add(Math.round(a * 0.2));
    for (const b of known) derivable.add(a + b);
  }
  for (const a of findAmounts([d.message, d.actionLabel, ...(d.alsoSend ?? []).map((m) => m.message)].join('\n'), 'decision')) {
    const ok = [...derivable].some((k) => Math.abs(k - a.pence) <= 1);
    if (!ok) add('amount-supported', 'major', `States ${a.text}, which is not in the records or derivable from them.`);
  }

  // Full dates in the message must be in the records or be in the future (a proposed date, flagged for review).
  const recordDates = new Set([...ledger.dates.map((x) => x.iso.slice(0, 10)), ...c.events.map((e) => e.at?.slice(0, 10))]);
  for (const x of findDates([d.message, ...(d.alsoSend ?? []).map((m) => m.message)].join('\n')).filter((x) => /\d{4}/.test(x.text))) {
    const day = x.iso.slice(0, 10);
    if (!recordDates.has(day) && day < c.asOf.slice(0, 10)) add('date-supported', 'minor', `Message mentions ${x.text}, which is not in the records.`);
  }

  // Never chase or re-ask someone before a date they gave.
  if (d.action === 'chase' || d.action === 'request_information') {
    const pending = ledger.dates.filter((x) => !x.passed && sameParty(x.by, d.recipient));
    const promised = (situation?.openAsks ?? []).filter((a) => {
      const due = parseDate(a.promisedReplyBy);
      return due && due > c.asOf && !a.answered && (sameParty(a.to, d.recipient) || sameParty(a.from, d.recipient));
    });
    if (d.action === 'chase' && (pending.length || promised.length)) {
      const what = pending[0] ? `"${pending[0].text}" (${pending[0].iso.slice(0, 10)}, ${pending[0].sourceId})` : `${promised[0]!.promisedReplyBy}`;
      add('no-early-chase', 'major', `${d.recipient} said they would act by ${what}, which has not arrived at the decision moment.`);
    }
  }

  // Do not close with requests still open.
  if (d.action === 'close_case') {
    const open = (situation?.openAsks ?? []).filter((a) => !a.answered);
    if (open.length) add('close-with-open-items', 'major', `Closing while ${open.length} request(s) are unanswered: ${open.map((a) => a.ask).join('; ').slice(0, 300)}.`);
    const lastIds = new Set(c.events.slice(-3).map((e) => e.id));
    const recentFailure = ledger.failures.find((f) => lastIds.has(f.sourceId));
    if (recentFailure) add('close-with-open-items', 'minor', `A recent event mentions "${recentFailure.marker}" (${recentFailure.sourceId}).`);
  }

  // A critical safety risk is not something to sit on.
  const critical = (situation?.risks ?? []).find((r) => r.kind === 'safety' && r.severity === 'critical');
  if (critical && ['wait', 'close_case', 'update_record'].includes(d.action)) {
    add('safety-not-parked', 'major', `Critical safety risk (${critical.description}) but the action is ${d.action}.`);
  }
  return issues;
}

export const majors = (issues: HardIssue[]) => issues.filter((i) => i.severity === 'major');
export const describe = (i: HardIssue) => `[${i.rule}] ${i.detail}`;
