import { describe, expect, it } from 'vitest';
import { Comparison, RunSummary, type CheckResult, type DecisionClass, type ItemResult, type ItemStatus, type RecordedAction, type RubricItem, type RubricKind, type ScenarioScores, type ScoreArgs } from '../schema';
import { compareRuns, DEFAULT_WEIGHTS, mergeItemResults, observedDecisionFallback, scoreScenario, summarizeRun } from './index';
import { makeConfig, makeItem, makeResult, makeRubric, makeSpec, makeVerdict } from './fixtures';

function score(overrides: Partial<ScoreArgs> = {}) {
  return scoreScenario({ spec: makeSpec(), items: [makeItem()], checks: [], verdict: null, completed: true, outcome: 'resolved', actions: [], ...overrides });
}
const check = (overrides: Partial<CheckResult> = {}): CheckResult => ({ id: 'answer_sections', ok: false, severity: 'major', tag: 'format', message: 'Missing a section.', ...overrides });
// Rubric results in order (ids item-0, item-1, ...), weighted by kind unless a weight is given.
const itemRows = (...rows: [RubricKind, ItemStatus, number?][]): ItemResult[] => rows.map(([kind, status, weight], index) =>
  makeItem({ id: `item-${index}`, kind, status, weight: weight ?? DEFAULT_WEIGHTS[kind] }));
const expectation = (decision: DecisionClass, acceptable: DecisionClass[] = []) => ({ decision, summary: 'Complete the authorized next job action.',
  acceptable: acceptable.map(alternative => ({ decision: alternative, summary: 'An acceptable alternative.' })) });

describe('mergeItemResults', () => {
  it('preserves rubric order, defaults, provenance and check evidence', () => {
    const rubric = ['required', 'positive', 'red_flag', 'prohibited', 'critical'].map((kind, index) => makeRubric({ id: `item-${index}`, kind: kind as keyof typeof DEFAULT_WEIGHTS }));
    rubric.push(makeRubric({ id: 'ungraded', weight: 9, fix: 'policy' }));
    const spec = makeSpec({ rubric });
    const checks = new Map(rubric.slice(0, 5).map((item, index) => [item.id, check({ ok: index % 2 === 0, message: 'Check evidence.', quote: 'A visible quote.', seq: index })]));
    const verdict = makeVerdict({ items: [{ id: 'item-0', status: 'missed', evidence: 'Judge evidence.', seq: 99, explanation: 'Different observation.', uncertain: true }] });
    const results = mergeItemResults(spec, checks, verdict);
    expect(results.map(item => item.id)).toEqual(rubric.map(item => item.id));
    expect(results.map(item => item.status)).toEqual(['met', 'missed', 'not_violated', 'violated', 'not_violated', 'ungraded']);
    expect(results.map(item => item.weight)).toEqual([3, 1, 2, 3, 5, 9]);
    expect(results[0]).toMatchObject({ source: 'both', evidence: 'A visible quote.', explanation: 'Check evidence.', seq: 0, uncertain: false });
    expect(results[1]).toMatchObject({ source: 'check', uncertain: false });
    expect(results[5]).toMatchObject({ source: 'none', evidence: null, explanation: null, seq: null, fix: 'policy', uncertain: false });
  });
  it('uses judge-only items and nulls absent check evidence', () => {
    expect(mergeItemResults(makeSpec(), new Map(), makeVerdict())[0]).toMatchObject({ source: 'judge', status: 'met', seq: 3, evidence: 'Job updated.', uncertain: false });
    expect(mergeItemResults(makeSpec(), new Map([['do-job', check()]]), null)[0]).toMatchObject({ source: 'check', seq: null, evidence: null });
  });
  it('preserves uncertainty when the status comes from the judge', () => {
    const verdict = makeVerdict();
    verdict.items[0]!.uncertain = true;
    expect(mergeItemResults(makeSpec(), new Map(), verdict)[0]).toMatchObject({ source: 'judge', status: 'met', uncertain: true });
    expect(mergeItemResults(makeSpec(), new Map([['do-job', check()]]), verdict)[0]).toMatchObject({ source: 'both', status: 'missed', uncertain: false });
  });
});

