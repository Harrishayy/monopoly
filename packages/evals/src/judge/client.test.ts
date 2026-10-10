import Anthropic from '@anthropic-ai/sdk';
import { Messages } from '@anthropic-ai/sdk/resources/messages';
import { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages';
import type { ParsedMessage } from '@anthropic-ai/sdk/lib/parser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type JudgeClient } from '../schema';
import { buildJudgeRequest, createAnthropicJudgeClient, DEFAULT_JUDGE_MODEL, judgeOptionsFromEnv, judgeScenario } from './index';
import { judgeInput, verdict } from './fixtures';

function response(parsed: unknown = verdict(), stopReason: ParsedMessage<unknown>['stop_reason'] = 'end_turn'): ParsedMessage<unknown> {
  return {
    id: 'local-message', type: 'message', role: 'assistant', model: DEFAULT_JUDGE_MODEL,
    content: [], container: null, diagnostics: null, stop_reason: stopReason, stop_sequence: null, stop_details: null, parsed_output: parsed,
    usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 50, cache_creation_input_tokens: 30, cache_creation: null, inference_geo: null, server_tool_use: null, service_tier: null, output_tokens_details: null },
  };
}
const request = () => buildJudgeRequest(judgeInput(), { model: DEFAULT_JUDGE_MODEL, effort: 'high' });
const client = (fallbacks = true) => createAnthropicJudgeClient({ model: DEFAULT_JUDGE_MODEL, effort: 'high', fallbacks });

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockImplementation(async () => { throw new Error('Network forbidden in judge tests'); }); });
afterEach(() => { expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('Anthropic judge client without network', () => {
  it('constructs without a key and makes no request (compile-level JudgeClient contract)', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', undefined);
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', undefined);
    const regular = vi.spyOn(Messages.prototype, 'parse');
    const beta = vi.spyOn(BetaMessages.prototype, 'parse');
    const constructed: JudgeClient = client();
    expect(typeof constructed.complete).toBe('function');
    expect(regular).not.toHaveBeenCalled(); expect(beta).not.toHaveBeenCalled();
  });

  it('sends beta fallback settings, cache breakpoints, effort and signal', async () => {
    const parse = vi.spyOn(BetaMessages.prototype, 'parse').mockResolvedValue(response());
    const regular = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(response());
    const signal = new AbortController().signal;
    const result = await client().complete(request(), signal);
    expect(result).toMatchObject({ verdict: verdict(), model: DEFAULT_JUDGE_MODEL, stopReason: 'end_turn', usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 50, cacheWriteTokens: 30 } });
    expect(parse).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ model: DEFAULT_JUDGE_MODEL, max_tokens: 16000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', system: [{ type: 'text', text: request().system, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: [{ type: 'text', text: request().context, cache_control: { type: 'ephemeral' } }, { type: 'text', text: request().output }] }], output_config: expect.objectContaining({ effort: 'high' }) }), { signal });
    const params = parse.mock.calls[0]![0];
    for (const key of ['temperature', 'top_p', 'top_k', 'thinking', 'tool_choice']) expect(params).not.toHaveProperty(key);
    expect(regular).not.toHaveBeenCalled();
  });

  it('skips the beta path when fallbacks are disabled', async () => {
    const beta = vi.spyOn(BetaMessages.prototype, 'parse').mockResolvedValue(response());
    const regular = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(response());
    await client(false).complete(request());
    expect(beta).not.toHaveBeenCalled(); expect(regular).toHaveBeenCalledTimes(1);
    expect(regular.mock.calls[0]![0]).not.toHaveProperty('fallbacks');
    expect(regular.mock.calls[0]![0]).not.toHaveProperty('betas');
  });

  it('omits uncertainty from the API schema and defaults parsed items to certain', async () => {
    const value = verdict();
    const raw = { ...value, items: value.items.map(({ uncertain, ...item }) => item) };
    const parse = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(response(raw));
    const result = await client(false).complete(request());
    expect(result.verdict).toEqual(value);
    expect(result.verdict.items.every(item => item.uncertain === false)).toBe(true);
    const schema = parse.mock.calls[0]![0].output_config!.format!.schema;
    expect(schema).toMatchObject({ properties: { items: { items: {
      properties: { id: { type: 'string' }, status: { type: 'string' }, explanation: { type: 'string' } },
      required: ['id', 'status', 'evidence', 'seq', 'explanation'],
    } }, usability: { properties: { score: { type: 'number' } } } } });
    expect(JSON.stringify(schema)).not.toContain('uncertain');
  });

  it('checks refusal before accessing parsed_output and preserves its category', async () => {
    const refused = response(null, 'refusal');
    refused.stop_details = { type: 'refusal', category: 'general_harms', explanation: null };
    Object.defineProperty(refused, 'parsed_output', { get() { throw new Error('Must inspect refusal first'); } });
    const parse = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(refused);
    const result = await judgeScenario(judgeInput(), judgeOptionsFromEnv({}, { cacheDir: null, client: client(false) }));
    expect(result.error).toBe('Judge declined (category: general_harms)');
    expect(result.verdict).toBeNull(); expect(parse).toHaveBeenCalledTimes(1);
    expect(result.usage.inputTokens).toBe(100);
  });

  it.each(['null', 'invalid', 'max_tokens'] as const)('retries %s output once and sums both usages', async (kind) => {
    const invalid = verdict(); invalid.usability.score = 8;
    const first = kind === 'null' ? response(null) : kind === 'invalid' ? response(invalid) : response(verdict(), 'max_tokens');
    if (kind === 'max_tokens') Object.defineProperty(first, 'parsed_output', { get() { throw new Error('Must inspect max_tokens first'); } });
    const parse = vi.spyOn(Messages.prototype, 'parse').mockResolvedValueOnce(first).mockResolvedValueOnce(response());
    const result = await client(false).complete(request());
    expect(result.verdict).toEqual(verdict()); expect(result.usage.inputTokens).toBe(200);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('gives up after two invalid outputs and handles malformed JSON without hiding stop_reason', async () => {
    const parse = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(response(null));
    await expect(client(false).complete(request())).rejects.toThrow('Judge returned invalid output after two attempts');
    expect(parse).toHaveBeenCalledTimes(2);
    const format = parse.mock.calls[0]![0].output_config!.format!;
    if (!('parse' in format) || typeof format.parse !== 'function') throw new Error('Missing output parser');
    expect(format.parse('{broken')).toBeNull();
    expect(format.parse(JSON.stringify(verdict()))).toEqual(verdict());
  });

  it('does not retry other bad requests or exhausted SDK failures', async () => {
    for (const error of [new Anthropic.BadRequestError(400, {}, 'Unsupported option', new Headers()), new Anthropic.RateLimitError(429, {}, 'Rate limit', new Headers()), new Anthropic.InternalServerError(500, {}, 'Server error', new Headers())]) {
      const parse = vi.spyOn(Messages.prototype, 'parse').mockRejectedValue(error);
      await expect(client(false).complete(request())).rejects.toMatchObject({ cause: error });
      expect(parse).toHaveBeenCalledTimes(1); parse.mockRestore();
    }
  });

  it('records usage on final invalid output and preserves authentication guidance', async () => {
    const parse = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(response(null));
    const opts = judgeOptionsFromEnv({}, { cacheDir: null, client: client(false) });
    const failed = await judgeScenario(judgeInput(), opts);
    expect(failed).toMatchObject({ verdict: null, error: 'Judge returned invalid output after two attempts', usage: { inputTokens: 200, outputTokens: 40 } });
    parse.mockRejectedValue(new Anthropic.AuthenticationError(401, { message: 'Invalid credentials' }, undefined, new Headers()));
    const unauthenticated = await judgeScenario(judgeInput(), opts);
    expect(unauthenticated.error).toContain('Judge unavailable: no valid Anthropic credentials');
    expect(unauthenticated.usage.inputTokens).toBe(0);
  });

  it('creates API clients lazily once per options object', async () => {
    const parse = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(response());
    const opts = judgeOptionsFromEnv({}, { cacheDir: null, fallbacks: false });
    await judgeScenario(judgeInput(), opts); await judgeScenario(judgeInput(), opts);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.contexts[0]).toBe(parse.mock.contexts[1]);
  });

  // This test is last because rejection intentionally disables beta fallbacks process-wide.
  it('retries unsupported fallback once and remembers rejection across clients', async () => {
    const beta = vi.spyOn(BetaMessages.prototype, 'parse').mockRejectedValue(new Anthropic.BadRequestError(400, { message: 'Unknown fallback beta' }, undefined, new Headers()));
    const regular = vi.spyOn(Messages.prototype, 'parse').mockResolvedValue(response());
    await client().complete(request()); await client().complete(request());
    expect(beta).toHaveBeenCalledTimes(1); expect(regular).toHaveBeenCalledTimes(2);
  });
});
