import { afterEach, describe, expect, it } from 'vitest';
import { setClaudeCodeRunner } from '@casework/core/claude-code';
import { createClaudeCodeJudgeClient, judgeOptionsFromEnv, judgeScenario } from './index';
import { judgeInput, verdict } from './fixtures';

afterEach(() => setClaudeCodeRunner(undefined));

describe('Claude Code judge', () => {
  it('defaults concurrency to 2 on the Claude Code backend', () => {
    expect(judgeOptionsFromEnv({ EVAL_BACKEND: 'claude-code' })).toMatchObject({ backend: 'claude-code', concurrency: 2 });
    expect(judgeOptionsFromEnv({ EVAL_BACKEND: 'claude-code', JUDGE_CONCURRENCY: '1' })).toMatchObject({ concurrency: 1 });
    expect(judgeOptionsFromEnv({})).toMatchObject({ backend: 'api', concurrency: 4 });
  });

  it('grades through the injected Claude Code runner and never calls the API', async () => {
    let seen = '';
    setClaudeCodeRunner(async (req) => {
      seen = `${req.system}\n${req.prompt}`;
      expect(req.schema).toMatchObject({ type: 'object' });
      expect(req.effort).toBe('medium');
      return { text: JSON.stringify(verdict()), json: verdict(), usage: { inputTokens: 8, outputTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0, model: 'sonnet' };
    });
    const result = await judgeScenario(judgeInput(), judgeOptionsFromEnv({}, {
      cacheDir: null, backend: 'claude-code', effort: 'medium', client: createClaudeCodeJudgeClient({ model: 'claude-sonnet-5-5', effort: 'medium' }),
    }));
    expect(result.verdict).toEqual(verdict());
    expect(result.model).toBe('sonnet');
    expect(result.error).toBeNull();
    expect(seen).toContain('You are grading');
    expect(seen).toContain('Please confirm the job scope.');
  });

  it('retries once when the first payload is invalid', async () => {
    let calls = 0;
    setClaudeCodeRunner(async () => {
      calls += 1;
      if (calls === 1) return { text: '{}', json: {}, usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: null, model: 'sonnet' };
      return { text: JSON.stringify(verdict()), json: verdict(), usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: null, model: 'sonnet' };
    });
    const result = await createClaudeCodeJudgeClient({ model: 'claude-sonnet-5-5', effort: 'low' }).complete({
      system: 'sys', context: 'ctx', output: 'out', model: 'claude-sonnet-5-5', effort: 'low', sample: 0,
    });
    expect(calls).toBe(2);
    expect(result.verdict).toEqual(verdict());
    expect(result.usage.inputTokens).toBe(2);
  });
});
