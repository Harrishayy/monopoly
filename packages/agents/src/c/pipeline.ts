import { buildLedger } from '../b/facts/ledger';
import { loadCase } from '../b/ingest/casefile';
import { domainActions } from '../b/knowledge/actions';
import type { RunOptions } from '../b/pipeline';
import { citableIds, describe, hardChecks, majors } from '../b/stages/check';
import { caseContent, DOSSIER_CHAR_BUDGET, renderDossier } from '../b/stages/dossier';
import { agreementWith, buildHandover, fallbackDecision, gate, humanOwner, renderHandover, vote } from '../b/stages/gate';
import { decide, digestEvents, situate, type StageContext } from '../b/stages/model-stages';
import { systemPromptC } from './knowledge';
import type { CaseFile, Critique, Decision, FinalDecision, HardIssue, Ledger, ModelCall, Situation } from '../b/types';
import { respond, review } from './stages';
import type { CaseResultC, Review, ReviewIssue, Round } from './types';

export interface RunOptionsC extends RunOptions {
  models: { read: string; decide: string; critic: string };
  /** Review rounds, including the first (default 2). */
  rounds?: number;
  /** What to do when the leader rejects a blocking issue with evidence and the critic still holds it. */
  onDispute?: 'escalate' | 'gate';
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Code-check failures join the critic's issues so the leader answers both the same way. */
const checkIssues = (hard: HardIssue[]): ReviewIssue[] =>
  majors(hard).map((h, i) => ({ id: `h${i + 1}`, severity: 'blocking', tag: 'evidence', claim: describe(h), refs: [], suggestion: 'Change the plan so this automatic check passes.' }));

const blockingOf = (r?: Review) => (r?.issues ?? []).filter((i) => i.severity === 'blocking');

/** B's renderers and gate read the older free-text critique. */
export function toCritique(r: Review): Critique {
  return {
    verdict: r.verdict === 'approve' ? 'pass' : r.verdict,
    problems: r.issues.map((i) => ({
      issue: `${i.id} [${i.tag}] ${i.claim}${i.refs.length ? ` (${i.refs.join(', ')})` : ''}. Fix: ${i.suggestion}`,
      severity: i.severity === 'blocking' ? 'major' : 'minor',
    })),
    escalationReason: r.escalationReason,
  };
}

/** Blocking issues in the last review that the leader had rejected with evidence in the round before. */
export function disputesOf(rounds: Round[]): CaseResultC['disputed'] {
  const last = rounds.at(-1);
  const prev = rounds.at(-2);
  if (!last?.review || !prev) return [];
  return blockingOf(last.review).flatMap((issue) => {
    const response = prev.responses.find((r) => r.issueId === issue.id && r.verdict === 'reject');
    return response ? [{ issue, response }] : [];
  });
}

/** Two models still disagree after answering each other: a person decides, with both positions and their evidence. */
export function disputeEscalation(g: {
  caseFile: CaseFile;
  ledger: Ledger;
  situation?: Situation;
  samples: Decision[];
  candidate: Decision;
  disputed: CaseResultC['disputed'];
}): FinalDecision {
  const { candidate, disputed } = g;
  const ids = citableIds(g.caseFile);
  const refs = (xs: string[]) => (xs.length ? ` [${xs.join(', ')}]` : '');
  const reason = `The deciding agent and an independent reviewer still disagree after two rounds: ${disputed.map((d) => d.issue.claim).join(' ')}`;
  const handover = buildHandover({ ...g, candidate }, reason);
  handover.options = [
    { option: `Agent's plan: ${candidate.actionLabel} (${candidate.action} → ${candidate.recipient || 'n/a'})`, risk: `Reviewer: ${disputed.map((d) => `${d.issue.claim}${refs(d.issue.refs)}`).join(' ')}` },
    ...disputed.map((d) => ({ option: `Reviewer's alternative: ${d.issue.suggestion}`, risk: `Agent: ${d.response.evidence}${refs(d.response.refs)}` })),
  ];
  handover.recommendation = `Check the cited records and choose between the two positions. Nothing has been sent; the agent's plan was: ${candidate.actionLabel}.`;
  const cited = [...new Set([...candidate.citations, ...disputed.flatMap((d) => [...d.issue.refs, ...d.response.refs])])].filter((x) => ids.has(x));
  const owner = humanOwner(g.caseFile.track);
  return {
    action: 'escalate_to_human',
    actionLabel: 'Hand the case to a person: the agent and its reviewer disagree',
    recipient: owner,
    channel: 'Internal escalation',
    message: renderHandover(handover),
    rationale: reason,
    citations: cited.slice(0, 12),
    expectedOutcome: 'A person settles the disagreement with both positions and their evidence in front of them.',
    boundaries: ['No action has been taken with any external party.', 'Both options are proposals; either can still be sent.'],
    remainingWork: candidate.remainingWork,
    assumptions: [],
    alternatives: [
      { action: `${candidate.action}: ${candidate.actionLabel}`, whyNot: 'disputed by the reviewer' },
      ...disputed.map((d) => ({ action: d.issue.suggestion, whyNot: `rejected by the agent: ${d.response.evidence}` })),
    ],
    followUpBy: '',
    handover,
    confidence: 0.5,
    decidedBy: 'gate',
    gateRule: 'dispute-escalate',
    agreement: agreementWith({ action: 'escalate_to_human', recipient: owner } as Decision, g.samples),
  };
}

/** Run one case end to end. Never throws: every failure is recorded and the case still gets an answer. */
export async function runCaseC(dir: string, opts: RunOptionsC): Promise<CaseResultC> {
  const started = Date.now();
  const startedAt = new Date().toISOString();
  const failures: string[] = [];
  const calls: ModelCall[] = [];
  const rounds: Round[] = [];
  const log = opts.log ?? (() => {});

  let caseFile: CaseFile;
  try {
    caseFile = await loadCase(dir, opts);
  } catch (e) {
    failures.push(`ingest: ${errText(e)}`);
    caseFile = { dir, name: dir.split(/[\\/]/).pop() ?? dir, track: opts.track ?? '_default', title: 'Unreadable case', fields: [], sections: [], events: [], attachments: [], anomalies: [`Case could not be loaded: ${errText(e)}`], withheld: [], asOf: new Date(0).toISOString() };
  }
  const ledger = buildLedger(caseFile);
  const base = { caseFile, ledger, samples: [] as Decision[], hardIssues: [] as HardIssue[], critiques: [] as Critique[], revised: false, failures, calls, startedAt, rounds, disputed: [] as CaseResultC['disputed'], models: opts.models };

  if (!opts.caller) {
    failures.push('no model available (ANTHROPIC_API_KEY not set)');
    return { ...base, final: fallbackDecision(caseFile, ledger, failures), ms: Date.now() - started };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8 * 60_000);
  try {
    const system = systemPromptC(caseFile.track);
    let hint = '';
    if (opts.hints) {
      try {
        hint = await opts.hints({ dir, track: caseFile.track, cutBefore: opts.cutBefore, asOf: caseFile.asOf });
      } catch (e) {
        failures.push(`hints: ${errText(e)}`);
      }
    }
    const withHint = (d: string) => (hint ? `${d}\n\n== PLAYBOOK READ (rules from another engine; a strong hint, not the truth) ==\n${hint}` : d);
    let dossier = withHint(renderDossier(caseFile, ledger));
    if (dossier.length > DOSSIER_CHAR_BUDGET) {
      try {
        const digest = await digestEvents(opts.caller, system, caseFile, 30, calls, controller.signal);
        if (digest) dossier = withHint(renderDossier(caseFile, ledger, digest));
        log(`${caseFile.name}: large case, digested events up to ${digest?.upTo}`);
      } catch (e) {
        failures.push(`digest: ${errText(e)}; using the full dossier`);
      }
    }
    const ctx: StageContext = {
      caller: opts.caller,
      system,
      caseBlocks: await caseContent(dossier, caseFile),
      calls,
      signal: controller.signal,
      actions: domainActions(caseFile.track),
      examples: opts.examples?.(caseFile) || undefined,
      models: opts.models,
    };

    let situation: Situation | undefined;
    if (opts.situate !== false) {
      try {
        situation = await situate(ctx);
      } catch (e) {
        failures.push(`situate: ${errText(e)}`);
      }
    }

    const ids = citableIds(caseFile);
    const settled = await Promise.allSettled(Array.from({ length: opts.samples ?? 3 }, () => decide(ctx, situation)));
    const samples = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    for (const r of settled) if (r.status === 'rejected') failures.push(`decide: ${errText(r.reason)}`);
    if (!samples.length) {
      return { ...base, situation, final: fallbackDecision(caseFile, ledger, failures, situation), ms: Date.now() - started };
    }
    const sampleIssues = samples.map((s) => hardChecks(s, caseFile, ledger, situation));
    let candidate = vote(samples)!.pick;
    let hard = hardChecks(candidate, caseFile, ledger, situation);
    let revised = false;

    // Review dialogue: the critic raises cited issues, the leader accepts or rejects each with evidence.
    const maxRounds = opts.review === false ? 0 : Math.max(1, opts.rounds ?? 2);
    for (let n = 1; n <= maxRounds; n++) {
      const prev = rounds.at(-1);
      const round: Round = { n, model: opts.models.critic, checkIssues: checkIssues(hard), responses: [] };
      rounds.push(round);
      try {
        round.review = await review(ctx, candidate, hard.map(describe), n, prev?.review ? { issues: [...prev.checkIssues, ...blockingOf(prev.review)], responses: prev.responses } : undefined);
      } catch (e) {
        failures.push(`review ${n}: ${errText(e)}`);
      }
      if (round.review?.verdict === 'escalate') break;
      const blocking = [...round.checkIssues, ...blockingOf(round.review)];
      if (!blocking.length || n === maxRounds) break;
      try {
        const r = await respond(ctx, situation, candidate, blocking, n);
        round.responses = r.responses;
        round.revision = r.decision;
        candidate = r.decision;
        revised = true;
        hard = hardChecks(candidate, caseFile, ledger, situation);
      } catch (e) {
        failures.push(`respond ${n}: ${errText(e)}`);
        break;
      }
    }
    // Without a critic, a broken rule still gets one revision.
    if (maxRounds === 0 && majors(hard).length) {
      try {
        const r = await respond(ctx, situation, candidate, checkIssues(hard), 1);
        rounds.push({ n: 1, model: '', checkIssues: checkIssues(hard), responses: r.responses, revision: r.decision });
        candidate = r.decision;
        revised = true;
        hard = hardChecks(candidate, caseFile, ledger, situation);
      } catch (e) {
        failures.push(`respond: ${errText(e)}`);
      }
    }

    const critiques = rounds.flatMap((r) => (r.review ? [toCritique(r.review)] : []));
    const lastReview = rounds.findLast((r) => r.review)?.review;
    const disputed = disputesOf(rounds);
    const final =
      disputed.length && (opts.onDispute ?? 'escalate') === 'escalate' && lastReview?.verdict !== 'escalate' && !majors(hard).length
        ? disputeEscalation({ caseFile, ledger, situation, samples, candidate, disputed })
        : gate({ candidate, samples, hard, critique: lastReview && toCritique(lastReview), sampleIssues, revised, caseFile, ledger, situation });
    final.citations = final.citations.filter((x) => ids.has(x));
    log(`${caseFile.name}: ${final.action} → ${final.recipient || '-'} (${final.gateRule})`);
    return { ...base, situation, samples, hardIssues: hard, critiques, revised, rounds, disputed, final, ms: Date.now() - started };
  } catch (e) {
    failures.push(`pipeline: ${errText(e)}`);
    return { ...base, final: fallbackDecision(caseFile, ledger, failures), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}