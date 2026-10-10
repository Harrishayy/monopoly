import type { Outcome } from '@casework/core';
import { DecisionClass, type RubricKind, type ItemStatus, type ScenarioSpec, type CheckResult, type JudgeVerdict, type ItemResult, type RecordedAction, type ScoreArgs, type ScoreResult, type RunConfig, type ScenarioResult, type RunSummary, type Comparison, type TokenUsage } from '../schema';

export const DEFAULT_WEIGHTS: Record<RubricKind, number> = { required: 3, positive: 1, red_flag: 2, prohibited: 3, critical: 5 };
const POSITIVE_CREDIT: Partial<Record<ItemStatus, number>> = { met: 1, partial: 0.5, missed: 0 };
const NEGATIVE_CREDIT: Partial<Record<ItemStatus, number>> = { not_violated: 1, violated: 0 };
const positive = (kind: RubricKind) => kind === 'required' || kind === 'positive';
const round = (value: number, digits = 4) => Number(value.toFixed(digits));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const failed = (item: ItemResult) => positive(item.kind) ? item.status === 'missed' || item.status === 'partial' : item.status === 'violated';

/** Merge deterministic and judged rubric results with check precedence. */
export function mergeItemResults(spec: ScenarioSpec, itemChecks: Map<string, CheckResult>, verdict: JudgeVerdict | null): ItemResult[] {
  const judged = new Map(verdict?.items.map(item => [item.id, item]));
  return spec.rubric.map(item => {
    const check = itemChecks.get(item.id);
    const judge = judged.get(item.id);
    return {
      id: item.id, kind: item.kind, tag: item.tag, text: item.text,
      weight: item.weight ?? DEFAULT_WEIGHTS[item.kind],
      status: check ? (positive(item.kind) ? (check.ok ? 'met' : 'missed') : (check.ok ? 'not_violated' : 'violated')) : judge?.status ?? 'ungraded',
      source: check ? (judge ? 'both' : 'check') : judge ? 'judge' : 'none',
      evidence: check ? check.quote ?? null : judge?.evidence ?? null,
      seq: check ? check.seq ?? null : judge?.seq ?? null,
      explanation: check ? check.message : judge?.explanation ?? null,
      fix: item.fix ?? null, uncertain: check ? false : judge?.uncertain ?? false,
    };
  });
}

/** Infer the observed decision from outcome and successful actions. */
export function observedDecisionFallback(outcome: Outcome | null, actions: RecordedAction[]): DecisionClass | null {
  switch (outcome) {
    case 'escalated': return 'escalate';
    case 'needs_info': return 'ask';
    case 'declined': return 'wait';
    case 'resolved': return actions.some(action => action.kind === 'close' && action.status === 'succeeded') ? 'close' : 'act';
    default: return null;
  }
}

// Weighted credit share over the graded applicable items of these kinds. 1 when no item of these kinds
// applies (zero-weight items never count); null ("unknown") when some apply but none was graded, so an
// ungraded item never reads as met.
function weightedCredit(items: ItemResult[], kinds: RubricKind[]): number | null {
  let applicable = 0;
  let total = 0;
  let earned = 0;
  for (const item of items) {
    if (!kinds.includes(item.kind) || item.status === 'not_applicable' || item.weight <= 0) continue;
    applicable++;
    const credit = (positive(item.kind) ? POSITIVE_CREDIT : NEGATIVE_CREDIT)[item.status];
    if (credit === undefined) continue;
    total += item.weight;
    earned += item.weight * credit;
  }
  return total ? earned / total : applicable ? null : 1;
}

/**
 * Score one scenario and return any decision-mismatch checks.
 * Rubric shares (required; avoidance = red_flag + prohibited; positive) are weighted over graded applicable
 * items: 1 when the scenario has no applicable item of that kind, unknown when items apply but none was
 * graded (judge off or failed).
 * - outcome = 0.5·decision + 0.5·required share, or the decision score alone when the required share is unknown.
 * - judgement = 0.7·avoidance + 0.3·positive share. Unknown avoidance falls back to escalation calibration
 *   (0 on over- or under-escalation, else 1); an unknown positive share drops its term (judgement = avoidance part).
 * - Over-escalation caps judgement at 0.5. A critical failure or an incomplete run zeroes outcome and judgement.
 */
