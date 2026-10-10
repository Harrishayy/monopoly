import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { renderAnswers, RunEvent, runView, type Case, type TrackPack } from '@casework/core';
import { runCase, type EmitInput } from '@casework/core/agent';
import { getPack } from '@casework/tracks';
import type { Agent, AgentDecision, RunInput } from '../agent';
import { answerNames, pool } from '../b/batch';

/**
 * Agent A: the deterministic assessment plus a guarded tool-use loop, implemented in @casework/core and the
 * track packs in @casework/tracks. This adapter runs it on one case folder and reports in the common shape.
 */

/** Track folders load all their cases at once; keep them per (folder, withhold). */
const cache = new Map<string, Promise<Map<string, Case>>>();

function casesIn(pack: TrackPack, trackDir: string, withhold: RunInput['withhold']): Promise<Map<string, Case>> {
  const key = `${trackDir}|${withhold}`;
  let p = cache.get(key);
  if (!p) {
    p = pack.loadCases(trackDir, { withhold }).then((cs) => new Map(cs.map((c) => [c.ref.split('-').at(-1)!, c])));
    cache.set(key, p);
  }
  return p;
}

/** The case as it stood just before event `cutBefore`, including only attachments that had arrived. */
export function cutCase(c: Case, cutBefore: number): Case {
  return {
    ...c,
    sources: c.sources.filter((s) => {
      const m = s.id.match(/:event-(\d+)$/);
      if (m) return Number(m[1]) < cutBefore;
      const arrivedWith = (s.meta as { event?: number }).event;
      return arrivedWith === undefined || arrivedWith < cutBefore;
    }),
  };
}

async function run(c: Case, pack: TrackPack, input: Pick<RunInput, 'asOf' | 'offline'>) {
  const runId = randomUUID();
  const events: RunEvent[] = [];
  let seq = 0;
  const emit = (e: EmitInput) => events.push(RunEvent.parse({ ...e, runId, seq: seq++, at: new Date().toISOString() }));
  const failures: string[] = [];
  try {
    await runCase(c, pack, { runId, autonomy: pack.autonomy, emit, ...(input.asOf ? { asOf: input.asOf } : {}), ...(input.offline ? { model: null } : {}) });
  } catch (e) {
    failures.push(`runner: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { events, view: runView(events), failures };
}

function toDecision(view: ReturnType<typeof runView>, failures: string[], ms: number): AgentDecision {
  const next = view.next;
  return {
    agent: 'a',
    action: next?.action ?? 'none',
    recipient: next?.recipient ?? '',
    channel: next?.channel ?? '',
    message: next?.message ?? '',
    reason: next?.reason ?? view.summary ?? '',
    decidedBy: next?.decidedBy ?? 'none',
    confidence: next?.confidence,
    ms,
    failures,
  };
}

export async function load(input: RunInput): Promise<{ c: Case; pack: TrackPack }> {
  const pack = getPack(input.track === 'insurance' ? 'claims' : input.track);
  const cases = await casesIn(pack, dirname(input.dir), input.withhold);
  const c = cases.get(basename(input.dir));
  if (!c) throw new Error(`Agent A could not load case ${input.dir}`);
  return { c: input.cutBefore !== undefined ? cutCase(c, input.cutBefore) : c, pack };
}

export const agentA: Agent = {
  id: 'a',
  label: 'Agent A (assessment + guarded tool loop)',
  async decide(input) {
    const started = Date.now();
    try {
      const { c, pack } = await load(input);
      const { view, failures } = await run(c, pack, input);
      return toDecision(view, failures, Date.now() - started);
    } catch (e) {
      return { agent: 'a', action: 'none', recipient: '', channel: '', message: '', reason: '', decidedBy: 'error', ms: Date.now() - started, failures: [e instanceof Error ? e.message : String(e)] };
    }
  },
  async answer(dirs, outDir, opts) {
    const names = answerNames(dirs);
    return pool(dirs, opts.concurrency ?? 4, async (dir, i) => {
      const started = Date.now();
      const track = opts.track ?? 'property';
      let decision: AgentDecision;
      try {
        const { c, pack } = await load({ dir, track, withhold: opts.withhold });
        const { events, view, failures } = await run(c, pack, { offline: opts.offline });
        const { answer, reasoning } = renderAnswers(view, c, i + 1);
        const out = join(outDir, names[i]!);
        await mkdir(out, { recursive: true });
        await writeFile(join(out, 'ANSWER.md'), failures.length ? `${answer}\n**Runner error**\n${failures.join('\n')}\n` : answer);
        await writeFile(join(out, 'REASONING.md'), reasoning);
        await writeFile(join(out, 'trace.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
        decision = toDecision(view, failures, Date.now() - started);
      } catch (e) {
        decision = { agent: 'a', action: 'none', recipient: '', channel: '', message: '', reason: '', decidedBy: 'error', ms: Date.now() - started, failures: [e instanceof Error ? e.message : String(e)] };
      }
      opts.log?.(`[a ${i + 1}/${dirs.length}] ${names[i]}: ${decision.action}`);
      return { name: names[i]!, decision };
    });
  },
};