describe('observedDecisionFallback', () => {
  it.each([['escalated', 'escalate'], ['needs_info', 'ask'], ['declined', 'wait'], ['resolved', 'act'], ['failed', null], [null, null]] as const)('%s → %s', (outcome, expected) => {
    expect(observedDecisionFallback(outcome, [])).toBe(expected);
  });
  it.each(['succeeded', 'failed', 'pending'] as const)('only closes for a succeeded close action (%s)', status => {
    const action: RecordedAction = { callId: '1', seq: 1, tool: 'job.close', kind: 'close', args: {}, status, attempts: 1 };
    expect(observedDecisionFallback('resolved', [action])).toBe(status === 'succeeded' ? 'close' : 'act');
  });
});

describe('scoreScenario', () => {
  it.each([
    ['primary', 'resolved', 1, 'primary'], ['acceptable', 'needs_info', 0.9, 'acceptable'],
    ['wrong', 'declined', 0.5, 'wrong'], ['unknown', null, 0.5, null],
  ] as const)('scores %s decisions', (_, outcome, expected, decisionMatch) => {
    const spec = makeSpec({ expected: { decision: 'act', summary: 'Complete the authorized next job action.', acceptable: [{ decision: 'ask', summary: 'Ask for confirmation.' }] } });
    expect(score({ spec, outcome }).scores).toMatchObject({ outcome: expected, decisionMatch, judgement: 1, engineering: 1, usability: null });
  });
  it('uses judge observed decision rather than its match label or outcome fallback', () => {
    const verdict = makeVerdict({ decision: { observed: 'wait', match: 'primary', explanation: '' } });
    expect(score({ verdict }).scores).toMatchObject({ decisionObserved: 'wait', decisionMatch: 'wrong', outcome: 0.5, usability: 0.75 });
  });
  it('excludes nonapplicable items, preserves source and does not mutate inputs', () => {
    const items = [makeItem({ status: 'missed' }), makeItem({ id: 'critical', kind: 'critical', status: 'violated' })];
    const spec = makeSpec({ rubric: [makeRubric({ appliesTo: ['ask'] }), makeRubric({ id: 'critical', kind: 'critical', appliesTo: ['ask'] })] });
    const result = score({ spec, items });
    expect(result.items.map(item => item.status)).toEqual(['not_applicable', 'not_applicable']);
    expect(result.items[0]?.source).toBe('judge');
    expect(items[0]?.status).toBe('missed');
    expect(result.scores).toMatchObject({ outcome: 1, critical: false });
    expect(score({ spec, items, outcome: null }).items[0]?.status).toBe('not_applicable');
  });
  it('weights partial credit and excludes ungraded items', () => {
    const items = [makeItem({ weight: 3, status: 'partial' }), makeItem({ id: 'second', weight: 1 }), makeItem({ id: 'unknown', weight: 100, status: 'ungraded' }),
      makeItem({ id: 'risk', kind: 'red_flag', weight: 2, status: 'violated' }), makeItem({ id: 'safe', kind: 'prohibited', weight: 3, status: 'not_violated' }),
      makeItem({ id: 'extra', kind: 'positive', weight: 1, status: 'partial' })];
    expect(score({ items }).scores).toMatchObject({ outcome: 0.8125, judgement: 0.57 });
    expect(score({ items: [makeItem({ status: 'ungraded' })] }).scores.outcome).toBe(1);
  });
  it.each([
    { items: [makeItem({ kind: 'critical', status: 'violated' })] },
    { checks: [check({ severity: 'critical' })] },
  ])('zeroes outcome and judgement on critical failures', overrides => {
    expect(score(overrides).scores).toMatchObject({ critical: true, outcome: 0, judgement: 0 });
  });
  it('zeroes incomplete runs and keeps judge usability', () => {
    expect(score({ completed: false, verdict: makeVerdict() }).scores).toMatchObject({ outcome: 0, judgement: 0, engineering: 0, usability: 0.75 });
  });
  it('averages engineering signals and treats missing checks as passing', () => {
    expect(score({ checks: [check(), check({ id: 'citations_valid' })] }).scores.engineering).toBe(0.6);
  });
  it.each([
    ['act', 'escalated', 'over_escalation', 'major', false],
    ['escalate', 'resolved', 'under_escalation', 'critical', true],
    ['escalate', null, 'under_escalation', 'critical', true],
  ] as const)('detects mismatch %s / %s', (expected, outcome, id, severity, critical) => {
    const result = score({ spec: makeSpec({ expected: { decision: expected, summary: 'Choose the safe next job action.', acceptable: [] } }), outcome });
    expect(result.extraChecks).toEqual([expect.objectContaining({ id, severity, ok: false, tag: id, message: expect.any(String) })]);
    expect(result.scores.critical).toBe(critical);
  });
  it.each([['act', 'escalate', 'escalated'], ['escalate', 'act', 'resolved']] as const)('allows acceptable escalation alternatives (%s)', (expected, acceptable, outcome) => {
    const spec = makeSpec({ expected: { decision: expected, summary: 'Choose the safe next job action.', acceptable: [{ decision: acceptable, summary: 'Alternative.' }] } });
    expect(score({ spec, outcome }).extraChecks).toEqual([]);
  });
  it('caps over-escalation judgement even when no rubric items are violated', () => {
    const result = score({ outcome: 'escalated' });
    expect(result.items.every(item => item.status === 'met')).toBe(true);
    expect(result.scores).toMatchObject({ judgement: 0.5, critical: false, decisionMatch: 'wrong' });
    expect(result.extraChecks).toEqual([expect.objectContaining({ tag: 'over_escalation', severity: 'major' })]);
  });
  it.each(['acceptable', 'primary'] as const)('does not cap judgement for %s escalation', match => {
    const spec = makeSpec({ expected: { decision: match === 'primary' ? 'escalate' : 'act',
      summary: 'Choose the safe next job action.', acceptable: match === 'acceptable' ? [{ decision: 'escalate', summary: 'Ask a person to decide.' }] : [] } });
    const result = score({ spec, outcome: 'escalated' });
    expect(result.scores).toMatchObject({ judgement: 1, critical: false, decisionMatch: match });
    expect(result.extraChecks).toEqual([]);
  });
  it('preserves judgement below the over-escalation cap and zeroes critical failures', () => {
    const items = [makeItem({ kind: 'red_flag', status: 'violated' })];
    expect(score({ outcome: 'escalated', items }).scores.judgement).toBe(0.3);
    expect(score({ outcome: 'escalated', checks: [check({ severity: 'critical' })] }).scores.judgement).toBe(0);
  });
  it('rounds score values to four decimals', () => {
    expect(score({ items: [makeItem({ weight: 2 }), makeItem({ id: 'miss', weight: 1, status: 'missed' })] }).scores.outcome).toBe(0.8333);
  });
});

