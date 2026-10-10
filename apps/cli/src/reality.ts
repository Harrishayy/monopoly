/**
 * Reality Test runner. Runs every case in --in unattended and writes ANSWERS/<n>/.
 *   pnpm reality --track property --in data/challenges --out ANSWERS
 * <n> is the supplied case number (folder 007 → ANSWERS/7).
 * Practice on the public examples with outcomes hidden:
 *   pnpm reality --in data/public --out .casework/practice --withhold outcomes
 * Each case's folder is written as soon as it finishes, so a crash keeps finished work.
 * Never hand-edit the output; fix the system and re-run.
 * --kind (smoke, practice, reality, …), --name and --note go into <out>/run.json for the UI.
 * --agent a|b|d picks the engine (default ENGINE, else d). It is the same engine the live product runs.
 */
import { cp, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { Case } from '@casework/core';
import { executeCase } from '@casework/core/agent';
import { findCaseDirs, getEngine } from '@casework/agents';
import { getPack } from '@casework/tracks';
import { manifestOptions, runKind, writeManifest } from './manifest';

const root = resolve(import.meta.dirname, '../../..');
const { values } = parseArgs({
  options: {
    track: { type: 'string', default: process.env.TRACK ?? 'property' },
    in: { type: 'string', default: 'data/challenges' },
    out: { type: 'string', default: 'ANSWERS' },
    withhold: { type: 'string', default: 'none' },
    concurrency: { type: 'string', default: process.env.REALITY_CONCURRENCY ?? '6' },
    agent: { type: 'string', default: process.env.ENGINE ?? 'd' },
    ...manifestOptions,
  },
});

const pack = getPack(values.track!);
const inDir = resolve(root, values.in!);
const outDir = resolve(root, values.out!);
const limit = Math.max(1, Number(values.concurrency));
const engine = getEngine(values.agent as Parameters<typeof getEngine>[0]);
/** Case number → folder, for engines that read the supplied files directly. */
let folders = new Map<number, string>();
let dirs: string[] = [];

async function runOne(c: Case, n: number) {
  // executeCase captures runner errors and renders the answers; the engine decides. Agent A is
  // executeCase's default runner, so it runs exactly as the eval harness grades it.
  const { events, view, answer, reasoning, error } = await executeCase(c, pack, {
    n,
    ...(engine.id === 'a'
      ? {}
      : {
          // executeCase ignores the returned outcome (it reads the events), so the cast is only for the type.
          runCaseImpl: async (cc, pk, o) => {
            await engine.run(cc, pk, { runId: o.runId, autonomy: o.autonomy, emit: o.emit, signal: o.signal, dir: folders.get(n) });
            return 'resolved' as const;
          },
        }),
  });
  const dir = join(outDir, String(n));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'ANSWER.md'), answer);
  await writeFile(join(dir, 'REASONING.md'), reasoning);
  await writeFile(join(dir, 'trace.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return { n, ref: c.ref, outcome: view.outcome ?? 'incomplete', next: view.next?.action ?? 'none', decidedBy: view.next?.decidedBy ?? 'none', error };
}

async function main() {
  const withhold = values.withhold === 'outcomes' ? 'outcomes' : 'none';
  const loaded = await pack.loadCases(inDir, { withhold }).catch((err: unknown) => {
    console.warn(`The ${pack.label} loader failed (${err instanceof Error ? err.message : String(err)}); every case goes to the fallback reader.`);
    return [] as Case[];
  });
  // Every case folder, whatever it is named ("007", "PM-001", "case_1"). Engines that read folders get the
  // full list; the number → folder map only serves per-case runs and keys on the folder's trailing digits.
  dirs = await findCaseDirs(inDir);
  folders = new Map(dirs.flatMap((d) => {
    const n = trailingNumber(basename(d));
    return n === undefined ? [] : [[n, d] as const];
  }));
  if (!loaded.length && !dirs.length) {
    console.error(`No ${pack.label} cases found in ${inDir}. Nothing written. See data/README.md for the expected layout.`);
    process.exit(1);
  }
  // Coverage guard: a folder the pack loader skipped, or read with no history (e.g. events.json,
  // timeline.md), would otherwise get no answer or a wrong one. Agent B's reader handles those
  // layouts, so it answers them. Nothing is dropped silently.
  const hasHistory = (c: Case) => c.sources.some((s) => /:event-\d+$/.test(s.id));
  const byNumber = new Map(loaded.map((c, i) => [caseNumber(c, i), c] as const));
  const fallback = engine.answers
    ? []
    : dirs.filter((d) => {
        const n = trailingNumber(basename(d));
        const c = n === undefined ? undefined : byNumber.get(n);
        return !c || !hasHistory(c);
      });
  const fallbackNumbers = new Set(fallback.map((d) => trailingNumber(basename(d))).filter((n) => n !== undefined));
  const cases = loaded.filter((c, i) => !fallbackNumbers.has(caseNumber(c, i)));
  const manifest = {
    kind: runKind(values.kind, withhold === 'outcomes' ? 'practice' : /challenge/i.test(values.in!) ? 'reality' : 'adhoc'),
    name: values.name,
    note: values.note,
    command: 'reality',
    agent: engine.id,
    track: pack.id,
    model: process.env.MODEL_DECIDE,
    startedAt: new Date().toISOString(),
  };
  await writeManifest(outDir, manifest);
  if (engine.answers) {
    // The engine writes its own ANSWER.md / REASONING.md / trace.jsonl per case (same decisions, richer render).
    console.log(`${engine.label}: writing ${dirs.length} answers with concurrency ${limit}…`);
    const res = await engine.answers(dirs, outDir, { track: pack.id, withhold, concurrency: limit, log: (l) => console.log(l) });
    await writeManifest(outDir, { ...manifest, finishedAt: new Date().toISOString() });
    console.table(res.map(({ name, action, decidedBy, failures }) => ({ n: name, next: action, decidedBy, failures: failures.length })));
    return;
  }
  console.log(`${engine.label}: running ${cases.length} ${pack.vocabulary.cases.toLowerCase()} with concurrency ${limit}…`);
  const results: Awaited<ReturnType<typeof runOne>>[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, cases.length) }, async () => {
      while (next < cases.length) {
        const i = next++;
        const r = await runOne(cases[i]!, caseNumber(cases[i]!, i));
        results.push(r);
        console.log(`#${r.n} ${r.ref} → ${r.outcome} · ${r.next} (${r.decidedBy})${r.error ? ` (${r.error})` : ''}`);
      }
    }),
  );
  if (fallback.length) {
    for (const d of fallback) console.warn(`fallback to B: ${basename(d)} (${byNumber.has(trailingNumber(basename(d)) ?? -1) ? 'loaded with no history' : 'not readable by the ' + pack.label + ' loader'})`);
    const b = getEngine('b');
    const tmp = await mkdtemp(join(tmpdir(), 'casework-fallback-'));
    const res = await b.answers!(fallback, tmp, { track: pack.id, withhold, concurrency: limit, log: (l) => console.log(l) });
    // Same numbering as every other answer: ANSWERS/<trailing number of the folder>.
    for (const [i, r] of res.entries()) {
      const n = trailingNumber(r.name) ?? trailingNumber(basename(fallback[i] ?? '')) ?? undefined;
      const dest = join(outDir, n === undefined ? r.name : String(n));
      await rm(dest, { recursive: true, force: true });
      await rename(join(tmp, r.name), dest).catch(async () => {
        await cp(join(tmp, r.name), dest, { recursive: true });
      });
      results.push({ n: n ?? -1, ref: basename(fallback[i] ?? r.name), outcome: 'agent B', next: r.action, decidedBy: r.decidedBy, error: r.failures.join('; ') || undefined });
      console.log(`#${n ?? r.name} ${basename(fallback[i] ?? r.name)} → ${r.action} (agent B, ${r.decidedBy})`);
    }
    await rm(tmp, { recursive: true, force: true });
  }
  results.sort((a, b) => a.n - b.n);
  await writeManifest(outDir, { ...manifest, finishedAt: new Date().toISOString() });
  console.table(results.map(({ n, ref, outcome, next, decidedBy }) => ({ n, ref, outcome, next, decidedBy })));
  const answered = new Set(results.map((r) => r.n));
  const missing = dirs.filter((d) => !answered.has(trailingNumber(basename(d)) ?? -2));
  if (missing.length) console.warn(`No answer written for: ${missing.map((d) => basename(d)).join(', ')}`);
  const fallbacks = results.filter((r) => r.decidedBy !== 'model').length;
  if (fallbacks) console.warn(`${fallbacks} of ${results.length} cases were decided by the rules-only playbook (model unavailable or failed). Re-run them once the model is reachable.`);
}

const trailingNumber = (name: string) => {
  const m = name.match(/(\d+)$/);
  return m ? Number(m[1]) : undefined;
};

/** Case refs end in the supplied folder number (PM-007 → 7); fall back to position. */
function caseNumber(c: Case, i: number) {
  const m = c.ref.match(/(\d+)$/);
  return m ? Number(m[1]) : i + 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
