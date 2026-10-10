import 'server-only';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CutLabel, EvalRow } from '@/lib/api-types';
import { REPO_ROOT } from './config';

/** Labelled cut points live with each pack: packages/tracks/src/<track>/eval/cuts.json. */
export async function labelsFor(track: string): Promise<CutLabel[]> {
  const path = join(REPO_ROOT, 'packages/tracks/src', track, 'eval/cuts.json');
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(await readFile(path, 'utf8')) as CutLabel[];
  } catch {
    return [];
  }
}

/** Results written by `pnpm eval` (apps/cli/src/eval.ts). */
export async function cliEvalResults(): Promise<{ rows: EvalRow[]; mode: string; at?: string } | undefined> {
  const dir = join(REPO_ROOT, '.casework/eval');
  const path = join(dir, 'results.jsonl');
  if (!existsSync(path)) return undefined;
  const rows = (await readFile(path, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as EvalRow];
      } catch {
        return [];
      }
    });
  const summary = await readFile(join(dir, 'SUMMARY.md'), 'utf8').catch(() => '');
  const mode = summary.match(/^# Eval · .+ · (.+)$/m)?.[1] ?? 'cli';
  const at = summary.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/m)?.[1];
  return { rows, mode, at };
}
