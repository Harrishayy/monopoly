import 'server-only';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RunEvent, runView, type Case } from '@casework/core';
import { getPack } from '@casework/tracks';
import type { BatchCase, BatchView, EvalRow, EvalScore, EvalView, RunMode, RunTag } from '@/lib/api-types';
import { getCaseAt, listCases, loadCases } from './cases';
import { ACTIVE_TRACK, REPO_ROOT } from './config';
import { cliEvalResults, labelsFor } from './labels';
import { readRunTag } from './manifest';
import { getRun, pool, startRun } from './runs';

/** Case folders a batch may read, and output folders the CLI writes. Paths are repo-relative. */
export const BATCH_INPUTS = ['data/challenges', 'data/public'] as const;
export const ANSWER_DIRS = ['ANSWERS', '.casework/practice'] as const;

interface Store {
  evals: Map<string, EvalView>;
  batches: Map<string, BatchView & { abort: AbortController }>;
}
const g = globalThis as unknown as { __caseworkBatches?: Store };
const store: Store = (g.__caseworkBatches ??= { evals: new Map(), batches: new Map() });

const concurrency = () => Math.max(1, Number(process.env.REALITY_CONCURRENCY ?? 6));
const num = (ref: string) => ref.split('-').at(-1) ?? ref;

// ---------------------------------------------------------------- eval

export function score(rows: EvalRow[]): EvalView['score'] {
  const s = (rs: EvalRow[]): EvalScore => ({ n: rs.length, accepted: rs.filter((r) => r.pass).length, prohibited: rs.filter((r) => r.prohibited).length });
  return { all: s(rows), determined: s(rows.filter((r) => r.kind === 'determined')), judgement: s(rows.filter((r) => r.kind === 'judgement')) };
}

/** Scores the agent on every labelled cut, the same way `pnpm eval` does, with runs visible in the UI. */
export async function startEval(opts: { mode: RunMode; only?: string[]; track?: string; tag?: Partial<RunTag> }): Promise<string> {
  const track = opts.track ?? ACTIVE_TRACK;
  const pack = getPack(track);
  let labels = await labelsFor(track);
  if (opts.only?.length) labels = labels.filter((l) => opts.only!.includes(l.case));
  const refs = new Map((await listCases(track)).map((c) => [num(c.ref), c.ref]));
  const id = randomUUID();
  const tag: RunTag = { kind: opts.tag?.kind ?? (opts.only?.length ? 'smoke' : 'full'), name: opts.tag?.name || undefined, note: opts.tag?.note || undefined };
  const view: EvalView = { id, ...tag, source: 'ui', mode: opts.mode, startedAt: new Date().toISOString(), total: labels.length, done: false, rows: [], score: score([]) };
  store.evals.set(id, view);

  void pool(labels, concurrency(), async (label) => {
    const ref = refs.get(label.case);
    const at = ref ? await getCaseAt(ref, label.cutBefore, track) : undefined;
    if (!ref || !at) return;
    const runId = startRun(at.c, pack, { autonomy: pack.autonomy, mode: opts.mode, cut: { cutBefore: label.cutBefore, asOf: label.asOf }, groupId: id, tag });
    await getRun(runId)!.done;
    const v = getRun(runId)!.view;
    const action = v.next?.action ?? 'none';
    view.rows = [
      ...view.rows,
      {
        case: label.case,
        cutBefore: label.cutBefore,
        kind: label.kind,
        action,
        decidedBy: v.next?.decidedBy ?? 'none',
        pass: label.accept.includes(action),
        prohibited: label.prohibit.includes(action),
        accept: label.accept,
        stage: v.assessment?.stage,
        blocked: v.blocked.map((b) => b.action),
        reason: v.next?.reason ?? v.summary ?? '',
        runId,
      },
    ].sort((a, b) => a.case.localeCompare(b.case) || a.cutBefore - b.cutBefore);
    view.score = score(view.rows);
  }).finally(() => {
    view.done = true;
  });
  return id;
}

export async function listEvals(): Promise<EvalView[]> {
  const out = [...store.evals.values()].sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
  const cli = await cliEvalResults();
  if (cli) out.push({ id: 'cli', ...(await readRunTag(join(REPO_ROOT, '.casework/eval'), 'eval')), source: 'cli', mode: cli.mode, startedAt: cli.at, total: cli.rows.length, done: true, rows: cli.rows, score: score(cli.rows) });
  return out;
}

export const getEval = (id: string) => store.evals.get(id);

// ---------------------------------------------------------------- reality batches