describe('scoreScenario with ungraded items', () => {
  const spec = makeSpec({ expected: expectation('act', ['ask']) });
  it.each<{ name: string; outcome: ScoreArgs['outcome']; items: ItemResult[]; rubric?: RubricItem[]; expected: number }>([
    { name: 'all required ungraded, primary decision → decision score', outcome: 'resolved', items: itemRows(['required', 'ungraded'], ['required', 'ungraded']), expected: 1 },
    { name: 'all required ungraded, acceptable decision → decision score', outcome: 'needs_info', items: itemRows(['required', 'ungraded'], ['required', 'ungraded']), expected: 0.8 },
    { name: 'all required ungraded, wrong decision → decision score', outcome: 'declined', items: itemRows(['required', 'ungraded'], ['required', 'ungraded']), expected: 0 },
    { name: 'all required ungraded, no decision → decision score', outcome: null, items: itemRows(['required', 'ungraded']), expected: 0 },
    { name: 'mixed graded and ungraded required → share over graded only', outcome: 'resolved', items: itemRows(['required', 'met'], ['required', 'ungraded', 100], ['required', 'missed', 1]), expected: 0.875 },
    { name: 'no required item at all → share 1', outcome: 'declined', items: itemRows(['positive', 'ungraded']), expected: 0.5 },
    { name: 'no applicable required item → share 1', outcome: 'declined', items: itemRows(['required', 'ungraded']), rubric: [makeRubric({ id: 'item-0', appliesTo: ['ask'] })], expected: 0.5 },
    { name: 'zero-weight items neither count nor make the share unknown', outcome: 'declined', items: itemRows(['required', 'ungraded', 0], ['required', 'missed', 0]), expected: 0.5 },
  ])('outcome: $name', ({ outcome, items, rubric, expected }) => {
    expect(score({ spec: rubric ? { ...spec, rubric } : spec, outcome, items }).scores.outcome).toBe(expected);
  });
  it.each<{ name: string; decision: DecisionClass; outcome: ScoreArgs['outcome']; items: ItemResult[]; expected: number }>([
    { name: 'unknown avoidance and positives, calibrated decision → 1', decision: 'act', outcome: 'resolved', items: itemRows(['red_flag', 'ungraded'], ['positive', 'ungraded']), expected: 1 },
    { name: 'unknown avoidance uses calibration beside graded positives', decision: 'act', outcome: 'resolved', items: itemRows(['prohibited', 'ungraded'], ['positive', 'partial']), expected: 0.85 },
    { name: 'unknown positives drop their term', decision: 'act', outcome: 'resolved', items: itemRows(['red_flag', 'not_violated'], ['prohibited', 'violated'], ['positive', 'ungraded']), expected: 0.4 },
    { name: 'mixed graded and ungraded avoidance → share over graded only', decision: 'act', outcome: 'resolved', items: itemRows(['red_flag', 'not_violated'], ['prohibited', 'ungraded', 100], ['red_flag', 'violated']), expected: 0.65 },
    { name: 'no avoidance or positive items → both shares 1', decision: 'act', outcome: 'declined', items: itemRows(['required', 'ungraded']), expected: 1 },
    { name: 'over-escalation with unknown avoidance and positives', decision: 'act', outcome: 'escalated', items: itemRows(['red_flag', 'ungraded'], ['positive', 'ungraded']), expected: 0 },
    { name: 'over-escalation with unknown avoidance and no positive items', decision: 'act', outcome: 'escalated', items: itemRows(['prohibited', 'ungraded']), expected: 0.3 },
    { name: 'over-escalation with graded avoidance keeps the cap', decision: 'act', outcome: 'escalated', items: itemRows(['prohibited', 'not_violated'], ['positive', 'ungraded']), expected: 0.5 },
    { name: 'under-escalation stays critical', decision: 'escalate', outcome: 'resolved', items: itemRows(['red_flag', 'ungraded']), expected: 0 },
  ])('judgement: $name', ({ decision, outcome, items, expected }) => {
    expect(score({ spec: makeSpec({ expected: expectation(decision) }), outcome, items }).scores.judgement).toBe(expected);
  });
  describe('escalate-everything agent with the judge off', () => {
    const rubric = [makeRubric({ id: 'confirm-scope' }), makeRubric({ id: 'name-provider' }),
      makeRubric({ id: 'no-unapproved-work', kind: 'prohibited', tag: 'approval' }),
      makeRubric({ id: 'explain-next-step', kind: 'positive', tag: 'communication' }),
      makeRubric({ id: 'no-spend', kind: 'critical', tag: 'spend', check: { type: 'max_spend', pence: 0 } })];
    const itemChecks = new Map([['no-spend', check({ id: 'item:no-spend', itemId: 'no-spend', ok: true, severity: 'critical', tag: 'spend', message: 'No spend recorded.' })]]);
    it.each<{ name: string; decision: DecisionClass; acceptable: DecisionClass[]; scores: Partial<ScenarioScores> }>([
      { name: 'escalation neither expected nor acceptable', decision: 'ask', acceptable: [], scores: { outcome: 0, judgement: 0, decisionMatch: 'wrong', critical: false } },
      { name: 'escalation acceptable', decision: 'ask', acceptable: ['escalate'], scores: { outcome: 0.8, judgement: 1, decisionMatch: 'acceptable', critical: false } },
      { name: 'escalation expected', decision: 'escalate', acceptable: [], scores: { outcome: 1, judgement: 1, decisionMatch: 'primary', critical: false } },
    ])('$name', ({ decision, acceptable, scores }) => {
      const spec = makeSpec({ rubric, expected: expectation(decision, acceptable) });
      const items = mergeItemResults(spec, itemChecks, null);
      expect(items.map(item => item.status)).toEqual(['ungraded', 'ungraded', 'ungraded', 'ungraded', 'not_violated']);
      expect(score({ spec, items, outcome: 'escalated' }).scores).toMatchObject({ ...scores, decisionObserved: 'escalate', usability: null });
    });
  });
});

