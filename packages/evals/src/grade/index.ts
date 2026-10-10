import { readFile } from 'node:fs/promises';
import { ScenarioResult, type GradeInput, type CheckResult, type JudgeRecord, type ItemResult } from '../schema';
import { actionsFromTrace, evaluateItemChecks, runBuiltinChecks } from '../checks';
import { judgeScenario } from '../judge';
import { mergeItemResults, scoreScenario } from '../score';

function mainFailure(items: ItemResult[], checks: CheckResult[]): { text: string; fix: ItemResult['fix']; weight: number } | undefined {
  const failures = [
    ...items.filter(item => item.kind === 'required' || item.kind === 'positive'
      ? item.status === 'missed' || item.status === 'partial' : item.status === 'violated')
      .map(item => ({ text: item.text, fix: item.fix, weight: item.weight })),
    ...checks.filter(check => !check.ok)
      .map(check => ({ text: check.message, fix: null, weight: { critical: 5, major: 3, minor: 1, info: 0 }[check.severity] })),
  ];
  return failures.sort((a, b) => b.weight - a.weight)[0];
}

/** Run checks, judging and scoring; convert unexpected failures into a validated failed result. */
export async function gradeScenario(input: GradeInput): Promise<ScenarioResult> {
  const { scenario, materialized, suite, agent } = input;
  let checks: CheckResult[] = [];
  let items: ItemResult[] = [];
  let judge: JudgeRecord | null = null;
  const metadata = {
    runId: input.runId, scenarioId: scenario.id, baseId: scenario.baseId, variant: scenario.variant,
    repeat: input.repeat, title: materialized.spec.title, tags: materialized.spec.tags,
    agent: input.agentName, expectedDecision: materialized.spec.expected.decision,
    ms: agent.ms, agentError: agent.error, agentUsage: agent.usage, artifactsDir: input.artifactsDir,
  };
  try {
    const [answer, reasoning] = await Promise.all([
      agent.answerPath ? readFile(agent.answerPath, 'utf8') : null,
      agent.reasoningPath ? readFile(agent.reasoningPath, 'utf8') : null,
    ]);
    const events = agent.events;
    const checkInput = { scenario, materialized, suite, events, answer, reasoning, ledger: agent.ledger, agentError: agent.error };
    checks = runBuiltinChecks(checkInput);
    const itemChecks = evaluateItemChecks(checkInput);
    const actions = actionsFromTrace(events, suite.actionMap);
    judge = input.judge.enabled ? await judgeScenario({ scenario, materialized, suite, answer, reasoning, events, checks }, input.judge) : null;
    items = mergeItemResults(materialized.spec, itemChecks, judge?.verdict ?? null);
    const completed = checks.some(check => check.id === 'completed' && check.ok);
    const outcome = events?.filter(event => event.type === 'run.completed').sort((a, b) => a.seq - b.seq).at(-1)?.outcome ?? null;
    const scored = scoreScenario({ spec: materialized.spec, items, checks, verdict: judge?.verdict ?? null, completed, outcome, actions });
    checks = [...checks, ...scored.extraChecks, ...itemChecks.values()];
    items = scored.items;
    const issue = mainFailure(items, checks);
    return ScenarioResult.parse({ ...metadata, checks, items, judge, scores: scored.scores,
      topIssue: judge?.verdict?.topIssue ?? issue?.text ?? null,
      fixArea: judge?.verdict?.fixArea ?? issue?.fix ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorText = `Grading failed: ${message}`;
    checks = [...checks, { id: 'grade_error', ok: false, severity: 'critical', tag: 'robustness', message: errorText }];
    if (!items.length) items = mergeItemResults(materialized.spec, new Map(), null);
    if (input.judge.enabled && !judge) judge = {
      verdict: null, model: input.judge.model, samples: input.judge.samples, agreement: null, cached: false,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: null, error: errorText,
    };
    return ScenarioResult.parse({ ...metadata, agentError: [agent.error, errorText].filter(Boolean).join('; '), checks, items, judge,
      scores: { completed: false, critical: true, outcome: 0, judgement: 0, engineering: 0,
        usability: judge?.verdict ? judge.verdict.usability.score / 4 : null, decisionObserved: null, decisionMatch: null },
      topIssue: errorText, fixArea: null });
  }
}
