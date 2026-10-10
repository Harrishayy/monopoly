import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AgentDecision } from '../src/agent';
import { loadCase } from '../src/b/ingest/casefile';
import { score } from '../src/bench/bench';
import { ExampleBank } from '../src/bench/examples';
import { escalationLabels, spread } from '../src/bench/judge';
import { cutsFor, loadSplit, PROPERTY_DIR, REPO } from '../src/bench/labels';
import { caseTitles, makeSplit } from '../src/bench/split';

const hasData = existsSync(PROPERTY_DIR);

describe('split', () => {
  it('is 30/10/10 by case, reproducible, and matches the recorded file', async () => {
    if (!hasData) return;
    const recorded = await loadSplit();
    const fresh = makeSplit(await caseTitles(PROPERTY_DIR));
    expect(fresh).toEqual(recorded);
    const count = (s: string) => Object.values(recorded).filter((x) => x === s).length;
    expect([count('dev'), count('val'), count('test')]).toEqual([30, 10, 10]);
  });
  it('never puts cuts from one case in two sets', async () => {
    const [dev, val, test] = await Promise.all([cutsFor('dev'), cutsFor('val'), cutsFor('test')]);
    const cases = (cs: { case: string }[]) => new Set(cs.map((c) => c.case));
    for (const v of cases(val)) expect(cases(dev).has(v) || cases(test).has(v)).toBe(false);
    expect(dev.length + val.length + test.length).toBe((await cutsFor('all')).length);
  });
});

describe('few-shot memory', () => {
  it('built from dev only never returns val or test cases', async () => {
    if (!hasData) return;
    const [bank, split] = await Promise.all([ExampleBank.build(['dev']), loadSplit()]);
    const c = await loadCase(join(PROPERTY_DIR, '025'), { withhold: 'outcomes', cutBefore: 6, track: 'property' });
    const hits = bank.similar(c, 5);
    expect(hits).toHaveLength(5);
    expect(hits.every((h) => split[h.case] === 'dev')).toBe(true);
    expect(bank.render(c, 2)).toMatch(/Team's next action/);
  }, 60_000);
});

describe('shared scorer', () => {
  const d = (action: string): AgentDecision => ({ agent: 'b', action, recipient: '', channel: '', message: '', reason: '', decidedBy: 'model', ms: 1, failures: [] });
  const cut = { case: '001', cutBefore: 4, kind: 'determined' as const, situation: '', accept: ['landlord.request_approval'], prohibit: ['contractor.assign'], boundaries: [], happened: '' };
  it('passes accepted actions, flags prohibited ones and near misses', () => {
    expect(score('b', cut, d('landlord.request_approval'))).toMatchObject({ pass: true, prohibited: false });
    expect(score('b', cut, d('contractor.assign'))).toMatchObject({ pass: false, prohibited: true });
    expect(score('b', cut, d('landlord.chase'))).toMatchObject({ pass: false, near: true });
    expect(score('b', cut, d('case.wait'))).toMatchObject({ pass: false, near: false });
  });
});

describe('generalisation labels', () => {
  it('finds every labelled escalation example and hides the label from the agent', async () => {
    if (!existsSync(`${REPO}/data/public`)) return;
    const labels = await escalationLabels();
    expect(labels.length).toBe(150);
    const c = await loadCase(labels[0]!.dir, { withhold: 'outcomes' });
    expect(JSON.stringify(c)).not.toContain(labels[0]!.expected.split('\n')[0]!.slice(0, 60));
  });
  it('spreads a subset evenly', () => {
    expect(spread([1, 2, 3, 4, 5, 6], 3)).toEqual([1, 3, 5]);
    expect(spread([1, 2], 5)).toEqual([1, 2]);
  });
});
