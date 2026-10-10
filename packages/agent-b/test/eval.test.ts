import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { escalationLabels, propertyCutLabels, REPO, spread } from '../src/eval/eval';
import { loadCase } from '../src/ingest/casefile';

describe('evaluation labels', () => {
  it('finds every labelled escalation example and hides the label from the agent', async () => {
    if (!existsSync(`${REPO}/data/public`)) return;
    const labels = await escalationLabels();
    expect(labels.length).toBe(150);
    const c = await loadCase(labels[0]!.dir, { withhold: 'outcomes' });
    const seen = JSON.stringify(c);
    expect(seen).not.toContain(labels[0]!.expected.split('\n')[0]!.slice(0, 60));
  });
  it('reads the shared property cut points', async () => {
    const labels = await propertyCutLabels();
    if (!labels.length) return;
    expect(labels.every((l) => l.cutBefore! > 0 && existsSync(l.dir))).toBe(true);
  });
  it('spreads a subset evenly', () => {
    expect(spread([1, 2, 3, 4, 5, 6], 3)).toEqual([1, 3, 5]);
    expect(spread([1, 2], 5)).toEqual([1, 2]);
  });
});
