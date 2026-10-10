import { z } from 'zod';

/**
 * What a run was for, so results can be kept apart: a quick smoke check is not a score,
 * and a score on the dev split is not a held-out one.
 */
export const RUN_KINDS = ['smoke', 'train', 'val', 'test', 'full', 'practice', 'reality', 'adhoc'] as const;
export const RunKind = z.enum(RUN_KINDS);
export type RunKind = z.infer<typeof RunKind>;

export const RUN_KIND_META: Record<RunKind, { label: string; description: string }> = {
  smoke: { label: 'Smoke', description: 'A few cases to check the pipeline works end to end' },
  train: { label: 'Train / dev', description: 'The dev split, the cases tuned against' },
  val: { label: 'Validation', description: 'The val split, for choosing between versions' },
  test: { label: 'Test', description: 'The held-out test split, scored rarely' },
  full: { label: 'Full', description: 'Every labelled cut or every case' },
  practice: { label: 'Practice', description: 'Example cases run unattended with outcomes hidden' },
  reality: { label: 'Reality Test', description: 'The unseen Reality Test cases' },
  adhoc: { label: 'Ad hoc', description: 'Anything else' },
};

/** Written as run.json into every run's output folder. */
export const RUN_MANIFEST_FILE = 'run.json';
export const RunManifest = z.object({
  kind: RunKind,
  /** Short label chosen by whoever started it, e.g. "haiku prompt v3". */
  name: z.string().optional(),
  note: z.string().optional(),
  /** The command that wrote the folder: reality, eval, bench, answer, judge. */
  command: z.string(),
  agent: z.string().optional(),
  track: z.string().optional(),
  model: z.string().optional(),
  split: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});
export type RunManifest = z.infer<typeof RunManifest>;

/** For folders written before run.json existed: read the kind from the folder name. */
export function guessRunKind(name: string): RunKind {
  const n = name.toLowerCase();
  if (/smoke|debug/.test(n)) return 'smoke';
  if (/^answers\b|challenge|reality/.test(n)) return 'reality';
  if (/practice/.test(n)) return 'practice';
  if (/holdout|(^|[^a-z])test([^a-z]|$)/.test(n)) return 'test';
  if (/(^|[^a-z])val([^a-z]|$)/.test(n)) return 'val';
  if (/(^|[^a-z])(dev|train)([^a-z]|$)/.test(n)) return 'train';
  if (/(^|[^a-z])(all|full)([^a-z]|$)|^eval/.test(n)) return 'full';
  return 'adhoc';
}

export const isRunKind = (s: string | undefined): s is RunKind => !!s && (RUN_KINDS as readonly string[]).includes(s);
