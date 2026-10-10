import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { ScenarioResult } from '../schema';
import { evaluateItemChecks, runBuiltinChecks } from '../checks';
import { NotImplementedYet } from '../stub';
import { gradeScenario } from './index';
import { makeGradeInput } from './fixtures';

it('grades handmade materialization and answer files with the real checks, judge disabled', async context => {
  const dir = await mkdtemp(join(tmpdir(), 'eval-grade-integration-'));
  try {
    const input = await makeGradeInput(dir);
    try {
      const checkInput = { scenario: input.scenario, materialized: input.materialized, suite: input.suite,
        events: input.agent.events, answer: null, reasoning: null, ledger: input.agent.ledger, agentError: null };
      runBuiltinChecks(checkInput);
      evaluateItemChecks(checkInput);
    } catch (error) {
      if (error instanceof NotImplementedYet) {
        context.skip('Checks are still NotImplementedYet; retain this integration test until they land.');
        return;
      }
      throw error;
    }
    const result = await gradeScenario(input);
    expect(ScenarioResult.parse(result)).toEqual(result);
    expect(result.agentError).toBeNull();
    expect(result.scores).toMatchObject({ completed: true, critical: false, outcome: 1, judgement: 1, engineering: 1, usability: null });
    expect(result.items.map(item => item.status)).toEqual(['met', 'ungraded']);
    expect(result.checks.every(check => check.ok)).toBe(true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