export async function startBatch(opts: { dir: (typeof BATCH_INPUTS)[number]; mode: RunMode; withhold: 'none' | 'outcomes'; track?: string; tag?: Partial<RunTag> }): Promise<string | { error: string }> {
  const track = opts.track ?? ACTIVE_TRACK;
  const pack = getPack(track);
  let cases: Case[];
  try {
    cases = await loadCases(track, resolve(REPO_ROOT, opts.dir), opts.withhold);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  if (!cases.length) return { error: `No ${pack.label} cases in ${opts.dir}. See data/README.md for the expected layout.` };
  const id = randomUUID();
  const abort = new AbortController();
  const tag: RunTag = {
    kind: opts.tag?.kind ?? (opts.withhold === 'outcomes' ? 'practice' : opts.dir === 'data/challenges' ? 'reality' : 'adhoc'),
    name: opts.tag?.name || undefined,
    note: opts.tag?.note || undefined,
  };
  const batch: BatchView & { abort: AbortController } = {
    id,
    ...tag,
    source: 'ui',
    dir: opts.dir,
    mode: opts.mode,
    startedAt: new Date().toISOString(),
    concurrency: concurrency(),
    state: 'running',
    cases: cases.map((c, i) => ({ ref: c.ref, n: Number(num(c.ref)) || i + 1, status: 'pending' })),
    abort,
  };
  store.batches.set(id, batch);
  void pool(
    cases,
    batch.concurrency,
    async (c, i) => {
      const row = batch.cases[i]!;
      row.status = 'running';
      row.runId = startRun(c, pack, { autonomy: pack.autonomy, mode: opts.mode, groupId: id, tag, signal: abort.signal });
      const rec = getRun(row.runId)!;
      await rec.done;
      row.status = 'done';
      row.outcome = rec.view.outcome;
      row.error = rec.error;
    },
    abort.signal,
  ).finally(() => {
    batch.state = 'done';
    batch.finishedAt = new Date().toISOString();
  });
  return id;
}

export function cancelBatch(id: string) {
  const b = store.batches.get(id);
  if (!b || b.state !== 'running') return false;
  b.state = 'cancelling';
  b.abort.abort();
  return true;
}

const publicBatch = ({ abort: _, ...b }: BatchView & { abort: AbortController }): BatchView => b;

export const getBatch = (id: string) => {
  const b = store.batches.get(id);
  return b ? publicBatch(b) : undefined;
};

/** Batches started here, then each folder the CLI has written (ANSWERS/, practice runs). */
export async function listBatches(): Promise<BatchView[]> {
  const ui = [...store.batches.values()].map(publicBatch).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
  const cli = (await Promise.all(ANSWER_DIRS.map(readAnswerDir))).filter((b): b is BatchView => !!b);
  return [...ui, ...cli];
}

async function readAnswerDir(dir: (typeof ANSWER_DIRS)[number]): Promise<BatchView | undefined> {
  const abs = join(REPO_ROOT, dir);
  if (!existsSync(abs)) return undefined;
  const names = (await readdir(abs)).filter((n) => /^\d+$/.test(n)).sort((a, b) => Number(a) - Number(b));
  const cases: BatchCase[] = [];
  for (const n of names) {
    const trace = await readFile(join(abs, n, 'trace.jsonl'), 'utf8').catch(() => '');
    const events = trace
      .split('\n')
      .filter(Boolean)
      .flatMap((l) => {
        const p = RunEvent.safeParse(JSON.parse(l));
        return p.success ? [p.data] : [];
      });
    const v = runView(events);
    cases.push({ ref: v.caseRef || `#${n}`, n: Number(n), status: 'done', outcome: v.outcome, answerPath: `${dir}/${n}` });
  }
  if (!cases.length) return undefined;
  const { manifest, ...tag } = await readRunTag(abs, dir.split('/').at(-1)!);
  return { id: `cli:${dir}`, ...tag, startedAt: manifest?.startedAt, finishedAt: manifest?.finishedAt, source: 'cli', dir, mode: 'cli', concurrency: 0, state: 'done', cases };
}

/** Reads ANSWER.md, REASONING.md or trace.jsonl from a folder the CLI or an agent's eval wrote. */
export async function readAnswerFile(path: string): Promise<string | undefined> {
  const ok =
    /^(ANSWERS|\.casework\/practice)\/\d+\/(ANSWER\.md|REASONING\.md|trace\.jsonl)$/.test(path) ||
    // Agent B's eval answers, for the agents comparison page.
    /^\.casework\/agent-b\/[\w-]+(\/[\w-]+)?\/answers\/[\w@-]+\/(ANSWER\.md|REASONING\.md|trace\.jsonl)$/.test(path);
  if (!ok || path.split('/').includes('..')) return undefined;
  return readFile(join(REPO_ROOT, path), 'utf8').catch(() => undefined);
}
