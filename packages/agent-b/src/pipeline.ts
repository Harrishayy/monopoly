import { buildLedger } from './facts/ledger';
import { loadCase, type LoadOptions } from './ingest/casefile';
import type { Caller } from './llm/client';
import { citableIds, describe, hardChecks, majors } from './stages/check';
import { caseContent, DOSSIER_CHAR_BUDGET, renderDossier } from './stages/dossier';
import { fallbackDecision, gate, vote } from './stages/gate';
import { critique, decide, digestEvents, revise, situate, type StageContext } from './stages/model-stages';
import { systemPrompt } from './stages/prompts';
import type { CaseFile, CaseResult, Critique, Decision, HardIssue, ModelCall, Situation } from './types';

export interface RunOptions extends LoadOptions {
  /** Messages API caller; undefined runs offline (every case escalates honestly). */
  caller?: Caller;
  /** Independent decide samples. */
  samples?: number;
  /** Per-case time budget. */
  timeoutMs?: number;
  /** Progress lines. */
  log?: (line: string) => void;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Run one case end to end. Never throws: every failure is recorded and the case still gets an answer. */
export async function runCase(dir: string, opts: RunOptions = {}): Promise<CaseResult> {
  const started = Date.now();
  const startedAt = new Date().toISOString();
  const failures: string[] = [];
  const calls: ModelCall[] = [];
  const log = opts.log ?? (() => {});

  let caseFile: CaseFile;
  try {
    caseFile = await loadCase(dir, opts);
  } catch (e) {
    failures.push(`ingest: ${errText(e)}`);
    caseFile = { dir, name: dir.split(/[\\/]/).pop() ?? dir, track: opts.track ?? '_default', title: 'Unreadable case', fields: [], sections: [], events: [], attachments: [], anomalies: [`Case could not be loaded: ${errText(e)}`], withheld: [], asOf: new Date(0).toISOString() };
  }
  const ledger = buildLedger(caseFile);
  const base = { caseFile, ledger, samples: [] as Decision[], hardIssues: [] as HardIssue[], critiques: [] as Critique[], revised: false, failures, calls, startedAt };

  if (!opts.caller) {
    failures.push('no model available (ANTHROPIC_API_KEY not set)');
    return { ...base, final: fallbackDecision(caseFile, ledger, failures), ms: Date.now() - started };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8 * 60_000);
  try {
    const system = systemPrompt(caseFile.track);

    // Very large cases: summarise the oldest events so the newest stay verbatim.
    let dossier = renderDossier(caseFile, ledger);
    if (dossier.length > DOSSIER_CHAR_BUDGET) {
      try {
        const digest = await digestEvents(opts.caller, system, caseFile, 30, calls, controller.signal);
        if (digest) dossier = renderDossier(caseFile, ledger, digest);
        log(`${caseFile.name}: large case, digested events up to ${digest?.upTo}`);
      } catch (e) {
        failures.push(`digest: ${errText(e)}; using the full dossier`);
      }
    }
    const ctx: StageContext = { caller: opts.caller, system, caseBlocks: await caseContent(dossier, caseFile), calls, signal: controller.signal };

    // Situate. Decide can still run without it.
    let situation: Situation | undefined;
    try {
      situation = await situate(ctx);
    } catch (e) {
      failures.push(`situate: ${errText(e)}`);
    }

    // Decide, sampled.
    const ids = citableIds(caseFile);
    const settled = await Promise.allSettled(Array.from({ length: opts.samples ?? 3 }, () => decide(ctx, situation)));
    const samples = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    for (const r of settled) if (r.status === 'rejected') failures.push(`decide: ${errText(r.reason)}`);
    if (!samples.length) {
      return { ...base, situation, final: fallbackDecision(caseFile, ledger, failures, situation), ms: Date.now() - started };
    }
    const sampleIssues = samples.map((s) => hardChecks(s, caseFile, ledger, situation));
    const voted = vote(samples)!;
    let candidate = voted.pick;
    let hard = hardChecks(candidate, caseFile, ledger, situation);
    const critiques: Critique[] = [];

    // Review, and revise once if needed.
    let review: Critique | undefined;
    try {
      review = await critique(ctx, candidate, hard.map(describe));
      critiques.push(review);
    } catch (e) {
      failures.push(`critic: ${errText(e)}`);
    }
    let revised = false;
    const problems = [...majors(hard).map(describe), ...(review && review.verdict !== 'pass' ? review.problems.map((p) => `${p.severity}: ${p.issue}`) : [])];
    if (problems.length && review?.verdict !== 'escalate') {
      try {
        candidate = await revise(ctx, situation, problems);
        revised = true;
        hard = hardChecks(candidate, caseFile, ledger, situation);
        try {
          review = await critique(ctx, candidate, hard.map(describe));
          critiques.push(review);
        } catch (e) {
          failures.push(`critic (after revision): ${errText(e)}`);
          review = undefined;
        }
      } catch (e) {
        failures.push(`revise: ${errText(e)}`);
      }
    }

    const final = gate({ candidate, samples, hard, critique: review, sampleIssues, revised, caseFile, ledger, situation });
    // Drop citations that do not exist rather than show them.
    final.citations = final.citations.filter((x) => ids.has(x));
    log(`${caseFile.name}: ${final.action} → ${final.recipient || '-'} (${final.gateRule})`);
    return { ...base, situation, samples, hardIssues: hard, critiques, revised, final, ms: Date.now() - started };
  } catch (e) {
    failures.push(`pipeline: ${errText(e)}`);
    return { ...base, final: fallbackDecision(caseFile, ledger, failures), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}
