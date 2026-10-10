import type { CaseFile, Critique, Decision, FinalDecision, Handover, HardIssue, Ledger, Situation } from '../types';
import { describe, majors, sameParty } from './check';

/** Who a forced escalation goes to, in each track's words. */
const HUMAN_OWNER: Record<string, string> = {
  property: 'Property manager (human review)',
  insurance: 'Senior claims handler (human review)',
  banking: 'Senior case handler (human review)',
  logistics: 'Operations supervisor (human review)',
  _default: 'Case supervisor (human review)',
};
export const humanOwner = (track: string) => HUMAN_OWNER[track] ?? HUMAN_OWNER._default!;

/** Asking and chasing are the same move for agreement purposes. */
const family = (a: Decision['action']) => (a === 'chase' || a === 'request_information' ? 'ask' : a);
export const sameMove = (a: Decision, b: Decision) =>
  a.domainAction && b.domainAction
    ? a.domainAction === b.domainAction
    : family(a.action) === family(b.action) && (sameParty(a.recipient, b.recipient) || (!a.recipient.trim() && !b.recipient.trim()));

/** The sample most others agree with (ties broken by confidence), and the share that agrees. */
export function vote(samples: Decision[]): { pick: Decision; agreement: number } | undefined {
  if (!samples.length) return undefined;
  let best: { pick: Decision; votes: number } | undefined;
  for (const s of samples) {
    const votes = samples.filter((o) => sameMove(s, o)).length;
    if (!best || votes > best.votes || (votes === best.votes && s.confidence > best.pick.confidence)) best = { pick: s, votes };
  }
  return { pick: best!.pick, agreement: best!.votes / samples.length };
}

export const agreementWith = (d: Decision, samples: Decision[]) => (samples.length ? samples.filter((s) => sameMove(d, s)).length / samples.length : 0);

export interface GateInput {
  candidate: Decision;
  samples: Decision[];
  hard: HardIssue[];
  critique?: Critique;
  /** Hard-check results for each sample, for falling back to a clean one. */
  sampleIssues: HardIssue[][];
  revised: boolean;
  caseFile: CaseFile;
  ledger: Ledger;
  situation?: Situation;
}

/** Deterministic choice between acting, asking and escalating. */
export function gate(g: GateInput): FinalDecision {
  const { candidate, samples } = g;
  const agreement = agreementWith(candidate, samples);
  const final = (d: Decision, gateRule: string, decidedBy: FinalDecision['decidedBy'] = 'model'): FinalDecision => ({
    ...d,
    decidedBy,
    gateRule,
    agreement: agreementWith(d, samples),
  });

  // 1. The reviewer says no autonomous action is safe.
  if (g.critique?.verdict === 'escalate' && candidate.action !== 'escalate_to_human') {
    return escalate(g, `Reviewer: ${g.critique.escalationReason || g.critique.problems.map((p) => p.issue).join('; ')}`, 'critic-escalate');
  }

  // 2. A rule is still broken after revision: use a clean sample if there is one, else escalate.
  const broken = majors(g.hard);
  if (broken.length) {
    const clean = samples
      .map((s, i) => ({ s, issues: g.sampleIssues[i] ?? [] }))
      .filter((x) => !majors(x.issues).length)
      .sort((a, b) => agreementWith(b.s, samples) - agreementWith(a.s, samples) || b.s.confidence - a.s.confidence)[0];
    if (clean) return final(clean.s, `rule broken (${broken.map((b) => b.rule).join(', ')}); used the best sample that passes every rule`, 'gate');
    return escalate(g, `The proposed action breaks a rule that revision did not fix: ${broken.map(describe).join(' ')}`, 'rule-broken');
  }

  // 3. The model chose to escalate.
  if (candidate.action === 'escalate_to_human') {
    return final({ ...candidate, handover: candidate.handover ?? buildHandover(g, candidate.rationale) }, 'model chose escalation');
  }

  const criticOk = !g.critique || g.critique.verdict === 'pass';
  // 4. Reviewer and samples agree: act.
  if (criticOk && (agreement >= 0.5 || candidate.confidence >= 0.6)) {
    return final(candidate, g.critique ? `reviewer passed; ${Math.round(agreement * 100)}% of samples agree` : `no review available; ${Math.round(agreement * 100)}% of samples agree`);
  }
  // 5. Reviewer still unhappy after one revision, but the samples agree: act, with lower confidence.
  if (!criticOk && agreement >= 2 / 3) {
    return final({ ...candidate, confidence: Math.min(candidate.confidence, 0.55) }, 'reviewer still had concerns after revision; samples agree, so acting with lowered confidence');
  }
  // 6. Split decision: ask a party who can resolve it, else hand to a person.
  const ask = samples.filter((s) => family(s.action) === 'ask' && s.recipient.trim()).sort((a, b) => b.confidence - a.confidence)[0];
  if (ask && !(g.critique?.verdict === 'revise' && sameMove(ask, candidate))) {
    return final(ask, 'samples split; asking the party who can resolve the uncertainty', 'gate');
  }
  if (candidate.confidence >= 0.6 && criticOk) return final(candidate, 'samples split but confidence is adequate');
  return escalate(g, `No reliable autonomous action: samples split (${samples.map((s) => `${s.action}→${s.recipient || '-'}`).join(', ')})${g.critique ? `, reviewer: ${g.critique.verdict}` : ''}.`, 'split-escalate');
}