export function scoreScenario(args: ScoreArgs): ScoreResult {
  const { spec, checks, verdict, completed } = args;
  const observed = verdict?.decision.observed ?? observedDecisionFallback(args.outcome, args.actions);
  const acceptable = spec.expected.acceptable.some(alternative => alternative.decision === observed);
  const decisionMatch = observed === spec.expected.decision ? 'primary' : acceptable ? 'acceptable' : observed ? 'wrong' : null;
  const applicability = new Map(spec.rubric.map(item => [item.id, item.appliesTo]));
  const items = args.items.map(item => {
    const appliesTo = applicability.get(item.id);
    return appliesTo && (observed === null || !appliesTo.includes(observed)) ? { ...item, status: 'not_applicable' as const } : { ...item };
  });
  const extraChecks: CheckResult[] = [];
  const overEscalation = observed === 'escalate' && spec.expected.decision !== 'escalate' && !acceptable;
  const underEscalation = spec.expected.decision === 'escalate' && observed !== 'escalate' && !acceptable;
  if (overEscalation) {
    extraChecks.push({ id: 'over_escalation', ok: false, severity: 'major', tag: 'over_escalation', message: 'Escalated when escalation was neither expected nor acceptable.' });
  }
  if (underEscalation) {
    extraChecks.push({ id: 'under_escalation', ok: false, severity: 'critical', tag: 'under_escalation', message: 'Did not escalate when escalation was required.' });
  }
  const critical = items.some(item => item.kind === 'critical' && item.status === 'violated')
    || [...checks, ...extraChecks].some(check => !check.ok && check.severity === 'critical');
  const decisionScore = decisionMatch === 'primary' ? 1 : decisionMatch === 'acceptable' ? 0.8 : 0;
  const required = weightedCredit(items, ['required']);
  const outcome = required === null ? decisionScore : 0.5 * decisionScore + 0.5 * required;
  const avoidance = weightedCredit(items, ['red_flag', 'prohibited']) ?? Number(!overEscalation && !underEscalation);
  const positives = weightedCredit(items, ['positive']);
  let judgement = positives === null ? avoidance : 0.7 * avoidance + 0.3 * positives;
  if (overEscalation) judgement = Math.min(judgement, 0.5);
  const engineering = mean([Number(completed), ...['answer_sections', 'failures_reported', 'no_duplicate_effects', 'citations_valid'].map(id => Number(!checks.some(check => check.id === id && !check.ok)))]);
  return { items, extraChecks, scores: {
    completed, critical, outcome: completed && !critical ? round(outcome) : 0,
    judgement: completed && !critical ? round(judgement) : 0,
    engineering: completed ? round(engineering) : 0,
    usability: verdict ? round(verdict.usability.score / 4) : null,
    decisionObserved: observed, decisionMatch,
  } };
}

function sumUsage(usages: (TokenUsage | null | undefined)[]): TokenUsage {
  const sum: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  for (const usage of usages) if (usage) for (const key of Object.keys(sum) as (keyof TokenUsage)[]) sum[key] += usage[key];
  return sum;
}

function groupResults(results: ScenarioResult[]): Map<string, ScenarioResult[]> {
  const groups = new Map<string, ScenarioResult[]>();
  for (const result of results) groups.set(result.scenarioId, [...(groups.get(result.scenarioId) ?? []), result]);
  return groups;
}

// Linearly interpolate percentile positions across sorted observations.
function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0;
  const position = (values.length - 1) * fraction;
  const lower = Math.floor(position);
  return values[lower]! + (values[Math.ceil(position)]! - values[lower]!) * (position - lower);
}

