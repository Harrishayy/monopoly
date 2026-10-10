#!/usr/bin/env -S npx tsx
import { mkdir, writeFile } from 'node:fs/promises';
import { isRunKind, RUN_MANIFEST_FILE, RunManifest, type RunKind } from '@casework/core';
import { join, resolve } from 'node:path';
import type { AgentId } from './agent';
import { findCaseDirs } from './b/ingest/casefile';
import { defaultCaller } from './b/llm/client';
import { runBench, summarise } from './bench/bench';
import { ExampleBank } from './bench/examples';
import { buildPerturbSuite, type Variant, VARIANTS } from './bench/perturb';
import { escalationLabels, runEval, spread } from './bench/judge';
import { cutsFor, type LabelSource, loadOutside, loadSplit, OUTSIDE_DIR, REPO } from './bench/labels';
import type { Split } from './bench/split';
import { getAgents } from './registry';
import { assessmentHint } from './hybrid';
import { cModels } from './c';

const USAGE = `agents answer --agent a|b|c|d --in <dir> [--out <dir>] [--track property] [--withhold none|outcomes] [--cases 001,002]
              [--examples all|dev|none] [--concurrency 4] [--offline] [--model claude-haiku-5-5]
agents bench  [--agent a,b,c,d] [--suite cuts|outside|perturb] [--variants clean,noise,…] [--split val|test|dev|all] [--labels both|cuts|holdout] [--limit N] [--examples dev|none] [--manuals off]
              [--concurrency 6] [--offline] [--model …] [--out <dir>]
              agent B stages (defaults chosen on val: 1 sample, no situate, no review): [--samples N] [--situate on] [--review on] [--hints a]  (a = agent A's rules read as advice)
              stage models: [--decide-model …] [--critic-model …]  (B: default --model; C: opus decides, sonnet reviews)
              agent C review: [--rounds 2] [--dispute escalate|gate]
agents judge  [--limit N] [--manuals off] [--out <dir>]      agent B on the other tracks' escalation examples
agents split                                                  print the fixed dev/val/test split
Every run takes --kind smoke|train|val|test|full|practice|reality|adhoc, --name "<label>", --note "<text>" (written to run.json).
EVAL_BACKEND=claude-code uses the logged-in Claude Code plan (claude -p) instead of ANTHROPIC_API_KEY.`;

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

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

/** run.json in each output folder says what the run was for; it is rewritten with finishedAt at the end. */
async function manifest(out: string, m: Omit<RunManifest, 'startedAt'> & { startedAt?: string }): Promise<() => Promise<void>> {
  const started = RunManifest.parse({ ...m, startedAt: m.startedAt ?? new Date().toISOString() });
  await mkdir(out, { recursive: true });
  await writeFile(join(out, RUN_MANIFEST_FILE), JSON.stringify(started, null, 1) + '\n');
  return () => writeFile(join(out, RUN_MANIFEST_FILE), JSON.stringify({ ...started, finishedAt: new Date().toISOString() }, null, 1) + '\n');
}

function kindOf(flag: string | undefined, dflt: RunKind): RunKind {
  if (flag && !isRunKind(flag)) throw new Error(`--kind must be one of smoke, train, val, test, full, practice, reality, adhoc`);
  return (flag as RunKind | undefined) ?? dflt;
}

const suffix = (name?: string) => (name ? `-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}` : '');

