import type { Assessment, Case, TrackPack } from '@casework/core';
import { blank, check, contractBars, type CheckContext } from './check';
import { addUsage, budget, callJson, defaultCaller, MODELS, zeroUsage, type Caller } from './model';
import { caseText, retryTask, supervisorTask, systemPrompt, voteTask } from './prompt';
import { openTriggers, type TriggerHit } from './triggers';
import { Proposal, Supervision, type Action, type DResult, type ModelCallRecord, type Refusal, type Route } from './types';

/**
 * Agent D, one case:
 *   rules assessment → forced triggers (code escalates, no model) → 3 Haiku votes → guard on each vote →
 *   easy (unanimous, reversible, no flags) or gated Opus supervisor or majority with a cautious tie-break →
 *   one retry with the guard's reasons → playbook fallback → escalate. Never throws.
 */

/** Steps that commit money or end the job: never taken on a split vote without the supervisor. */
const IRREVERSIBLE = new Set<Action>(['case.close', 'contractor.assign', 'contractor.instruct']);

/** Tie-break between passing candidates: the steps least often wrong in the labelled cuts come first. */
const PREFERENCE: Action[] = [
  'landlord.update', 'tenant.update', 'case.wait', 'tenant.ask', 'contractor.chase', 'contractor.update',
  'landlord.send_quote', 'landlord.request_approval', 'landlord.chase', 'tenant.chase',
  'contractor.assign', 'contractor.instruct', 'case.escalate', 'case.close',
];

export interface DecideOptions {
  /** null runs without a model (rules and fallback only). */
  caller?: Caller | null;
  samples?: number;
  signal?: AbortSignal;
}

export async function decideCase(c: Case, pack: TrackPack, asOfIn: string | undefined, opts: DecideOptions = {}): Promise<DResult> {
  const started = Date.now();
  const asOf = asOfIn ?? c.sources.reduce((t, s) => (s.receivedAt > t ? s.receivedAt : t), c.sources[0]?.receivedAt ?? new Date().toISOString());
  const failures: string[] = [];
  const refusals: Refusal[] = [];
  const calls: ModelCallRecord[] = [];

  let assessment: Assessment | undefined;
  try {
    assessment = pack.assess?.(c, { asOf });
  } catch (e) {
    failures.push(`assessment: ${e instanceof Error ? e.message : String(e)}`);
  }
  const hits = openTriggers(c, assessment, asOf);
  const forced = hits.filter((h) => h.rule.mode !== 'warn');
  const warnings = hits.filter((h) => h.rule.mode === 'warn');
  const ctx: CheckContext = { c, pack, assessment, forced };

  const done = (route: Route, final: Proposal, extra: Partial<DResult> = {}): DResult => ({
    caseRef: c.ref,
    asOf,
    route,
    final,
    votes: [],
    refusals,
    forced: forced.map(hitView),
    warnings: warnings.map(hitView),
    calls,
    usage: calls.reduce((u, r) => addUsage(u, r.usage), zeroUsage()),
    stage: assessment?.stage,
    boundaries: assessment?.boundaries ?? [],
    failures,
    ms: Date.now() - started,
    ...extra,
  });

  const passes = (p: Proposal, by: string): boolean => {
    const v = check(p, ctx);
    if (!v.ok) refusals.push({ by, action: p.action, ruleId: v.ruleId, why: v.why });
    return v.ok;
  };

  // ---- forced: a person takes over, decided in code before any model runs
  if (forced.length) {
    const p = forcedProposal(forced);
    const vacant = assessment?.facts.some((f) => f.text.startsWith('Property is vacant'));
    const safety = forced.find((f) => f.rule.tenantSafety)?.rule.tenantSafety;
    if (!passes(p, 'forced')) failures.push('The forced escalation did not pass the guard; recorded anyway because a person must take over.');
    return done('forced', p, safety && !vacant ? { companion: { action: 'tenant.update', message: safety } } : {});
  }

  const caller = opts.caller === null ? undefined : (opts.caller ?? defaultCaller());
  if (!caller) {
    failures.push('No model configured (ANTHROPIC_API_KEY not set)');
    return fallback();
  }

  const system = systemPrompt(pack);
  const text = caseText(c, assessment, contractBars(ctx), warnings.map((w) => `${w.rule.label} in ${w.sourceId}: "${w.quote}". ${w.rule.firstStep}`));

  // ---- votes
  const n = Math.max(1, opts.samples ?? Number(process.env.AGENT_D_SAMPLES ?? 3));
  const results = await Promise.all(
    Array.from({ length: n }, () => callJson(caller, { role: 'vote', model: MODELS.decide(), system, caseText: text, task: voteTask(asOf), schema: Proposal, signal: opts.signal })),
  );
  for (const r of results) {
    calls.push(r.record);
    if (r.record.error) failures.push(`vote: ${r.record.error}`);
  }
  const votes = results.flatMap((r) => (r.value ? [r.value] : []));
  const passing = votes.filter((v, i) => passes(v, `vote ${i + 1}`));
  const extra = { votes };

  // ---- easy: unanimous, reversible, nothing flagged
  const weighed = (assessment?.flags.length ?? 0) > 0 || warnings.length > 0;
  const actions = new Set(votes.map((v) => v.action));
  if (votes.length === n && passing.length === n && actions.size === 1) {
    const action = votes[0]!.action;
    if (!IRREVERSIBLE.has(action) && !weighed) return done('easy', best(passing), extra);
  }

  // ---- supervised: Opus adjudicates between the candidates, within budget
  if (votes.length && budget.allows()) {
    const candidates = groups(votes).map(({ p, count }) => ({ p, votes: count, refused: passing.includes(p) ? undefined : refusals.find((r) => r.action === p.action) }));
    const sup = await callJson(caller, {
      role: 'supervisor',
      model: MODELS.supervisor(),
      system,
      caseText: text,
      task: supervisorTask(asOf, candidates),
      schema: Supervision,
      maxTokens: 24_000,
      signal: opts.signal,
    });
    calls.push(sup.record);
    budget.calls++;
    budget.usd += sup.record.usage.costUsd;
    if (sup.value) {
      if (passes(sup.value.decision, 'supervisor')) return done('supervised', sup.value.decision, { ...extra, supervision: sup.value });
      const chosen = sup.value.chosenCandidate;
      const pick = chosen !== null && chosen >= 0 ? candidates[chosen]?.p : undefined;
      if (pick && passing.includes(pick)) return done('supervised', pick, { ...extra, supervision: sup.value });
    } else if (sup.record.error) failures.push(`supervisor: ${sup.record.error}`);
  }

  // ---- majority among passing candidates, cautious on irreversible steps
  if (passing.length) {
    const gs = groups(passing).sort((x, y) => y.count - x.count || rank(x.p.action) - rank(y.p.action));
    let pick = gs[0]!;
    if (IRREVERSIBLE.has(pick.p.action) && pick.count < n) pick = gs.find((g) => !IRREVERSIBLE.has(g.p.action)) ?? pick;
    return done('majority', pick.p, extra);
  }

  // ---- retry once with the guard's reasons
  const retry = await callJson(caller, { role: 'retry', model: MODELS.decide(), system, caseText: text, task: retryTask(asOf, refusals), schema: Proposal, signal: opts.signal });
  calls.push(retry.record);
  if (retry.value && passes(retry.value, 'retry')) return done('retried', retry.value, extra);
  return fallback(extra);

  // ---- rules-only playbook, then a plain escalation
  function fallback(more: Partial<DResult> = {}): DResult {
    for (const s of assessment?.suggested ?? []) {
      const p = playbookProposal(s.action as Action, s.why, assessment!, c);
      if (passes(p, 'playbook')) return done('fallback', p, more);
    }
    const p: Proposal = {
      ...blank('case.escalate'),
      explanation: 'No step passed the guard, so the job goes to a person with the context gathered so far.',
      message: 'Please review this job: the agent could not find a step the rules allow.',
      citations: [c.sources[0]?.id ?? `${c.ref}:case`],
      triggerId: 'system.no_allowed_step',
      remainingWork: ['Choose and take the next step'],
    };
    return done('fallback', p, more);
  }
}

