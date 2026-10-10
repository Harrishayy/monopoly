import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Case-level split of the property examples into dev / val / test.
 * Cut points from one case share almost everything, so a case and all its cuts sit in exactly one set.
 * Stratified by job type so each set sees check-outs, appliances, plumbing, doors, windows and gardens.
 */

export type Split = 'dev' | 'val' | 'test';
export const SEED = 20261010;

const JOB_TYPES: [string, RegExp][] = [
  ['check-out', /check-?out|clean/i],
  ['garden', /garden|hedge|shed|pipe in the back/i],
  ['appliance', /dishwasher|oven|washing machine|extractor|fridge|boiler/i],
  ['door-lock', /door|lock|key/i],
  ['plumbing', /toilet|drain|basin|plumb|tap|shower|leak/i],
  ['window', /window/i],
];

export const jobType = (title: string) => JOB_TYPES.find(([, re]) => re.test(title))?.[0] ?? 'other';

/** mulberry32: small, seeded, reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pattern of 5 that gives 3:1:1 when dealt across the stratified order. */
const PATTERN: Split[] = ['dev', 'val', 'dev', 'test', 'dev'];

export function makeSplit(cases: { name: string; title: string }[], seed = SEED): Record<string, Split> {
  const rand = rng(seed);
  const groups = new Map<string, string[]>();
  for (const c of [...cases].sort((a, b) => a.name.localeCompare(b.name))) {
    const t = jobType(c.title);
    groups.set(t, [...(groups.get(t) ?? []), c.name]);
  }
  const order: string[] = [];
  for (const key of [...groups.keys()].sort()) {
    const g = groups.get(key)!;
    for (let i = g.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [g[i], g[j]] = [g[j]!, g[i]!];
    }
    order.push(...g);
  }
  return Object.fromEntries(order.map((name, i) => [name, PATTERN[i % PATTERN.length]!]));
}

export async function caseTitles(trackDir: string): Promise<{ name: string; title: string }[]> {
  const out: { name: string; title: string }[] = [];
  for (const name of (await readdir(trackDir)).sort()) {
    const text = await readFile(join(trackDir, name, 'index.md'), 'utf8').catch(() => '');
    if (!text) continue;
    out.push({ name, title: (text.match(/^#\s+(.+)$/m)?.[1] ?? '').replace(/^Case\s+\d+:\s*/i, '') });
  }
  return out;
}
