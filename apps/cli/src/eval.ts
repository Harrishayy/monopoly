/**
 * Scores the agent on labelled cut points from the example cases.
 *   pnpm eval --track property                   # model if ANTHROPIC_API_KEY is set, else rules only
 *   pnpm eval --track property --offline         # rules-only playbook, no network
 *   pnpm eval --track property --only 007,011 --limit 20
 *   pnpm eval --track property --resume .casework/eval   # keep model decisions, re-run the rest
 * Each cut hides every event from `cutBefore` on (and the Overview/Outcome), runs the case as of
 * `asOf`, and checks the chosen action against `accept` and `prohibit`.
 * Writes <out>/results.jsonl, <out>/SUMMARY.md and <out>/run.json (--kind smoke|train|val|test|full, --name, --note).
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { guessRunKind, RunEvent, runView, type Case } from '@casework/core';
import { runCase, type EmitInput } from '@casework/core/agent';
import { getPack } from '@casework/tracks';
import { manifestOptions, runKind, writeManifest } from './manifest';

interface Cut {
  case: string;
  cutBefore: number;
  asOf: string;
  kind: 'determined' | 'judgement';
  situation: string;
  accept: string[];
  prohibit: string[];
  boundaries?: string[];
  happened?: string;
  note?: string;
}

interface Result {
  case: string;
  cutBefore: number;
  kind: Cut['kind'];
  action: string;
  decidedBy: string;
  pass: boolean;
  /** Missed, but reached a recipient the label accepts (e.g. tenant.ask where tenant.chase was wanted). */
  near: boolean;
  prohibited: boolean;
  accept: string[];
  stage?: string;
  blocked: string[];
  reason: string;
  /** The decision rationale, which carries the model error when the playbook took over. */
  rationale: string;
}

const root = resolve(import.meta.dirname, '../../..');
const { values } = parseArgs({
  options: {
    track: { type: 'string', default: process.env.TRACK ?? 'property' },
    in: { type: 'string', default: 'data/public' },
    cuts: { type: 'string' },
    out: { type: 'string', default: '.casework/eval' },
    offline: { type: 'boolean', default: false },
    only: { type: 'string' },
    limit: { type: 'string' },
    concurrency: { type: 'string', default: process.env.REALITY_CONCURRENCY ?? '6' },
    resume: { type: 'string' },
    ...manifestOptions,
  },
});

const pack = getPack(values.track!);
const cutsPath = resolve(root, values.cuts ?? `packages/tracks/src/${pack.id}/eval/cuts.json`);
const outDir = resolve(root, values.out!);

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

async function runCut(c: Case, cut: Cut): Promise<Result> {
  const runId = randomUUID();
  const events: RunEvent[] = [];
  let seq = 0;
  const emit = (e: EmitInput) => events.push(RunEvent.parse({ ...e, runId, seq: seq++, at: new Date().toISOString() }));
  await runCase(cutCase(c, cut.cutBefore), pack, {
    runId,
    autonomy: pack.autonomy,
    emit,
    asOf: cut.asOf,
    ...(values.offline ? { model: null } : {}),
  });
  const v = runView(events);
  const action = v.next?.action ?? 'none';
  return {
    case: cut.case,
    cutBefore: cut.cutBefore,
    kind: cut.kind,
    action,
    decidedBy: v.next?.decidedBy ?? 'none',
    pass: cut.accept.includes(action),
    near: !cut.accept.includes(action) && !action.startsWith('case.') && cut.accept.some((a) => a.split('.')[0] === action.split('.')[0]),
    prohibited: cut.prohibit.includes(action),
    accept: cut.accept,
    stage: v.assessment?.stage,
    blocked: v.blocked.map((b) => b.action),
    reason: v.next?.reason ?? v.summary ?? '',
    rationale: v.decisions.at(-1)?.rationale ?? '',
  };
}