const hitView = (f: TriggerHit) => ({ id: f.rule.id, label: f.rule.label, sourceId: f.sourceId, quote: f.quote, queue: f.rule.queue, firstStep: f.rule.firstStep });

function groups(ps: Proposal[]): { p: Proposal; count: number }[] {
  const by = new Map<Action, Proposal[]>();
  for (const p of ps) by.set(p.action, [...(by.get(p.action) ?? []), p]);
  return [...by.values()].map((xs) => ({ p: best(xs), count: xs.length }));
}

/** The best-supported proposal: most citations, then the longest explanation. */
function best(ps: Proposal[]): Proposal {
  return [...ps].sort((a, b) => b.citations.length - a.citations.length || b.explanation.length - a.explanation.length)[0]!;
}

const rank = (a: Action) => {
  const i = PREFERENCE.indexOf(a);
  return i < 0 ? PREFERENCE.length : i;
};

function forcedProposal(forced: TriggerHit[]): Proposal {
  const labels = forced.map((f) => f.rule.label).join('; ');
  return {
    ...blank('case.escalate'),
    explanation: `A person must take this over: ${labels}. Evidence: ${forced.map((f) => `${f.sourceId} "${f.quote}"`).join('; ')}.`,
    message: `Handover (${labels}). ${forced.map((f) => f.rule.firstStep).join(' ')}`,
    citations: [...new Set(forced.map((f) => f.sourceId))],
    triggerId: forced.map((f) => f.rule.id).join(','),
    reviewNote: forced.map((f) => `${f.rule.queue}: ${f.rule.firstStep}`).join(' '),
    remainingWork: forced.map((f) => f.rule.firstStep),
  };
}

function playbookProposal(action: Action, why: string, a: Assessment, c: Case): Proposal {
  const cites = [...new Set([...(a.waitingOn?.sourceIds ?? []), ...a.facts.flatMap((f) => f.sourceIds)])].slice(-4);
  return {
    ...blank(action),
    explanation: `${why}. Stage: ${a.stage}. (Rules-only playbook.)`,
    channel: action.startsWith('case.') ? 'note' : 'email',
    message: `[Playbook draft, review before sending] ${why}.`,
    citations: cites.length ? cites : [c.sources[0]?.id ?? `${c.ref}:case`],
    remainingWork: ['Decided by rules only; a person should review the wording.'],
    triggerId: action === 'case.escalate' ? 'playbook' : null,
    missingFact: action.endsWith('.ask') ? why : null,
    recheckInDays: action === 'case.wait' ? 2 : null,
  };
}