function escalate(g: GateInput, reason: string, rule: string): FinalDecision {
  const handover = buildHandover(g, reason);
  const track = g.caseFile.track;
  return {
    action: 'escalate_to_human',
    actionLabel: 'Hand the case to a person with the context below',
    recipient: humanOwner(track),
    channel: 'Internal escalation',
    message: renderHandover(handover),
    rationale: reason,
    citations: [...new Set(g.samples.flatMap((s) => s.citations))].slice(0, 12),
    expectedOutcome: 'A person decides the next step with the full context and does not need to re-read the case.',
    boundaries: ['No action has been taken with any external party.', 'The options listed are proposals, not decisions.'],
    remainingWork: [...new Set(g.samples.flatMap((s) => s.remainingWork))].slice(0, 6),
    assumptions: [],
    alternatives: g.samples.map((s) => ({ action: `${s.action}: ${s.actionLabel}`, whyNot: rule === 'split-escalate' ? 'no agreement between independent proposals' : reason })),
    followUpBy: '',
    handover,
    confidence: 0.5,
    decidedBy: 'gate',
    gateRule: rule,
    agreement: agreementWith({ action: 'escalate_to_human', recipient: humanOwner(track) } as Decision, g.samples),
  };
}

export function buildHandover(g: { caseFile: CaseFile; ledger: Ledger; situation?: Situation; samples: Decision[]; candidate?: Decision }, blocking: string): Handover {
  const s = g.situation;
  const lastEvents = g.caseFile.events.slice(-4).map((e) => `${e.id} (${e.at?.slice(0, 10) ?? 'undated'}) ${e.from ?? '?'} → ${e.to ?? '?'}: ${e.body.replace(/\s+/g, ' ').slice(0, 140)}`);
  return {
    summary: s?.summary ?? `${g.caseFile.title}. ${g.caseFile.events.length} events up to ${g.caseFile.asOf.slice(0, 10)}.`,
    done: s ? s.keyEvents.slice(-6).map((k) => `${k.id}: ${k.what}`) : lastEvents,
    blocking,
    options: g.samples.slice(0, 4).map((d) => ({ option: `${d.actionLabel} (${d.action} → ${d.recipient || 'n/a'})`, risk: d.boundaries[0] ?? d.rationale.slice(0, 160) })),
    recommendation: g.candidate?.actionLabel ?? g.samples[0]?.actionLabel ?? 'Review the case history and decide the next step.',
  };
}

export function renderHandover(h: Handover): string {
  return [
    `Summary: ${h.summary}`,
    '',
    'Done so far:',
    ...h.done.map((d) => `- ${d}`),
    '',
    `Why this needs a person: ${h.blocking}`,
    '',
    'Options:',
    ...(h.options.length ? h.options.map((o) => `- ${o.option}. Risk: ${o.risk}`) : ['- None proposed.']),
    '',
    `Recommended: ${h.recommendation}`,
  ].join('\n');
}

/** The answer when no model stage could run: an honest escalation built only from the records. */
export function fallbackDecision(c: CaseFile, ledger: Ledger, failures: string[], situation?: Situation): FinalDecision {
  const g = { caseFile: c, ledger, situation, samples: [] as Decision[] };
  const reason = `The automated decision stages did not complete (${failures.join('; ').slice(0, 300) || 'no model available'}), so no action was taken and the case needs a person.`;
  const handover = buildHandover(g, reason);
  const waiting = ledger.parties.filter((p) => p.unansweredAsks > 0).map((p) => `${p.name}: ${p.unansweredAsks} unanswered request(s) (${p.unansweredAskIds.join(', ')})`);
  if (waiting.length) handover.options.push({ option: `Chase the outstanding requests: ${waiting.join('; ')}`, risk: 'Check no reply date was promised before chasing.' });
  return {
    action: 'escalate_to_human',
    actionLabel: 'Hand the case to a person (automated decision unavailable)',
    recipient: humanOwner(c.track),
    channel: 'Internal escalation',
    message: renderHandover(handover),
    rationale: reason,
    citations: c.events.slice(-3).map((e) => e.id),
    expectedOutcome: 'A person reviews the case and decides the next step.',
    boundaries: ['No decision was made about the substance of the case.', 'Nothing has been sent to any party.'],
    remainingWork: ['Decide the next step for the case.'],
    assumptions: [],
    alternatives: [],
    followUpBy: '',
    handover,
    confidence: 0,
    decidedBy: 'fallback',
    gateRule: 'fallback: model stages unavailable',
    agreement: 0,
  };
}
