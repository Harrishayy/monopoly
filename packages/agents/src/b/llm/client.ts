import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { claudeCodeModelClient, evalBackend } from '@casework/core/claude-code';
import { z } from 'zod';
import type { ModelCall } from '../types';

/** One Messages API call. Injected so tests and offline runs need no network. */
export type Caller = (params: Anthropic.MessageCreateParamsNonStreaming, signal?: AbortSignal) => Promise<Anthropic.Message>;

/** Every stage runs on Haiku 5.5 unless overridden per stage. */
export const DEFAULT_MODEL = 'claude-haiku-5-5';
export const MODELS = {
  decide: () => process.env.AGENT_B_MODEL_DECIDE || DEFAULT_MODEL,
  read: () => process.env.AGENT_B_MODEL_READ || DEFAULT_MODEL,
  /** The reviewer; defaults to the decide model, as before. */
  critic: () => process.env.AGENT_B_MODEL_CRITIC || process.env.AGENT_B_MODEL_DECIDE || DEFAULT_MODEL,
  fallback: () => process.env.AGENT_B_MODEL_FALLBACK || DEFAULT_MODEL,
};

/** The real caller, or undefined when no API key is configured. */
export function defaultCaller(): Caller | undefined {
  if (evalBackend() === 'claude-code') return claudeCodeModelClient();
  if (!process.env.ANTHROPIC_API_KEY) return undefined;
  const client = new Anthropic({ maxRetries: 4, timeout: 240_000 });
  return (params, signal) => client.messages.create(params, { signal });
}

export interface StructuredRequest<T> {
  stage: string;
  model: string;
  /** Static, cacheable instructions (role + manuals). */
  system: string;
  /** Case content first (cached across stages), stage instructions last. */
  content: Anthropic.ContentBlockParam[];
  schema: z.ZodType<T>;
  maxTokens?: number;
  signal?: AbortSignal;
}

export class StageError extends Error {
  constructor(
    message: string,
    readonly stage: string,
  ) {
    super(message);
  }
}

/**
 * Structured output (`output_config.format` with a JSON schema), validated again with zod.
 * On invalid output it retries once with the validation error, then once on the fallback model.
 * Every attempt is recorded in `calls`.
 */
export async function structured<T>(caller: Caller, req: StructuredRequest<T>, calls: ModelCall[]): Promise<T> {
  const format = outputFormat(req.schema);
  const models = [req.model, req.model, MODELS.fallback()].filter((m, i, a) => i < 2 || m !== a[0]);
  let lastError = 'no attempt made';
  let content = req.content;
  for (const [attempt, model] of models.entries()) {
    const started = Date.now();
    try {
      const msg = await caller(
        {
          model,
          max_tokens: req.maxTokens ?? 8000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content }],
          output_config: { format },
        },
        req.signal,
      );
      const call: ModelCall = {
        stage: req.stage,
        model,
        ok: false,
        ms: Date.now() - started,
        inputTokens: msg.usage?.input_tokens,
        outputTokens: msg.usage?.output_tokens,
        cacheReadTokens: msg.usage?.cache_read_input_tokens ?? undefined,
        requestId: msg.id,
      };
      const raw = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        lastError = `response is not JSON (stop_reason ${msg.stop_reason}): ${raw.slice(0, 200)}`;
        calls.push({ ...call, error: lastError });
        continue;
      }
      const parsed = req.schema.safeParse(json);
      if (parsed.success) {
        calls.push({ ...call, ok: true });
        return parsed.data;
      }
      lastError = `invalid output: ${z.prettifyError(parsed.error).slice(0, 800)}`;
      calls.push({ ...call, error: lastError });
      // Show the model its mistake on the next attempt.
      content = [...req.content, { type: 'text', text: `Your previous answer did not match the required schema:\n${lastError}\nAnswer again, following the schema exactly.` }];
    } catch (err) {
      if (req.signal?.aborted) throw new StageError('timed out', req.stage);
      lastError = err instanceof Error ? err.message : String(err);
      calls.push({ stage: req.stage, model, ok: false, ms: Date.now() - started, error: lastError.slice(0, 300) });
      // A bad request will not get better by retrying the same model.
      if (attempt === 0 && err instanceof Anthropic.BadRequestError) continue;
    }
  }
  throw new StageError(lastError, req.stage);
}

/** The JSON schema the API constrains output to. The SDK helper adapts zod to what structured outputs accept. */
export function outputFormat(schema: z.ZodType): Anthropic.JSONOutputFormat {
  return { type: 'json_schema', schema: zodOutputFormat(schema).schema };
}