async function main() {
  const { cmd, flags } = args(process.argv.slice(2));
  const log = (l: string) => console.log(l);
  const num = (k: string, d: number) => (flags[k] ? Number(flags[k]) : d);
  // pnpm runs scripts from the package folder; resolve paths from where the command was typed.
  const here = (p: string) => resolve(process.env.INIT_CWD ?? process.cwd(), p);
  if (flags.manuals === 'off') process.env.AGENT_B_MANUALS = 'off';
  const offline = flags.offline === 'true';
  if (!offline && (cmd === 'answer' || cmd === 'bench') && !process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set: agents run without a model (A uses its rules playbook, B escalates with a fallback).');
  }

  /** Few-shot memory for agent B: which labelled sets it may draw on. */
  const bank = async (from: string | undefined, dflt: 'all' | 'dev' | 'none') => {
    const f = (from ?? dflt) as 'all' | 'dev' | 'none';
    if (f === 'none') return undefined;
    const b = await ExampleBank.build(f === 'all' ? 'all' : ['dev']);
    log(`few-shot memory: ${b.size} past moments from ${f === 'all' ? 'all labelled cases' : 'the dev split'}`);
    return b;
  };

  const bOptions = (examples?: ExampleBank) => ({
    examples: examples ? (c: Parameters<ExampleBank['render']>[0]) => examples.render(c) : undefined,
    samples: flags.samples ? Number(flags.samples) : undefined,
    situate: flags.situate ? flags.situate !== 'off' : undefined,
    review: flags.review ? flags.review !== 'off' : undefined,
    hints: flags.hints === 'a' ? assessmentHint : undefined,
  });
  const registry = (examples?: ExampleBank) => ({
    model: flags.model,
    decideModel: flags['decide-model'],
    criticModel: flags['critic-model'],
    b: bOptions(examples),
    c: { ...bOptions(examples), rounds: flags.rounds ? Number(flags.rounds) : undefined, onDispute: flags.dispute === 'gate' ? ('gate' as const) : undefined },
  });
  /** What run.json records as the model: one id, or each stage's for agent C. */
  const modelLabel = (ids: AgentId[]) => {
    const c = ids.includes('c') ? cModels({ read: flags.model, decide: flags['decide-model'], critic: flags['critic-model'] }) : undefined;
    const ab = process.env.MODEL_DECIDE;
    const cl = c && `c: read ${c.read}, decide ${c.decide}, review ${c.critic}`;
    return ids.every((i) => i === 'c') ? cl : [ab, cl].filter(Boolean).join('; ');
  };
  const usesBank = (ids: AgentId[]) => ids.includes('b') || ids.includes('c');

  if (cmd === 'answer') {
    if (!flags.in) throw new Error(`--in is required\n${USAGE}`);
    const id = (flags.agent ?? 'c') as AgentId;
    const examples = usesBank([id]) ? await bank(flags.examples, 'all') : undefined;
    const [agent] = getAgents([id], registry(examples));
    let dirs = await findCaseDirs(here(flags.in));
    if (flags.cases) {
      const want = new Set(flags.cases.split(','));
      dirs = dirs.filter((d) => want.has(d.split(/[\\/]/).pop()!));
    }
    if (!dirs.length) throw new Error(`No case folders found under ${flags.in}`);
    const out = flags.out ? here(flags.out) : join(REPO, `.casework/agents/answers-${id}${suffix(flags.name)}`);
    const withhold = flags.withhold === 'outcomes' ? 'outcomes' : 'none';
    const kind = kindOf(flags.kind, withhold === 'outcomes' ? 'practice' : /challeng/i.test(flags.in) ? 'reality' : 'adhoc');
    const finish = await manifest(out, { kind, name: flags.name, note: flags.note, command: 'answer', agent: id, track: flags.track ?? 'property', model: modelLabel([id]) });
    log(`${agent!.label}: ${dirs.length} case(s) → ${out}`);
    const res = await agent!.answer(dirs, out, { track: flags.track ?? 'property', withhold, offline, concurrency: num('concurrency', 4), log });
    await finish();
    log(`done: ${res.length} answers written.`);
    return;
  }

  if (cmd === 'bench') {
    const ids = (flags.agent ?? 'a,b').split(',') as AgentId[];
    if (flags.suite === 'outside') {
      // Our own stress cases: none of them are in the example data, so B may draw on every labelled example.
      const examples = usesBank(ids) ? await bank(flags.examples, 'all') : undefined;
      const agents = getAgents(ids, registry(examples));
      const labels = spread(await loadOutside(), flags.limit ? Number(flags.limit) : undefined);
      const categories = Object.fromEntries(labels.map((l) => [l.case, l.category ?? '']));
      const out = flags.out ? here(flags.out) : join(REPO, `.casework/agents/bench/outside-${ids.join('')}-${stamp()}${suffix(flags.name)}`);
      const finish = await manifest(out, { kind: kindOf(flags.kind, flags.limit ? 'smoke' : 'adhoc'), name: flags.name ?? 'outside suite', note: flags.note, command: 'bench', agent: ids.join(','), track: 'property', model: process.env.MODEL_DECIDE, split: 'outside' });
      log(`bench: agents ${ids.join(', ')} · outside suite · ${labels.length} cases · model ${process.env.MODEL_DECIDE} → ${out}`);
      const rows = await runBench(agents, labels, out, { caseRoot: OUTSIDE_DIR, withhold: 'none', concurrency: num('concurrency', 6), offline, log });
      const md = summarise(rows, 'Bench · outside suite', categories);
      await writeFile(join(out, 'SUMMARY.md'), md);
      await finish();
      log('\n' + md.split('\n## By expected action')[0]);
      return;
    }
    if (flags.suite === 'perturb') {
      // Real held-out moments (val + test by default), rewritten as damaged snapshots; labels stay the team's.
      const sets = (flags.split ?? 'val,test').split(',') as (Split | 'all')[];
      const base = spread((await Promise.all(sets.map((x) => cutsFor(x, (flags.labels ?? 'both') as LabelSource)))).flat(), flags.limit ? Number(flags.limit) : undefined);
      const variants = (flags.variants ? flags.variants.split(',') : [...VARIANTS]) as Variant[];
      const suiteRoot = join(REPO, '.casework/agents/perturb-suite');
      const labels = await buildPerturbSuite(base, variants, suiteRoot);
      // Examples come from dev only, so the scored moments never appear in the few-shot memory.
      const examples = usesBank(ids) ? await bank(flags.examples, 'dev') : undefined;
      const agents = getAgents(ids, registry(examples));
      const categories = Object.fromEntries(labels.map((l) => [l.case, l.variant]));
      const out = flags.out ? here(flags.out) : join(REPO, `.casework/agents/bench/perturb-${ids.join('')}-${stamp()}${suffix(flags.name)}`);
      const finish = await manifest(out, { kind: kindOf(flags.kind, flags.limit ? 'smoke' : 'test'), name: flags.name ?? 'perturbation suite', note: flags.note, command: 'bench', agent: ids.join(','), track: 'property', model: process.env.MODEL_DECIDE, split: `perturb:${sets.join('+')}` });
      log(`bench: agents ${ids.join(', ')} · perturbation suite · ${base.length} moments × ${variants.length} variants = ${labels.length} cases → ${out}`);
      const rows = await runBench(agents, labels, out, { caseRoot: suiteRoot, withhold: 'none', concurrency: num('concurrency', 8), offline, log });
      const md = summarise(rows, `Bench · perturbation suite (${sets.join(' + ')})`, categories);
      await writeFile(join(out, 'SUMMARY.md'), md);
      await finish();
      log('\n' + md.split('\n## Every case')[0]);
      return;
    }
    const split = (flags.split ?? 'val') as Split | 'all';
    // Evaluation never shows the agent examples from the set it is scored on.
    const examples = usesBank(ids) ? await bank(flags.examples, split === 'dev' || split === 'all' ? 'none' : 'dev') : undefined;
    const agents = getAgents(ids, registry(examples));
    const cuts = spread(await cutsFor(split, (flags.labels ?? 'both') as LabelSource), flags.limit ? Number(flags.limit) : undefined);
    const out = flags.out ? here(flags.out) : join(REPO, `.casework/agents/bench/${split}-${ids.join('')}-${stamp()}${suffix(flags.name)}`);
    const kind = kindOf(flags.kind, flags.limit ? 'smoke' : ({ dev: 'train', val: 'val', test: 'test', all: 'full' } as const)[split]);
    const finish = await manifest(out, { kind, name: flags.name, note: flags.note, command: 'bench', agent: ids.join(','), track: 'property', model: modelLabel(ids), split });
    log(`bench: agents ${ids.join(', ')} · split ${split} · ${cuts.length} cuts · model ${modelLabel(ids)}${offline ? ' (offline)' : ''} → ${out}`);
    const rows = await runBench(agents, cuts, out, { concurrency: num('concurrency', 6), offline, log });
    const md = summarise(rows, `Bench · property · split ${split}`);
    await writeFile(join(out, 'SUMMARY.md'), md);
    await finish();
    log('\n' + md.split('\n## By expected action')[0]);
    log(`summary: ${join(out, 'SUMMARY.md')}`);
    return;
  }

  if (cmd === 'judge') {
    const caller = defaultCaller();
    if (!caller) throw new Error('judge needs ANTHROPIC_API_KEY.');
    getAgents(['b'], { model: flags.model });
    const labels = spread(await escalationLabels(), flags.limit ? Number(flags.limit) : undefined);
    const out = flags.out ? here(flags.out) : join(REPO, `.casework/agents/judge-${stamp()}${suffix(flags.name)}`);
    const finish = await manifest(out, { kind: kindOf(flags.kind, flags.limit ? 'smoke' : 'full'), name: flags.name, note: flags.note, command: 'judge', agent: 'b', model: process.env.MODEL_DECIDE });
    log(`judge: agent B on ${labels.length} escalation examples → ${out}`);
    await runEval(labels, out, { caller, concurrency: num('concurrency', 4), log });
    await finish();
    log(`summary: ${join(out, 'SUMMARY.md')}`);
    return;
  }

  if (cmd === 'split') {
    const sp = await loadSplit();
    for (const s of ['dev', 'val', 'test'] as const) log(`${s.padEnd(4)} ${Object.keys(sp).filter((k) => sp[k] === s).join(' ')}`);
    return;
  }

  console.log(USAGE);
  process.exitCode = cmd ? 1 : 0;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
