import { afterEach, describe, expect, it } from 'vitest';
import { claudeCodeModelAlias, claudeCodeModelClient, evalBackend, parseClaudeCodeStdout, setClaudeCodeRunner } from './claude-code';

afterEach(() => setClaudeCodeRunner(undefined));

describe('evalBackend', () => {
  it('treats claude, claude-code and plan as the Claude Code backend', () => {
    expect(evalBackend({})).toBe('api');
    expect(evalBackend({ EVAL_BACKEND: 'api' })).toBe('api');
    expect(evalBackend({ EVAL_BACKEND: 'claude-code' })).toBe('claude-code');
    expect(evalBackend({ MODEL_BACKEND: 'plan' })).toBe('claude-code');
    expect(evalBackend({ EVAL_BACKEND: 'Claude' })).toBe('claude-code');
  });
});

describe('claudeCodeModelAlias', () => {
  it('maps full ids to Claude Code aliases', () => {
    expect(claudeCodeModelAlias('claude-haiku-5-5')).toBe('haiku');
    expect(claudeCodeModelAlias('claude-sonnet-5-5')).toBe('sonnet');
    expect(claudeCodeModelAlias('claude-opus-5-5')).toBe('opus');
    expect(claudeCodeModelAlias('haiku')).toBe('haiku');
  });
});

describe('parseClaudeCodeStdout', () => {
  it('reads a successful print-mode result object', () => {
    const parsed = parseClaudeCodeStdout(JSON.stringify({
      type: 'result', subtype: 'success', is_error: false,
      result: { decision: { observed: 'ask', match: 'primary', explanation: 'ok' } },
      model: 'claude-sonnet-5-5', total_cost_usd: 0,
      usage: { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 2, cache_creation_input_tokens: 1 },
    }), 'fallback');
    expect(parsed.json).toEqual({ decision: { observed: 'ask', match: 'primary', explanation: 'ok' } });
    expect(parsed.model).toBe('claude-sonnet-5-5');
    expect(parsed.usage).toEqual({ inputTokens: 10, outputTokens: 4, cacheReadTokens: 2, cacheWriteTokens: 1 });
  });

  it('parses a string result as JSON when it can', () => {
    const parsed = parseClaudeCodeStdout(JSON.stringify({ result: '{"ok":true}' }), 'haiku');
    expect(parsed.json).toEqual({ ok: true });
    expect(parsed.model).toBe('haiku');
  });

  it('throws on an error result', () => {
    expect(() => parseClaudeCodeStdout(JSON.stringify({ is_error: true, result: 'not logged in' }), 'x')).toThrow('not logged in');
  });
});

describe('claudeCodeModelClient', () => {
  it('turns a Claude Code result into a Messages-API-shaped response', async () => {
    setClaudeCodeRunner(async (req) => {
      expect(req.prompt).toContain('case text');
      expect(req.system).toContain('You are the agent');
      expect(req.schema).toEqual({ type: 'object', properties: { action: { type: 'string' } } });
      expect(req.model).toBe('claude-haiku-5-5');
      return { text: '{"action":"ask"}', json: { action: 'ask' }, usage: { inputTokens: 3, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: null, model: 'haiku' };
    });
    const message = await claudeCodeModelClient()({
      model: 'claude-haiku-5-5', max_tokens: 100,
      system: [{ type: 'text', text: 'You are the agent.' }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'case text' }] }],
      output_config: { format: { type: 'json_schema', schema: { type: 'object', properties: { action: { type: 'string' } } } } },
    });
    expect(message.content).toEqual([{ type: 'text', text: '{"action":"ask"}' }]);
    expect(message.usage.input_tokens).toBe(3);
    expect(message.stop_reason).toBe('end_turn');
  });
});
