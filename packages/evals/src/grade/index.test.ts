import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScenarioResult, type CheckResult } from '../schema';
import { makeGradeInput } from './fixtures';
import { makeVerdict } from '../score/fixtures';
import { gradeScenario } from './index';
import { actionsFromTrace, evaluateItemChecks, runBuiltinChecks } from '../checks';
import { judgeScenario } from '../judge';

vi.mock('../checks', () => ({ actionsFromTrace: vi.fn(), evaluateItemChecks: vi.fn(), runBuiltinChecks: vi.fn() }));
vi.mock('../judge', () => ({ judgeScenario: vi.fn() }));
const check = (overrides: Partial<CheckResult> = {}): CheckResult => ({ id: 'completed', ok: true, severity: 'critical', tag: 'robustness', message: 'Run completed.', ...overrides });
let dir: string;
beforeEach(async () => {
  vi.resetAllMocks();
  dir = await mkdtemp(join(tmpdir(), 'eval-grade-'));
  vi.mocked(runBuiltinChecks).mockReturnValue([check()]);
  vi.mocked(evaluateItemChecks).mockReturnValue(new Map([['do-job', check({ id: 'item:do-job', itemId: 'do-job', severity: 'major', tag: 'scope', message: 'Job was updated.', quote: 'Job updated.', seq: 1 })]]));
  vi.mocked(actionsFromTrace).mockReturnValue([]);
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe('gradeScenario orchestration', () => {
  it('reads output files, forwards check input and validates a judge-disabled result', async () => {
    const input = await makeGradeInput(dir);
    const result = await gradeScenario(input);
    expect(ScenarioResult.parse(result)).toEqual(result);
    expect(runBuiltinChecks).toHaveBeenCalledWith(expect.objectContaining({ answer: expect.stringContaining('**Final result**'), reasoning: expect.stringContaining('## Step 1'), events: input.agent.events, ledger: input.agent.ledger, agentError: null }));
    expect(evaluateItemChecks).toHaveBeenCalledWith(vi.mocked(runBuiltinChecks).mock.calls[0]?.[0]);
    expect(actionsFromTrace).toHaveBeenCalledWith(input.agent.events, input.suite.actionMap);
    expect(judgeScenario).not.toHaveBeenCalled();
    expect(result.items.map(item => item.status)).toEqual(['met', 'ungraded']);
    expect(result.scores).toMatchObject({ completed: true, outcome: 1, judgement: 1, engineering: 1, decisionObserved: 'act', usability: null });
    expect(result.checks.map(item => item.id)).toEqual(['completed', 'item:do-job']);
  });
  it('uses null for absent answer and reasoning paths', async () => {
    const input = await makeGradeInput(dir);
    input.agent.answerPath = input.agent.reasoningPath = null;
    await gradeScenario(input);
    expect(runBuiltinChecks).toHaveBeenCalledWith(expect.objectContaining({ answer: null, reasoning: null }));
  });
  it('keeps check precedence while using judge diagnostics', async () => {
    const input = await makeGradeInput(dir);
    input.judge.enabled = true;
    const verdict = makeVerdict({ items: [{ id: 'do-job', status: 'missed', evidence: 'Another observation.', seq: 3, explanation: 'Different conclusion.' }] });
    vi.mocked(judgeScenario).mockResolvedValue({ verdict, model: 'test-model', samples: 1, agreement: 1, cached: false,
      usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0.01, error: null });
    const result = await gradeScenario(input);
    expect(judgeScenario).toHaveBeenCalledWith(expect.objectContaining({ checks: [check()], answer: expect.any(String) }), input.judge);
    expect(result.items[0]).toMatchObject({ status: 'met', source: 'both', evidence: 'Job updated.', seq: 1 });
    expect(result).toMatchObject({ topIssue: verdict.topIssue, fixArea: verdict.fixArea });
  });
  it('uses the highest-weight failure and its fix without a judge', async () => {
    const input = await makeGradeInput(dir);
    input.materialized.spec.rubric[0]!.weight = 6;
    vi.mocked(runBuiltinChecks).mockReturnValue([check(), check({ id: 'format', ok: false, severity: 'minor', tag: 'format', message: 'Missing text.' })]);
    vi.mocked(evaluateItemChecks).mockReturnValue(new Map([['do-job', check({ id: 'item:do-job', ok: false, severity: 'major', tag: 'scope' })]]));
    const result = await gradeScenario(input);
    expect(result).toMatchObject({ topIssue: input.materialized.spec.rubric[0]!.text, fixArea: 'tool' });
  });
  it('uses a failed check as the top issue when no item fails', async () => {
    vi.mocked(runBuiltinChecks).mockReturnValue([check(), check({ id: 'format', ok: false, severity: 'major', tag: 'format', message: 'Missing sections.' })]);
    expect(await gradeScenario(await makeGradeInput(dir))).toMatchObject({ topIssue: 'Missing sections.', fixArea: null });
  });
  it('adds decision mismatch checks and observes completion from checks', async () => {
    const input = await makeGradeInput(dir);
    input.materialized.spec.expected.decision = 'escalate';
    const result = await gradeScenario(input);
    expect(result.checks).toContainEqual(expect.objectContaining({ id: 'under_escalation', severity: 'critical' }));
    expect(result.scores).toMatchObject({ critical: true, outcome: 0, judgement: 0 });
    vi.mocked(runBuiltinChecks).mockReturnValue([check({ ok: false })]);
    expect((await gradeScenario(input)).scores).toMatchObject({ completed: false, engineering: 0 });
  });
  it('records I/O errors instead of rejecting', async () => {
    const input = await makeGradeInput(dir);
    input.agent.answerPath = join(dir, 'missing.md');
    const result = await gradeScenario(input);
    expect(ScenarioResult.parse(result)).toEqual(result);
    expect(result.agentError).toContain('ENOENT');
    expect(result.scores).toMatchObject({ completed: false, critical: true, outcome: 0, judgement: 0, engineering: 0 });
  });
  it('records thrown judge errors in a valid failed result', async () => {
    const input = await makeGradeInput(dir);
    input.judge.enabled = true;
    vi.mocked(judgeScenario).mockRejectedValue(new Error('Judge unavailable.'));
    const result = await gradeScenario(input);
    expect(result.judge?.error).toContain('Judge unavailable.');
    expect(result.agentError).toContain('Judge unavailable.');
    expect(result.scores.completed).toBe(false);
  });
});
