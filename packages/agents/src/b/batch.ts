import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { slug } from './ingest/markdown';
import { renderAnswer, renderReasoning, traceLines } from './output/render';
import { runCase, type RunOptions } from './pipeline';
import type { CaseResult } from './types';

/** Run `fn` over `items` with at most `limit` in flight, keeping order. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

/**
 * Output folder name per case: the case number when every case comes from one folder ("007" → "7"),
 * else "<parent>-<name>" so cases from several tracks do not collide.
 */
export function answerNames(dirs: string[]): string[] {
  const parents = new Set(dirs.map((d) => dirname(d)));
  const single = parents.size === 1;
  const names = dirs.map((d, i) => {
    const n = basename(d);
    const num = /^\d+$/.test(n) ? String(Number(n)) : undefined;
    if (single) return num ?? (slug(n) || String(i + 1));
    return `${slug(basename(dirname(d)))}-${num ?? slug(n)}`;
  });
  // Guarantee uniqueness.
  const seen = new Map<string, number>();
  return names.map((n) => {
    const k = seen.get(n) ?? 0;
    seen.set(n, k + 1);
    return k ? `${n}-${k + 1}` : n;
  });
}

export async function writeResult(outDir: string, name: string, r: CaseResult): Promise<void> {
  const dir = join(outDir, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'ANSWER.md'), renderAnswer(r));
  await writeFile(join(dir, 'REASONING.md'), renderReasoning(r));
  await writeFile(join(dir, 'trace.jsonl'), traceLines(r));
}

export interface BatchOptions extends RunOptions {
  concurrency?: number;
}

export async function runBatch(dirs: string[], outDir: string, opts: BatchOptions = {}): Promise<{ name: string; result: CaseResult }[]> {
  const names = answerNames(dirs);
  const log = opts.log ?? (() => {});
  const results = await pool(dirs, opts.concurrency ?? 4, async (dir, i) => {
    const result = await runCase(dir, opts);
    try {
      await writeResult(outDir, names[i]!, result);
    } catch (e) {
      log(`${names[i]}: could not write answer: ${e instanceof Error ? e.message : String(e)}`);
    }
    log(`[${i + 1}/${dirs.length}] ${names[i]} done in ${(result.ms / 1000).toFixed(0)}s`);
    return { name: names[i]!, result };
  });
  await writeFile(join(outDir, 'SUMMARY.md'), renderSummary(results));
  return results;
}

export function renderSummary(results: { name: string; result: CaseResult }[]): string {
  const counts = new Map<string, number>();
  for (const { result } of results) counts.set(result.final.action, (counts.get(result.final.action) ?? 0) + 1);
  const failed = results.filter((r) => r.result.final.decidedBy === 'fallback').length;
  const out = [
    '# Agent B run summary',
    '',
    `${results.length} cases · ${[...counts].map(([a, n]) => `${a}: ${n}`).join(' · ')} · fallback answers: ${failed}`,
    '',
    '| Answer | Case | Action | Recipient | Confidence | Decided by |',
    '|---|---|---|---|---|---|',
    ...results.map(({ name, result: r }) => `| [${name}](${name}/ANSWER.md) | ${r.caseFile.name}: ${r.caseFile.title.replace(/\|/g, '/')} | \`${r.final.action}\` | ${r.final.recipient.replace(/\|/g, '/') || '—'} | ${Math.round(r.final.confidence * 100)}% | ${r.final.decidedBy} |`),
  ];
  return out.join('\n') + '\n';
}