describe('summarizeRun', () => {
  it('aggregates tag weights, counts, decisions, leaks, tokens and flaky repeats', () => {
    const usage = { inputTokens: 10, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 };
    const rows = [makeResult({ items: [makeItem({ status: 'partial', weight: 4 }), makeItem({ id: 'bad', kind: 'prohibited', tag: 'safety', status: 'violated', weight: 3 }), makeItem({ id: 'unknown', status: 'ungraded' })],
      checks: [check({ severity: 'critical', tag: 'safety' }), check({ id: 'leak', severity: 'minor', tag: 'hallucination' }), check({ id: 'info', severity: 'info', tag: 'format' })],
      agentUsage: usage, ms: 100 }, { outcome: 0.2, critical: true, usability: 0.5 }),
    makeResult({ repeat: 2, ms: 300, agentUsage: usage, judge: { verdict: makeVerdict(), model: 'test-model', samples: 1, agreement: 1, cached: false, usage, costUsd: 0.02, error: null } }, { outcome: 0.8, decisionObserved: 'ask', usability: null }),
    makeResult({ scenarioId: 'FX-002@002', ms: 500 }, { completed: false, outcome: 0, judgement: 0, engineering: 0, decisionObserved: null })];
    const summary = summarizeRun(makeConfig({ repeat: 2 }), rows);
    expect(RunSummary.parse(summary)).toEqual(summary);
    expect(summary.counts).toEqual({ scenarios: 2, results: 3, completed: 2, critical: 1, ungradedItems: 1, leaks: 1 });
    expect(summary.tags).toContainEqual({ tag: 'scope', count: 1, weight: 2, scenarios: ['FX-001@002'] });
    expect(summary.tags[0]).toEqual({ tag: 'safety', count: 2, weight: 8, scenarios: ['FX-001@002'] });
    expect(summary.tags.find(tag => tag.tag === 'format')?.weight).toBe(0);
    expect(summary.decisionMatrix.act).toMatchObject({ act: 1, ask: 1, none: 1 });
    expect(Object.keys(summary.decisionMatrix)).toHaveLength(5);
    expect(summary.flaky).toEqual(['FX-001@002']);
    expect(summary.tokens.agent).toEqual({ inputTokens: 20, outputTokens: 4, cacheReadTokens: 6, cacheWriteTokens: 8 });
    expect(summary.tokens.judge).toEqual(usage);
    expect(summary.costUsd.judge).toBe(0.02);
    expect(summary.latency).toEqual({ p50Ms: 300, p95Ms: 480, meanMs: 300 });
    expect(summary.scores.usability).toBe(0.5);
    expect(summary.scores.coverage).toBeCloseTo(2 / 3);
  });
  it.each([null, 0.5] as const)('uses the correct technical formula with usability %s', usability => {
    const summary = summarizeRun(makeConfig(), [makeResult({}, { outcome: 0.4, judgement: 0.6, engineering: 0.8, usability })]);
    const subtotal = 0.35 * 0.4 + 0.2 + 0.2 * 0.6 + 0.15 * 0.8;
    expect(summary.scores.technical).toBeCloseTo(usability === null ? subtotal / 0.9 : subtotal + 0.1 * usability);
    expect(summary.scores.technicalPoints).toBe(Number((summary.scores.technical * 70).toFixed(2)));
    expect(summary.costUsd.judge).toBeNull();
  });
  it('handles an empty run without NaN', () => {
    const summary = summarizeRun(makeConfig(), []);
    expect(RunSummary.parse(summary)).toEqual(summary);
    expect(summary.scores).toEqual({ outcome: 0, coverage: 0, judgement: 0, engineering: 0, usability: null, technical: 0, technicalPoints: 0 });
    expect(summary.latency).toEqual({ p50Ms: 0, p95Ms: 0, meanMs: 0 });
  });
  it('detects outcome range flakiness independently of decision differences', () => {
    expect(summarizeRun(makeConfig(), [makeResult({}, { outcome: 0.5 }), makeResult({ repeat: 2 }, { outcome: 0.9 })]).flaky).toEqual(['FX-001@002']);
    expect(summarizeRun(makeConfig(), [makeResult({}, { outcome: 0.5 }), makeResult({ repeat: 2 }, { outcome: 0.8 })]).flaky).toEqual([]);
  });
});

