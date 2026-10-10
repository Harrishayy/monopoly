import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultCaller as defaultB } from '../src/b/llm/client';
import { defaultCaller as defaultD } from '../src/d/model';

afterEach(() => vi.unstubAllEnvs());

describe('Claude Code eval backend', () => {
  it('gives B and D a caller without an API key', () => {
    vi.stubEnv('EVAL_BACKEND', 'claude-code');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(defaultB()).toEqual(expect.any(Function));
    expect(defaultD()).toEqual(expect.any(Function));
  });

  it('stays offline when the API is unset and the backend is api', () => {
    vi.stubEnv('EVAL_BACKEND', 'api');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(defaultB()).toBeUndefined();
    expect(defaultD()).toBeUndefined();
  });
});
