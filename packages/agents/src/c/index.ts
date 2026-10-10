import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Agent } from '../agent';
import { answerNames, pool, renderSummary } from '../b/batch';
import { type AgentBOptions, toAgentDecision } from '../b';
import { defaultCaller } from '../b/llm/client';
import { type RunOptionsC, runCaseC } from './pipeline';
import { renderAnswer, renderReasoning, traceLines } from './render';
import type { CaseResultC } from './types';

/**
 * Agent C: agent B's pipeline with a stronger decider, a reviewer on a different model, and a review dialogue
 * (cited issues, an answer to each, a second round, escalation with both positions if they still disagree).
 */
export interface AgentCOptions extends AgentBOptions {
  models?: Partial<RunOptionsC['models']>;
  rounds?: number;
  onDispute?: RunOptionsC['onDispute'];
}

export const C_DEFAULT_MODELS = { read: 'claude-haiku-5-5', decide: 'claude-opus-5-5', critic: 'claude-sonnet-5-5' };

export function cModels(m: AgentCOptions['models'] = {}): RunOptionsC['models'] {
  return {
    read: m.read ?? process.env.AGENT_C_MODEL_READ ?? C_DEFAULT_MODELS.read,
    decide: m.decide ?? process.env.AGENT_C_MODEL_DECIDE ?? C_DEFAULT_MODELS.decide,
    critic: m.critic ?? process.env.AGENT_C_MODEL_CRITIC ?? C_DEFAULT_MODELS.critic,
  };
}

async function writeResult(outDir: string, name: string, r: CaseResultC): Promise<void> {
  const dir = join(outDir, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'ANSWER.md'), renderAnswer(r));
  await writeFile(join(dir, 'REASONING.md'), renderReasoning(r));
  await writeFile(join(dir, 'trace.jsonl'), traceLines(r));
}

export function agentC(opts: AgentCOptions = {}): Agent {
  const caller = () => opts.caller ?? defaultCaller();
  const run = (dir: string, o: Partial<RunOptionsC>) =>
    runCaseC(dir, {
      ...o,
      samples: opts.samples,
      examples: opts.examples,
      situate: opts.situate,
      review: opts.review,
      hints: opts.hints,
      models: cModels(opts.models),
      rounds: opts.rounds,
      onDispute: opts.onDispute,
    });
  return {
    id: 'c',
    label: 'Agent C (pipeline with review dialogue)',
    async decide(input) {
      const r = await run(input.dir, { caller: input.offline ? undefined : caller(), track: input.track, withhold: input.withhold, cutBefore: input.cutBefore });
      return { ...toAgentDecision(r), agent: 'c' };
    },
    async answer(dirs, outDir, o) {
      const names = answerNames(dirs);
      const log = o.log ?? (() => {});
      const c = o.offline ? undefined : caller();
      const results = await pool(dirs, o.concurrency ?? 4, async (dir, i) => {
        const result = await run(dir, { caller: c, track: o.track, withhold: o.withhold, log });
        try {
          await writeResult(outDir, names[i]!, result);
        } catch (e) {
          log(`${names[i]}: could not write answer: ${e instanceof Error ? e.message : String(e)}`);
        }
        log(`[${i + 1}/${dirs.length}] ${names[i]} done in ${(result.ms / 1000).toFixed(0)}s`);
        return { name: names[i]!, result };
      });
      await writeFile(join(outDir, 'SUMMARY.md'), renderSummary(results).replace('# Agent B run summary', '# Agent C run summary'));
      return results.map(({ name, result }) => ({ name, decision: { ...toAgentDecision(result), agent: 'c' as const } }));
    },
  };
}
