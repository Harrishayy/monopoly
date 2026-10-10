import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { Split } from './split';

export const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const PROPERTY_DIR = join(REPO, 'data/public/Property Management');
export const CUTS_FILE = join(REPO, 'packages/tracks/src/property/eval/cuts.json');
/** More cut points, each at least two events away from every cuts.json cut. */
export const HOLDOUT_FILE = join(REPO, 'packages/tracks/src/property/eval/holdout.json');
export const SPLIT_FILE = join(dirname(fileURLToPath(import.meta.url)), 'split.json');

export const Cut = z.object({
  case: z.string(),
  cutBefore: z.number(),
  asOf: z.string().optional(),
  kind: z.enum(['determined', 'judgement']).default('judgement'),
  situation: z.string().default(''),
  accept: z.array(z.string()),
  prohibit: z.array(z.string()).default([]),
  boundaries: z.array(z.string()).default([]),
  happened: z.string().default(''),
  note: z.string().optional(),
});
export type Cut = z.infer<typeof Cut>;

export type LabelSource = 'cuts' | 'holdout' | 'both';

async function readCuts(file: string): Promise<Cut[]> {
  if (!existsSync(file)) return [];
  return z.array(Cut).parse(JSON.parse(await readFile(file, 'utf8')));
}

/** Property cut points: what the team did next at a moment, which actions are acceptable and which are not. */
export async function loadCuts(source: LabelSource = 'both'): Promise<Cut[]> {
  const [a, b] = await Promise.all([source !== 'holdout' ? readCuts(CUTS_FILE) : [], source !== 'cuts' ? readCuts(HOLDOUT_FILE) : []]);
  return [...a, ...b].sort((x, y) => x.case.localeCompare(y.case) || x.cutBefore - y.cutBefore);
}

export async function loadSplit(file = SPLIT_FILE): Promise<Record<string, Split>> {
  const s = JSON.parse(await readFile(file, 'utf8')) as { cases: Record<string, { split: Split }> };
  return Object.fromEntries(Object.entries(s.cases).map(([k, v]) => [k, v.split]));
}

export async function cutsFor(split: Split | 'all', source: LabelSource = 'both'): Promise<Cut[]> {
  const [cuts, sp] = await Promise.all([loadCuts(source), loadSplit()]);
  return split === 'all' ? cuts : cuts.filter((c) => sp[c.case] === split);
}

export const cutId = (c: Pick<Cut, 'case' | 'cutBefore'>) => `${c.case}@${c.cutBefore}`;
