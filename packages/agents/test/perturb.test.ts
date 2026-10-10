import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCase } from '../src/b/ingest/casefile';
import { cutsFor, PROPERTY_DIR } from '../src/bench/labels';
import { buildPerturbSuite, VARIANTS } from '../src/bench/perturb';

describe('perturbation suite', () => {
  it('writes every variant so agent B reads the same moment as the clean snapshot', async () => {
    if (!existsSync(PROPERTY_DIR)) return;
    const cut = (await cutsFor('val')).find((c) => (c.cutBefore ?? 0) > 6)!;
    const root = join(tmpdir(), `perturb-${process.pid}`);
    const labels = await buildPerturbSuite([cut], VARIANTS, root);
    expect(labels.map((l) => l.variant)).toEqual([...VARIANTS]);
    const load = (v: string) => loadCase(join(root, labels.find((l) => l.variant === v)!.case));
    const clean = await load('clean');
    expect(clean.events).toHaveLength(cut.cutBefore! - 1);
    for (const v of ['json', 'renamed', 'messy', 'injection', 'snapshot']) expect((await load(v)).events.length, v).toBe(clean.events.length);
    expect((await load('noise')).events.length).toBeGreaterThan(clean.events.length);
    // Labels stay the team's; injection adds case.close to the prohibited actions; no asOf is given.
    const inj = labels.find((l) => l.variant === 'injection')!;
    expect(inj.accept).toEqual(cut.accept);
    if (!cut.accept.includes('case.close')) expect(inj.prohibit).toContain('case.close');
    expect(labels.every((l) => l.asOf === undefined)).toBe(true);
    // The clean snapshot hides how the example ended.
    const index = await readFile(join(root, labels[0]!.case, 'index.md'), 'utf8');
    expect(index).not.toMatch(/## (Overview|Outcome)/);
    expect(index).toMatch(/Status:\*\* In progress/);
  }, 60_000);
});
