import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { JudgeItem, JudgeVerdict, type JudgeClient, type JudgeEffort, type TokenUsage } from '../schema';

let fallbackRejected = false;
const apiVerdict = JudgeVerdict.extend({
  items: z.array(JudgeItem.omit({ uncertain: true })),
  usability: z.object({ score: z.number(), explanation: z.string() }),
});

/** Retain billable response usage when a completion cannot produce a verdict. */
export class JudgeCompletionError extends Error {
  constructor(error: unknown, readonly usage: TokenUsage, readonly model: string) {
    super(judgeErrorMessage(error), { cause: error });
    this.name = 'JudgeCompletionError';
  }
}

// The SDK normally parses before exposing stop_reason. Defer validation so a
// refusal or truncated JSON cannot hide the response's stop details and usage.
const format = {
  ...zodOutputFormat(apiVerdict),
  parse(text: string): unknown {
    try { return JSON.parse(text); } catch { return null; }
  },
};

/** Create a structured verdict client without making requests. */
export function createAnthropicJudgeClient(opts: { model: string; effort: JudgeEffort; fallbacks: boolean; maxRetries?: number; timeoutMs?: number }): JudgeClient {
  const client = new Anthropic({ maxRetries: opts.maxRetries ?? 4, timeout: opts.timeoutMs ?? 600_000 });
  return {
    async complete(req, signal) {
      const params = {
        model: req.model, max_tokens: 16000,
        system: [{ type: 'text' as const, text: req.system, cache_control: { type: 'ephemeral' as const } }],
        messages: [{ role: 'user' as const, content: [
          { type: 'text' as const, text: req.context, cache_control: { type: 'ephemeral' as const } },
          { type: 'text' as const, text: req.output },
        ] }],
        output_config: { effort: req.effort, format },
      };
      const request = async () => {
        if (opts.fallbacks && !fallbackRejected) {
          try {
            return await client.beta.messages.parse({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { signal });
          } catch (error) {
            if (!(error instanceof Anthropic.BadRequestError) || !/fallback|beta/i.test(error.message)) throw error;
            fallbackRejected = true;
          }
        }
        return client.messages.parse(params, { signal });
      };
      const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
      let model = req.model;
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await request();
          model = response.model;
          usage.inputTokens += response.usage.input_tokens;
          usage.outputTokens += response.usage.output_tokens;
          usage.cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;
          usage.cacheWriteTokens += response.usage.cache_creation_input_tokens ?? 0;
          if (response.stop_reason === 'refusal') {
            throw new Error(`Judge declined (category: ${response.stop_details?.category ?? 'unknown'})`);
          }
          if (response.stop_reason === 'max_tokens') continue;
          const verdict = JudgeVerdict.safeParse(response.parsed_output);
          if (verdict.success) {
            return { verdict: verdict.data, usage, model: response.model, stopReason: response.stop_reason };
          }
        }
        throw new Error('Judge returned invalid output after two attempts');
      } catch (error) {
        throw new JudgeCompletionError(error, usage, model);
      }
    },
  };
}

/** Convert SDK authentication failures and other errors into batch-safe messages. */
export function judgeErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return 'Judge unavailable: no valid Anthropic credentials (set ANTHROPIC_API_KEY or run `ant auth login`, or use --judge off)';
  }
  return error instanceof Error ? error.message : String(error);
}
