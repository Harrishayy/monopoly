import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Agent, AgentDecision, RunInput } from '../agent';
import type { load } from '../a';
import { answerNames, pool } from '../b/batch';
import { decideCase } from './decide';
import { loadForD } from './load';
import { renderAnswer, renderReasoning, traceLines } from './render';
import type { DResult } from './types';

/**
 * Agent D: agent A's rules and pack, a narrow set of forced triggers decided in code, three Haiku votes in
 * structured output, a gated Opus supervisor for the hard calls, and a code guard with the last word.
 * Design and measurements: docs/plan/12-agent-d.md.
 */

function toDecision(r: DResult, pack: Awaited<ReturnType<typeof load>>['pack']): AgentDecision {
  const f = r.final;
  return {
    agent: 'd',
    action: f.action,
    recipient: pack.tools.find((t) => t.name === f.action)?.recipient ?? f.action.split('.')[0] ?? '',
    channel: f.channel,
    message: f.message,
    reason: f.explanation,
    decidedBy: r.route,
    confidence: r.votes.length ? r.votes.filter((v) => v.action === f.action).length / r.votes.length : undefined,
    ms: r.ms,
    failures: r.failures,
    usage: r.usage,
  };
}

const failed = (e: unknown, ms: number): AgentDecision => ({
  agent: 'd',
  action: 'none',
  recipient: '',
  channel: '',
  message: '',
  reason: '',
  decidedBy: 'error',
  ms,
  failures: [e instanceof Error ? e.message : String(e)],
});

export const agentD: Agent = {
  id: 'd',
  label: 'Agent D (rules, forced triggers, Haiku votes, gated Opus supervisor, code guard)',
  async decide(input: RunInput) {
    const started = Date.now();
    try {
      const { c, pack, note } = await loadForD(input);
      const r = await decideCase(c, pack, input.asOf, input.offline ? { caller: null } : {});
      if (note) r.failures.unshift(`loader: ${note}`);
      return toDecision(r, pack);
    } catch (e) {
      return failed(e, Date.now() - started);
    }
  },
  async answer(dirs, outDir, opts) {
    const names = answerNames(dirs);
    return pool(dirs, opts.concurrency ?? 4, async (dir, i) => {
      const started = Date.now();
      let decision: AgentDecision;
      try {
        const { c, pack, note } = await loadForD({ dir, track: opts.track ?? 'property', withhold: opts.withhold });
        const r = await decideCase(c, pack, undefined, opts.offline ? { caller: null } : {});
        if (note) r.failures.unshift(`loader: ${note}`);
        const out = join(outDir, names[i]!);
        await mkdir(out, { recursive: true });
        await writeFile(join(out, 'ANSWER.md'), renderAnswer(r, c, pack, i + 1));
        await writeFile(join(out, 'REASONING.md'), renderReasoning(r, c, i + 1));
        await writeFile(join(out, 'trace.jsonl'), traceLines(r));
        decision = toDecision(r, pack);
      } catch (e) {
        decision = failed(e, Date.now() - started);
      }
      opts.log?.(`[d ${i + 1}/${dirs.length}] ${names[i]}: ${decision.action} (${decision.decidedBy})`);
      return { name: names[i]!, decision };
    });
  },
};
