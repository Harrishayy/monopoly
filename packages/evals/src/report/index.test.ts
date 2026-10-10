import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Comparison, EvalSuite, RunSummary, type ScenarioResult } from '../schema';
import { fixtureSuite } from '../testing/fixtures';
import { compareRuns, summarizeRun } from '../score';
import { makeConfig, makeItem, makeResult, makeVerdict } from '../score/fixtures';
import { renderReport, renderConsoleSummary, readResults, writeRunReport } from './index';

function reportFixture() {
  const critical = makeResult({ scenarioId: 'FX-003@002', items: [makeItem({ id: 'unsafe', kind: 'critical', tag: 'safety', status: 'violated', weight: 5,
    evidence: 'A quote | with detail.', seq: 4, explanation: 'The action exceeds the allowed scope.', fix: 'policy' })],
    checks: [{ id: 'metrics', ok: true, severity: 'info', tag: 'robustness', message: 'Tool calls: 1 succeeded; outcome: resolved.' },
      { id: 'under_escalation', ok: false, severity: 'critical', tag: 'under_escalation', message: 'Escalation required.', quote: 'Did the work.', seq: 7 }],
    topIssue: 'Wait for approval.', fixArea: 'policy', expectedDecision: 'escalate' }, { outcome: 0, judgement: 0, critical: true, decisionMatch: 'wrong' });
  const missed = makeResult({ scenarioId: 'FX-002@002', items: [makeItem({ status: 'partial', tag: 'scope', evidence: 'Only one update.', seq: 2 })],
    judge: { verdict: makeVerdict({ topIssue: 'Explain the follow-up time.' }), model: 'test-model', samples: 1, agreement: 1, cached: false,
      usage: { inputTokens: 8, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0.01, error: null } }, { outcome: 0.75 });
  const passing = makeResult();
  const rows = [passing, missed, critical];
  const config = makeConfig({ gitDirty: true });
  const summary = summarizeRun(config, rows);
  const comparison = compareRuns({ summary, results: rows }, { summary: summarizeRun(makeConfig({ runId: 'old' }), [passing]), results: [passing] });
  return { rows, summary, comparison };
}

describe('renderReport', () => {
  it('renders every required section in order and readable evidence and artifact links', () => {
    const { rows, summary, comparison } = reportFixture();
    const output = renderReport(summary, rows, comparison);
    const headings = ['# Eval report · smoke · test-agent', '## Headline scores', '## Critical failures', '## Regressions', '## Improvements', '## Decision matrix', '## Top failure tags', '## Scenario cards', '## Passing scenarios', '## Flaky scenarios', '## Cost & latency'];
    let previous = -1;
    for (const heading of headings) {
      const position = output.indexOf(heading);
      expect(position).toBeGreaterThan(previous);
      previous = position;
    }
    expect(output).toContain('abc123 +dirty');
    expect(output).toContain('Judge: off');
    expect(output).toContain("These are internal estimates for steering work.\nOver-escalation caps a scenario's judgement score at 50%.");
    expect(output).toContain('Real-world fit (usability)');
    expect(output).toContain('/ 70 points');
    expect(output).toContain('▲ +0.0 pp');
    expect(output.indexOf('### FX-003@002')).toBeLessThan(output.indexOf('### FX-002@002'));
    expect(output).not.toContain('### FX-001@002');
    expect(output).toContain('item unsafe');
    expect(output).toContain('check under_escalation');
    expect(output).toContain('Over-escalated 0\nUnder-escalated 1');
    expect(output).toContain('2 visible events; last visible event 002');
    expect(output).toContain('outcome: resolved');
    expect(output).toContain('[ANSWER.md](<agent/job/r1/ANSWER.md>)');
    expect(output).toContain('[REASONING.md](<agent/job/r1/REASONING.md>)');
    expect(output).toContain('[trace.jsonl](<agent/job/r1/trace.jsonl>)');
    expect(output).toContain('— violated — “A quote | with detail.” — (seq 4)');
    expect(output).toContain('**Top issue:** Wait for approval.');
    expect(output).toContain('**Fix area:** policy');
    expect(output).toContain('Explain the follow-up time. (1)');
    expect(output).toContain('Judge cost USD: $0.0100');
    expect(output).toContain('Uncertain items: 0');
    expect(output).toContain('p50 100.0 ms');
    const ids = [...output.matchAll(/<a id="([^"]+)"/g)].map(match => match[1]);
    for (const match of output.matchAll(/\]\(#([^)]*)\)/g)) expect(ids).toContain(match[1]);
  });
  it('escapes pipes in table cells and keeps repeat anchors unique', () => {
    const row = makeResult({ scenarioId: 'FX-001@002|extra', items: [makeItem({ status: 'missed' })] }, { outcome: 0.5 });
    const rows = [row, { ...row, repeat: 2 }];
    const output = renderReport(summarizeRun(makeConfig(), rows), rows, null);
    const tagRow = output.split('\n').find(text => text.startsWith('| scope |'))!;
    expect(tagRow).toContain('FX-001@002\\|extra');
    expect(tagRow).not.toContain('FX-001@002|extra');
    const anchors = [...output.matchAll(/<a id="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(anchors).size).toBe(anchors.length);
  });
  it('marks uncertain statuses and counts them across results and repeats', () => {
    const row = makeResult({ items: [makeItem({ status: 'partial', uncertain: true }),
      makeItem({ id: 'safe', kind: 'prohibited', status: 'not_violated', uncertain: true }),
      makeItem({ id: 'certain', status: 'missed' })] }, { outcome: 0.5 });
    const rows = [row, { ...row, repeat: 2 }];
    const output = renderReport(summarizeRun(makeConfig(), rows), rows, null);
    expect(output).toContain('— partial (graders disagreed)');
    expect(output).toContain('— not_violated (graders disagreed)');
    expect(output).toContain('— missed\n');
    expect(output).not.toContain('missed (graders disagreed)');
    expect(output.split('## Cost & latency')[1]).toContain('Uncertain items: 4');
  });
  it('shows a scenario card for uncertain passing items', () => {
    const row = makeResult({ items: [makeItem({ uncertain: true })] });
    const output = renderReport(summarizeRun(makeConfig(), [row]), [row], null);
    expect(output).toContain('### FX-001@002');
    expect(output).toContain('— met (graders disagreed)');
    expect(output).not.toContain('## Passing scenarios');
  });
  it('always shows critical failures and does not invent comparison sections', () => {
    const row = makeResult();
    const output = renderReport(summarizeRun(makeConfig(), [row]), [row], null);
    expect(output).toContain('## Critical failures\n\nNone.');
    expect(output).not.toContain('## Regressions');
    expect(output).not.toContain('Δ previous run');
  });
  it('handles empty runs and ungraded results', () => {
    expect(renderReport(summarizeRun(makeConfig(), []), [], null)).toContain('## Top failure tags\n\nNone.');
    const row = makeResult({ items: [makeItem({ status: 'ungraded' })] });
    const report = renderReport(summarizeRun(makeConfig(), [row]), [row], null);
    expect(report).toContain('### FX-001@002');
    expect(report).not.toContain('## Passing scenarios');
  });
  it('shows enabled judge settings and the edited cut when suite information is supplied', () => {
    const row = makeResult({ scenarioId: 'FX-001@005~scope-update', baseId: 'FX-001@005', variant: 'perturbed', items: [makeItem({ status: 'missed' })] });
    const config = makeConfig({ models: { decide: 'agent-model', fast: null, judge: 'test-model' }, judge: { enabled: true, samples: 2, effort: 'high' } });
    const summary = summarizeRun(config, [row]);
    const suite = EvalSuite.parse(fixtureSuite);
    expect(renderReport(summary, [row], null, { suite })).toContain('6 visible events; last visible event 006.');
    expect(renderReport(summary, [row], null, { suite })).toContain('Judge: test-model/2 samples/high');
    expect(renderReport(summary, [row], null)).toContain('Variant cut details unavailable.');
  });
});

describe('renderConsoleSummary', () => {
  it('stays within fifteen lines and includes deltas and failures', () => {
    const { summary, comparison } = reportFixture();
    const output = renderConsoleSummary(summary, comparison);
    expect(output.split('\n').length).toBeLessThanOrEqual(15);
    expect(output).toContain('Critical failures: 1');
    expect(output).toContain('Top tags:');
    expect(output).toContain('Regressions: 0');
    expect(output).toContain('▼');
    expect(output).toContain('Full report: report.md');
  });
});

describe('partial grading', () => {
  const tail = ' (judge off or failed). Outcomes and judgement here reflect decision class and deterministic checks only — not comparable with judged runs.';
  // Two applicable items ungraded, one graded by a check, one inapplicable.
  const partial = (overrides: Partial<ScenarioResult> = {}) => makeResult({ items: [makeItem({ status: 'ungraded' }),
    makeItem({ id: 'scope', kind: 'prohibited', status: 'ungraded' }), makeItem({ id: 'limit', kind: 'critical', status: 'not_violated', source: 'check' }),
    makeItem({ id: 'later', status: 'not_applicable' })], ...overrides }, { outcome: 0, judgement: 0 });
  it.each<{ name: string; rows: ScenarioResult[] }>([
    { name: 'every applicable item is graded', rows: [makeResult(), makeResult({ scenarioId: 'FX-002@002', items: [makeItem({ status: 'missed' })] }, { outcome: 0.5 })] },
    { name: 'only inapplicable items are unscored', rows: [makeResult({ items: [makeItem(), makeItem({ id: 'later', status: 'not_applicable' })] })] },
    { name: 'the run is empty', rows: [] },
  ])('omits the banner and partial labels when $name', ({ rows }) => {
    const summary = summarizeRun(makeConfig(), rows);
    for (const output of [renderReport(summary, rows, null), renderConsoleSummary(summary, null, rows), renderConsoleSummary(summary, null)]) {
      expect(output).not.toContain('Partial grading');
      expect(output).not.toContain('(partial)');
    }
  });
  it.each<{ name: string; rows: ScenarioResult[]; banner: string; summaryOnly: string; cards: string[] }>([
    { name: 'a single ungraded item', rows: [makeResult({ items: [makeItem({ status: 'ungraded' })] })],
      banner: 'Partial grading: 1 rubric item across 1 scenario was not graded', summaryOnly: 'Partial grading: 1 rubric item was not graded',
      cards: ['Partial grading: 1 of 1 applicable rubric item not graded; outcome and judgement are partial.'] },
    { name: 'one partially graded scenario beside a fully graded one', rows: [makeResult({ scenarioId: 'FX-002@002' }), partial()],
      banner: 'Partial grading: 2 rubric items across 1 scenario were not graded', summaryOnly: 'Partial grading: 2 rubric items were not graded',
      cards: ['Partial grading: 2 of 3 applicable rubric items not graded; outcome and judgement are partial.'] },
    { name: 'ungraded items across scenarios and repeats', rows: [partial(), partial({ repeat: 2 }), partial({ scenarioId: 'FX-002@002' })],
      banner: 'Partial grading: 6 rubric items across 2 scenarios were not graded', summaryOnly: 'Partial grading: 6 rubric items were not graded',
      cards: Array(3).fill('Partial grading: 2 of 3 applicable rubric items not graded; outcome and judgement are partial.') },
  ])('flags $name in the report and console summary', ({ rows, banner, summaryOnly, cards }) => {
    const summary = summarizeRun(makeConfig(), rows);
    const report = renderReport(summary, rows, null);
    const [headline, rest] = report.split('## Critical failures');
    expect(headline).toContain(`## Headline scores\n\n> ${banner}${tail}\n\n| Metric | Estimate |`);
    for (const metric of ['Outcomes (partial)', 'Coverage', 'Judgement & safety (partial)', 'Engineering', 'Real-world fit (usability)', 'Technical estimate (partial)']) {
      expect(headline).toContain(`\n| ${metric} | `);
    }
    expect(report.match(/\(partial\)/g)).toHaveLength(3);
    expect(rest!.split('\n').filter(text => text.startsWith('Partial grading:'))).toEqual(cards);
    expect(rest).toContain(`/ usability ungraded\n${cards[0]}\n`);
    const consoleText = renderConsoleSummary(summary, null, rows);
    const lines = consoleText.split('\n');
    expect(lines[1]).toBe(`${banner}${tail}`);
    expect(lines.length).toBeLessThanOrEqual(15);
    expect(consoleText.match(/\(partial\)/g)).toHaveLength(3);
    expect(lines.filter(text => text.includes('(partial)')).map(text => text.split(' (partial) ')[0])).toEqual(['Outcomes', 'Judgement', 'Technical estimate']);
    expect(renderConsoleSummary(summary, null).split('\n')[1]).toBe(`${summaryOnly}${tail}`);
  });
});

describe('persisted reports', () => {
  it('round-trips run artifacts and reads blank JSONL lines', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eval-report-'));
    const previousDir = await mkdtemp(join(tmpdir(), 'eval-report-previous-'));
    try {
      const previous = makeResult();
      const current = makeResult({}, { outcome: 0.5, judgement: 0.5, critical: true });
      await writeFile(join(dir, 'run.json'), JSON.stringify(makeConfig()));
      await writeFile(join(dir, 'results.jsonl'), `\n${JSON.stringify(current)}\n\n`);
      await writeFile(join(previousDir, 'run.json'), JSON.stringify(makeConfig({ runId: 'old' })));
      await writeFile(join(previousDir, 'results.jsonl'), JSON.stringify(previous) + '\n');
      expect(await readResults(dir)).toEqual([current]);
      const output = await writeRunReport(dir, { previousRunDir: previousDir });
      expect(RunSummary.parse(JSON.parse(await readFile(join(dir, 'summary.json'), 'utf8')))).toEqual(output.summary);
      expect(Comparison.parse(JSON.parse(await readFile(join(dir, 'comparison.json'), 'utf8')))).toEqual(output.comparison);
      expect(output.comparison?.newCritical).toEqual(['FX-001@002']);
      expect(await readFile(join(dir, 'report.md'), 'utf8')).toBe(renderReport(output.summary, [current], output.comparison));
    } finally {
      await rm(dir, { recursive: true, force: true });
      await rm(previousDir, { recursive: true, force: true });
    }
  });
  it('ignores unreadable previous runs and writes no comparison when absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eval-report-unreadable-'));
    try {
      await writeFile(join(dir, 'run.json'), JSON.stringify(makeConfig()));
      await writeFile(join(dir, 'results.jsonl'), JSON.stringify(makeResult()) + '\n');
      expect((await writeRunReport(dir, { previousRunDir: join(dir, 'missing') })).comparison).toBeNull();
      await expect(readFile(join(dir, 'comparison.json'))).rejects.toThrow();
      expect((await writeRunReport(dir)).comparison).toBeNull();
      await writeFile(join(dir, 'results.jsonl'), '{"invalid":true}\n');
      await expect(readResults(dir)).rejects.toThrow();
      await writeFile(join(dir, 'results.jsonl'), 'bad json\n');
      await expect(writeRunReport(dir)).rejects.toThrow();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