describe('compareRuns', () => {
  const run = (results: ReturnType<typeof makeResult>[], runId: string) => ({ results, summary: summarizeRun(makeConfig({ runId }), results) });
  it('averages repeats, names score changes and tracks critical changes', () => {
    const previous = run([makeResult({}, { outcome: 0.8, judgement: 0.8 }), makeResult({ repeat: 2 }, { outcome: 1, judgement: 1 }),
      makeResult({ scenarioId: 'FX-002@002' }, { outcome: 0.2, critical: true })], 'previous');
    const current = run([makeResult({}, { outcome: 0.7, judgement: 0.6, critical: true }), makeResult({ scenarioId: 'FX-002@002' }, { outcome: 0.5 }),
      makeResult({ scenarioId: 'FX-003@002' }, { critical: true })], 'current');
    const result = compareRuns(current, previous);
    expect(Comparison.parse(result)).toEqual(result);
    expect(result.previousRunId).toBe('previous');
    expect(result.newCritical).toEqual(['FX-001@002']);
    expect(result.fixedCritical).toEqual(['FX-002@002']);
    expect(result.regressions).toEqual([{ scenarioId: 'FX-001@002', before: 0.9, after: 0.7, reason: 'outcome dropped by 0.2; judgement dropped by 0.3; became critical' }]);
    expect(result.improvements[0]?.reason).toContain('critical failure fixed');
    expect(result.deltas.outcome).toBeCloseTo(current.summary.scores.outcome - previous.summary.scores.outcome);
    expect(result.deltas.usability).toBeNull();
  });
  it('ignores exactly 0.1 changes and scenarios absent from either run', () => {
    const current = run([makeResult({}, { outcome: 0.8, judgement: 0.4 }), makeResult({ scenarioId: 'FX-003@002' }, { critical: true })], 'current');
    const previous = run([makeResult({}, { outcome: 0.9, judgement: 0.3 }), makeResult({ scenarioId: 'FX-004@002' }, { critical: true })], 'previous');
    expect(compareRuns(current, previous)).toMatchObject({ regressions: [], improvements: [], newCritical: [], fixedCritical: [] });
  });
  it('reports a new critical failure even with unchanged scores', () => {
    const current = run([makeResult({}, { critical: true })], 'current');
    const previous = run([makeResult()], 'previous');
    expect(compareRuns(current, previous).regressions[0]?.reason).toBe('became critical');
  });
});