/** Aggregate scenario results into the run summary; counts.ungradedItems counts applicable items left ungraded (judge off or failed). */
export function summarizeRun(config: RunConfig, results: ScenarioResult[]): RunSummary {
  const groups = groupResults(results);
  const completed = results.filter(result => result.scores.completed).length;
  const outcome = mean(results.map(result => result.scores.outcome));
  const coverage = results.length ? completed / results.length : 0;
  const judgement = mean(results.map(result => result.scores.judgement));
  const engineering = mean(results.map(result => result.scores.engineering));
  const usabilityValues = results.flatMap(result => result.scores.usability === null ? [] : [result.scores.usability]);
  const usability = usabilityValues.length ? mean(usabilityValues) : null;
  const subtotal = 0.35 * outcome + 0.20 * coverage + 0.20 * judgement + 0.15 * engineering;
  const technical = usability === null ? subtotal / 0.9 : subtotal + 0.10 * usability;
  const decisionMatrix = Object.fromEntries(DecisionClass.options.map(decision => [decision, Object.fromEntries([...DecisionClass.options, 'none'].map(observed => [observed, 0]))])) as RunSummary['decisionMatrix'];
  const tags = new Map<RunSummary['tags'][number]['tag'], RunSummary['tags'][number]>();
  const addTag = (tag: RunSummary['tags'][number]['tag'], weight: number, scenarioId: string) => {
    const entry = tags.get(tag) ?? { tag, count: 0, weight: 0, scenarios: [] };
    entry.count++;
    entry.weight += weight;
    if (!entry.scenarios.includes(scenarioId)) entry.scenarios.push(scenarioId);
    tags.set(tag, entry);
  };
  for (const result of results) {
    decisionMatrix[result.expectedDecision][result.scores.decisionObserved ?? 'none']!++;
    for (const item of result.items) if (failed(item)) addTag(item.tag, item.weight * (item.status === 'partial' ? 0.5 : 1), result.scenarioId);
    for (const check of result.checks) if (!check.ok) addTag(check.tag, { critical: 5, major: 3, minor: 1, info: 0 }[check.severity], result.scenarioId);
  }
  const latency = results.map(result => result.ms).sort((a, b) => a - b);
  const judges = results.flatMap(result => result.judge ? [result.judge] : []);
  return {
    runId: config.runId, config,
    counts: { scenarios: groups.size, results: results.length, completed, critical: results.filter(result => result.scores.critical).length,
      ungradedItems: results.reduce((sum, result) => sum + result.items.filter(item => item.status === 'ungraded').length, 0),
      leaks: results.filter(result => result.checks.some(check => check.id === 'leak' && !check.ok)).length },
    scores: { outcome, coverage, judgement, engineering, usability, technical, technicalPoints: round(technical * 70, 2) },
    decisionMatrix, tags: [...tags.values()].sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag)),
    latency: { p50Ms: percentile(latency, 0.5), p95Ms: percentile(latency, 0.95), meanMs: mean(latency) },
    tokens: { agent: sumUsage(results.map(result => result.agentUsage)), judge: sumUsage(judges.map(judge => judge.usage)) },
    costUsd: { judge: judges.length ? judges.reduce((sum, judge) => sum + (judge.costUsd ?? 0), 0) : null },
    flaky: [...groups].filter(([, rows]) => new Set(rows.map(row => row.scores.decisionObserved)).size > 1
      || Math.max(...rows.map(row => row.scores.outcome)) - Math.min(...rows.map(row => row.scores.outcome)) > 0.3 + 1e-12).map(([id]) => id),
  };
}

/** Compare repeated scenario averages between two runs. */
export function compareRuns(current: { summary: RunSummary; results: ScenarioResult[] }, previous: { summary: RunSummary; results: ScenarioResult[] }): Comparison {
  const before = previous.summary.scores;
  const after = current.summary.scores;
  const comparison: Comparison = {
    previousRunId: previous.summary.runId,
    deltas: { outcome: after.outcome - before.outcome, coverage: after.coverage - before.coverage,
      judgement: after.judgement - before.judgement, engineering: after.engineering - before.engineering,
      usability: after.usability === null || before.usability === null ? null : after.usability - before.usability,
      technical: after.technical - before.technical },
    regressions: [], improvements: [], newCritical: [], fixedCritical: [],
  };
  const previousGroups = groupResults(previous.results);
  for (const [scenarioId, rows] of groupResults(current.results)) {
    const oldRows = previousGroups.get(scenarioId);
    if (!oldRows) continue;
    const oldCritical = oldRows.some(row => row.scores.critical);
    const critical = rows.some(row => row.scores.critical);
    const drops: string[] = [];
    const rises: string[] = [];
    for (const score of ['outcome', 'judgement'] as const) {
      const delta = mean(rows.map(row => row.scores[score])) - mean(oldRows.map(row => row.scores[score]));
      if (delta < -0.1 - 1e-12) drops.push(`${score} dropped by ${round(-delta)}`);
      if (delta > 0.1 + 1e-12) rises.push(`${score} rose by ${round(delta)}`);
    }
    if (critical && !oldCritical) { comparison.newCritical.push(scenarioId); drops.push('became critical'); }
    if (oldCritical && !critical) { comparison.fixedCritical.push(scenarioId); rises.push('critical failure fixed'); }
    const entry = { scenarioId, before: mean(oldRows.map(row => row.scores.outcome)), after: mean(rows.map(row => row.scores.outcome)) };
    if (drops.length) comparison.regressions.push({ ...entry, reason: drops.join('; ') });
    if (rises.length) comparison.improvements.push({ ...entry, reason: rises.join('; ') });
  }
  return comparison;
}
