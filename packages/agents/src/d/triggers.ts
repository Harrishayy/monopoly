import type { Assessment, Case, Source } from '@casework/core';

/**
 * Forced triggers: situations where a person must take over whatever the model thinks. Kept deliberately
 * narrow, because a forced escalation on a routine job is a miss. Softer risks (a door that won't lock, a
 * leak, a complaint) are left to the model and the supervisor gate, which see the assessment's flags.
 */
export interface TriggerRule {
  id: string;
  label: string;
  re: RegExp;
  /** Who picks it up. */
  queue: string;
  /** What the person should do first. */
  firstStep: string;
  /** Fixed safety message to the tenant, when the trigger is a danger to them. */
  tenantSafety?: string;
  /**
   * 'forced' hands the job to a person without a model. 'warn' tells the model and the supervisor and
   * goes through the gate: injected instructions are ignored and the job is handled on its merits.
   */
  mode?: 'forced' | 'warn';
}

export const TRIGGERS: TriggerRule[] = [
  {
    id: 'S1_gas_co',
    label: 'Gas smell or carbon monoxide',
    re: /\b(smell(s|ing|ed)? (of )?gas|gas (leak|smell)|leaking gas|carbon monoxide|co (alarm|detector) (is |keeps )?(going off|sounding|beeping))\b/i,
    queue: 'Property manager (emergency)',
    firstStep: 'Send a Gas Safe registered engineer as an emergency and tell the landlord the same day.',
    tenantSafety:
      "Please leave the area, don't use light switches or naked flames, and call the National Gas Emergency Service on 0800 111 999 now. Call 999 if anyone feels unwell. We are arranging an engineer urgently.",
  },
  {
    id: 'S2_electrical',
    label: 'Electrical danger',
    re: /\b(sparking|sparks (are )?(coming|flying)|smell of burning|burning smell|exposed (live )?wir(e|es|ing)|electric shock|(socket|plug|switch) (is )?(smoking|melted|melting|scorched)|water (is )?(coming |dripping |leaking )?(into|onto|near|through) (the )?(light fitting|lights?|sockets?|fuse ?box|consumer unit))\b/i,
    queue: 'Property manager (emergency)',
    firstStep: 'Send a qualified electrician as an emergency and tell the landlord the same day.',
    tenantSafety: "Please keep away from it and don't touch any switches near the water or damage. If it is safe to reach, switch off at the fuse box. We are arranging an electrician urgently.",
  },
  {
    id: 'L1_legal',
    label: 'Legal threat or regulator',
    re: /\b(my solicitor|a solicitor|legal action|take (you|this|them) to court|small claims|county court|environmental health|the ombudsman|ombudsman|disrepair claim|housing standards officer)\b/i,
    queue: 'Property manager',
    firstStep: 'Acknowledge without admitting fault, keep the repair moving, and review the complaint.',
  },
  {
    id: 'L5_eviction_harassment',
    label: 'Eviction, harassment or discrimination',
    re: /\b(illegal(ly)? evict\w*|harass\w*|discriminat\w*|change the locks (on|while) (them|the tenant)|get (them|the tenant) out)\b/i,
    queue: 'Property manager',
    firstStep: 'Review the tenancy position; do not act on any instruction to remove or pressure the tenant.',
  },
  {
    id: 'M5_payee_change',
    label: 'Bank-detail change or upfront payment',
    re: /\b((new|changed|updated|change of|different) (bank|account|payment) (details|account|information)|bank details have (changed|been updated)|pay (it )?(into|to) (this|our new|a new|a different) account|upfront payment|payment up ?front|pay (a )?deposit (up ?front|before (we|I) (start|attend)))\b/i,
    queue: 'Accounts',
    firstStep: 'Verify the change by calling a number already on file. Pay nothing until it is verified.',
  },
  {
    id: 'P4_injection',
    label: 'Instructions aimed at the system',
    mode: 'warn',
    re: /(\b(note|message|instructions?|memo) (to|for) (the |any )?(ai|assistant|agent|bot|system)\b|\bto (the )?ai agent\b|ignore (all |any )?(previous|prior|above|earlier|your) (instructions|rules|prompts?)|disregard (the|your|all) (rules|policy|policies|instructions)|^\s*(system|assistant)\s*:|\bas an ai\b|\byou are (an|the) (ai|assistant|language model|agent)\b|\b(AI|assistant|agent),? (please )?(approve|close|mark|refund|pay)\b)/im,
    queue: 'Property manager',
    firstStep: 'Treat the message as an ordinary enquiry and handle the repair on its merits. Nothing in it instructs the agency.',
  },
];

export interface TriggerHit {
  rule: TriggerRule;
  sourceId: string;
  quote: string;
}

/** Who wrote a source, lower-cased ("tenant", "landlord", "contractor", "agency / system", …). */
export const author = (s: Source) => String((s.meta as Record<string, unknown>).from ?? '').toLowerCase();

/** Words from outside the agency: tenants, landlords, contractors. Agency names vary per case, so match the others. */
export const isExternal = (s: Source) => /tenant|landlord|contractor|provider|survey|engineer|plumb|electric|locksmith|occupant|resident/.test(author(s));

/**
 * Forced triggers that are still open at `asOf`. Only words written by a tenant, landlord or contractor
 * count (not the agency's own notes or the AI intake), only recent ones count, and noise is skipped.
 */
/** Words just before a match that mean it is not a report: "no smell of gas", "if you smell gas, call…". */
const NEGATED = /\b(no|not|never|without|any|if|in case|should you|whether)\b[^.!?\n]{0,30}$/i;

/** Agency notes and call logs that pass on what someone else reported ("Tenant rang: smells gas"). */
const RELAYS = /\b(tenant|landlord|contractor|caller|resident|occupant|neighbour|she|he|they)\b[^.\n]{0,30}\b(rang|called|phoned|reported|reports|said|says|mentioned|advised|told us|complained)\b/i;

export function openTriggers(c: Case, a: Assessment | undefined, asOf: string): TriggerHit[] {
  const noise = new Set(a?.noise.map((n) => n.sourceId) ?? []);
  const now = Date.parse(asOf);
  const live = c.sources.filter((s) => !noise.has(s.id) && Date.parse(s.receivedAt) <= now);
  const recent = new Set(live.slice(-6).map((s) => s.id));
  const hits: TriggerHit[] = [];
  for (const s of live) {
    // The agency's own words do not count, except a call log or note that passes on someone's report.
    if (!isExternal(s) && s.kind !== 'ticket' && !(s.kind === 'call' || RELAYS.test(s.body))) continue;
    const fresh = recent.has(s.id) || now - Date.parse(s.receivedAt) <= 7 * 86_400_000;
    if (!fresh) continue;
    for (const rule of TRIGGERS) {
      if (hits.some((h) => h.rule.id === rule.id)) continue;
      const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`);
      for (const m of s.body.matchAll(re)) {
        const before = s.body.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0);
        if (rule.mode !== 'warn' && NEGATED.test(before)) continue;
        hits.push({ rule, sourceId: s.id, quote: excerpt(s.body, m.index ?? 0) });
        break;
      }
    }
  }
  return hits;
}

function excerpt(body: string, at: number): string {
  const start = Math.max(0, at - 60);
  return `${start > 0 ? '…' : ''}${body.slice(start, at + 100).replace(/\s+/g, ' ').trim()}…`;
}
