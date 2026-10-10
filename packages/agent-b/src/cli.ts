#!/usr/bin/env -S npx tsx
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runBatch } from './batch';
import { escalationLabels, propertyCutLabels, REPO, runEval, spread } from './eval/eval';
import { findCaseDirs } from './ingest/casefile';
import { defaultCaller } from './llm/client';

const USAGE = `agent-b run  --in <dir> [--out <dir>] [--track auto|property|insurance|banking|logistics] [--withhold none|outcomes]
             [--cases 001,002] [--concurrency 4] [--samples 3] [--offline]
agent-b eval [--set escalations|property-cuts|all] [--limit N] [--out <dir>] [--concurrency 4] [--samples 3] [--manuals off]`;

function args(argv: string[]): { cmd?: string; flags: Record<string, string> } {
  const [cmd, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=', 2) as [string, string | undefined];
    if (v !== undefined) flags[k] = v;
    else if (rest[i + 1] && !rest[i + 1]!.startsWith('--')) flags[k] = rest[++i]!;
    else flags[k] = 'true';
  }
  return { cmd, flags };
}

async function main() {
  const { cmd, flags } = args(process.argv.slice(2));
  const log = (l: string) => console.log(l);
  const num = (k: string, d: number) => (flags[k] ? Number(flags[k]) : d);
  if (flags.manuals === 'off') process.env.AGENT_B_MANUALS = 'off';
  const track = flags.track && flags.track !== 'auto' ? flags.track : undefined;
  // pnpm runs scripts from the package folder; resolve paths from where the command was typed.
  const here = (p: string) => resolve(process.env.INIT_CWD ?? process.cwd(), p);

  if (cmd === 'run') {
    if (!flags.in) throw new Error(`--in is required\n${USAGE}`);
    const caller = flags.offline ? undefined : defaultCaller();
    if (!caller) console.warn('No model available (offline or ANTHROPIC_API_KEY unset): every case will be escalated with an honest fallback answer.');
    let dirs = await findCaseDirs(here(flags.in));
    if (flags.cases) {
      const want = new Set(flags.cases.split(','));
      dirs = dirs.filter((d) => want.has(d.split(/[\\/]/).pop()!));
    }
    if (!dirs.length) throw new Error(`No case folders found under ${flags.in}`);
    const out = flags.out ? here(flags.out) : join(REPO, '.casework/agent-b/answers');
    await mkdir(out, { recursive: true });
    log(`agent-b: ${dirs.length} case(s) → ${out}`);
    const results = await runBatch(dirs, out, {
      caller,
      track,
      withhold: flags.withhold === 'outcomes' ? 'outcomes' : 'none',
      samples: num('samples', 3),
      concurrency: num('concurrency', 4),
      log,
    });
    const fallbacks = results.filter((r) => r.result.final.decidedBy === 'fallback').length;
    log(`done: ${results.length} answers written, ${fallbacks} fallback(s). Summary: ${join(out, 'SUMMARY.md')}`);
    return;
  }

  if (cmd === 'eval') {
    const caller = defaultCaller();
    if (!caller) throw new Error('eval needs ANTHROPIC_API_KEY (the agent and the judge both call the model).');
    const set = flags.set ?? 'all';
    let labels = [...(set !== 'property-cuts' ? await escalationLabels() : []), ...(set !== 'escalations' ? await propertyCutLabels() : [])];
    labels = spread(labels, flags.limit ? Number(flags.limit) : undefined);
    const out = flags.out ? here(flags.out) : join(REPO, `.casework/agent-b/eval/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`);
    log(`agent-b eval: ${labels.length} label(s) → ${out}`);
    await runEval(labels, out, { caller, track, samples: num('samples', 3), concurrency: num('concurrency', 4), log });
    log(`summary: ${join(out, 'SUMMARY.md')}`);
    return;
  }

  console.log(USAGE);
  process.exitCode = cmd ? 1 : 0;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