async function main() {
  if (!existsSync(cutsPath)) {
    console.error(`No cuts file at ${cutsPath}.`);
    process.exit(1);
  }
  let cuts: Cut[] = JSON.parse(await readFile(cutsPath, 'utf8'));
  if (values.only) {
    const only = new Set(values.only.split(',').map((s) => s.trim().padStart(3, '0')));
    cuts = cuts.filter((c) => only.has(c.case));
  }
  if (values.limit) cuts = cuts.slice(0, Number(values.limit));

  const cases = new Map((await pack.loadCases(resolve(root, values.in!), { withhold: 'outcomes' })).map((c) => [c.ref.split('-').at(-1)!, c]));
  const mode = values.offline || !process.env.ANTHROPIC_API_KEY ? 'rules-only playbook' : `model ${process.env.MODEL_DECIDE ?? 'default'}`;
  const manifest = {
    kind: runKind(values.kind, values.limit || values.only ? 'smoke' : values.cuts ? guessRunKind(values.cuts) : 'full'),
    name: values.name,
    note: values.note,
    command: 'eval',
    agent: 'a',
    track: pack.id,
    model: values.offline || !process.env.ANTHROPIC_API_KEY ? 'rules' : process.env.MODEL_DECIDE,
    startedAt: new Date().toISOString(),
  };
  await writeManifest(outDir, manifest);
  console.log(`Scoring ${cuts.length} cuts on ${pack.label} with the ${mode}…`);

  const results: Result[] = [];
  if (values.resume) {
    // Keep cuts the model already decided; re-run the ones that fell back to the playbook.
    const prior = (await readFile(join(resolve(root, values.resume), 'results.jsonl'), 'utf8').catch(() => ''))
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Result)
      .filter((r) => r.decidedBy === 'model');
    const key = (r: { case: string; cutBefore: number }) => `${r.case}@${r.cutBefore}`;
    const kept = new Set(prior.map(key));
    results.push(...prior.filter((r) => cuts.some((c) => key(c) === key(r))));
    cuts = cuts.filter((c) => !kept.has(key(c)));
    console.log(`Resuming: kept ${results.length} model decisions, re-running ${cuts.length} cuts.`);
  }
  let next = 0;
  const limit = Math.max(1, Number(values.concurrency));
  await Promise.all(
    Array.from({ length: Math.min(limit, cuts.length) }, async () => {
      while (next < cuts.length) {
        const cut = cuts[next++]!;
        const c = cases.get(cut.case);
        if (!c) {
          console.warn(`Case ${cut.case} not found; skipped.`);
          continue;
        }
        const r = await runCut(c, cut);
        results.push(r);
        console.log(`${r.pass ? 'PASS' : r.prohibited ? 'BAD ' : 'MISS'} ${cut.case}@${cut.cutBefore} ${r.action}${r.pass ? '' : ` (accept: ${cut.accept.join(' | ')})`}`);
      }
    }),
  );
  results.sort((a, b) => a.case.localeCompare(b.case) || a.cutBefore - b.cutBefore);

  const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '–');
  const row = (label: string, rs: Result[]) =>
    `| ${label} | ${rs.length} | ${pct(rs.filter((r) => r.pass).length, rs.length)} | ${pct(rs.filter((r) => r.near).length, rs.length)} | ${pct(rs.filter((r) => r.prohibited).length, rs.length)} |`;
  const byAction = new Map<string, Result[]>();
  for (const r of results) for (const a of r.accept) byAction.set(a, [...(byAction.get(a) ?? []), r]);

  const summary = `# Eval · ${pack.label} · ${mode}

${new Date().toISOString()} · cuts from \`${cutsPath.replace(`${root}/`, '')}\`

| Cuts | n | Accepted action | Near miss (right recipient) | Prohibited action |
|---|---|---|---|---|
${row('All', results)}
${row('Determined', results.filter((r) => r.kind === 'determined'))}
${row('Judgement', results.filter((r) => r.kind === 'judgement'))}

## By expected action (a cut counts once for each action it accepts)

| Expected | n | Agent chose an accepted action |
|---|---|---|
${[...byAction].sort((a, b) => b[1].length - a[1].length).map(([a, rs]) => `| \`${a}\` | ${rs.length} | ${pct(rs.filter((r) => r.pass).length, rs.length)} |`).join('\n')}

## Misses

| Cut | Stage (rules) | Chose | Accepted |
|---|---|---|---|
${results
  .filter((r) => !r.pass)
  .map((r) => `| ${r.case}@${r.cutBefore}${r.prohibited ? ' ⚠' : ''} | ${r.stage ?? ''} | \`${r.action}\` | ${r.accept.map((a) => `\`${a}\``).join(' ')} |`)
  .join('\n')}
`;

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'results.jsonl'), results.map((r) => JSON.stringify(r)).join('\n') + '\n');
  await writeFile(join(outDir, 'SUMMARY.md'), summary);
  await writeManifest(outDir, { ...manifest, finishedAt: new Date().toISOString() });
  console.log(`\n${row('All', results)}\n${row('Determined', results.filter((r) => r.kind === 'determined'))}\n${row('Judgement', results.filter((r) => r.kind === 'judgement'))}`);
  console.log(`Wrote ${join(outDir, 'SUMMARY.md').replace(`${root}/`, '')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
