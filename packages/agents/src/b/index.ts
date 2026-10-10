import type { Agent, AgentDecision } from '../agent';
import { runBatch } from './batch';
import { domainActions, genericOf } from './knowledge/actions';
import { type Caller, defaultCaller } from './llm/client';
import { runCase, type RunOptions } from './pipeline';
import type { CaseFile, CaseResult } from './types';

/**
 * Agent B: a fixed pipeline (ingest → ledger → situate → decide ×3 → check + review → gate → write).
 * `examples` plugs in few-shot memory; `caller` defaults to the Messages API when a key is set.
 */
export interface AgentBOptions {
  caller?: Caller;
  examples?: (c: CaseFile) => string;
  samples?: number;
  situate?: boolean;
  review?: boolean;
  /** Agent A's rules read, as advice (see src/hybrid.ts). */
  hints?: RunOptions['hints'];
}

/** The decision in the track's vocabulary when it has one, so both agents are scored alike. */
export function domainActionOf(r: CaseResult): string {
  const f = r.final;
  if (f.domainAction) return f.domainAction;
  const list = domainActions(r.caseFile.track);
  // Forced escalations and fallbacks use generic verbs; translate when the list has exactly one match.
  const matches = list?.filter((a) => genericOf(a.name) === f.action) ?? [];
  return matches.length === 1 ? matches[0]!.name : f.action;
}

export function toAgentDecision(r: CaseResult): AgentDecision {
  return {
    agent: 'b',
    action: domainActionOf(r),
    recipient: r.final.recipient,
    channel: r.final.channel,
    message: r.final.message,
    reason: r.final.rationale,
    decidedBy: r.final.decidedBy,
    confidence: r.final.confidence,
    ms: r.ms,
    failures: r.failures,
  };
}

export function agentB(opts: AgentBOptions = {}): Agent {
  const caller = () => (opts.caller ?? defaultCaller());
  return {
    id: 'b',
    label: 'Agent B (fixed pipeline)',
    async decide(input) {
      const r = await runCase(input.dir, {
        caller: input.offline ? undefined : caller(),
        track: input.track,
        withhold: input.withhold,
        cutBefore: input.cutBefore,
        samples: opts.samples,
        examples: opts.examples,
        situate: opts.situate,
        review: opts.review,
        hints: opts.hints,
      });
      return toAgentDecision(r);
    },
    async answer(dirs, outDir, o) {
      const results = await runBatch(dirs, outDir, {
        caller: o.offline ? undefined : caller(),
        track: o.track,
        withhold: o.withhold,
        concurrency: o.concurrency,
        samples: opts.samples,
        examples: opts.examples,
        situate: opts.situate,
        review: opts.review,
        hints: opts.hints,
        log: o.log,
      });
      return results.map(({ name, result }) => ({ name, decision: toAgentDecision(result) }));
    },
  };
}
