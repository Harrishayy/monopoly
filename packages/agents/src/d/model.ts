import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { outputFormat } from '../b/llm/client';
import type { ModelCallRecord, Usage } from './types';

/** One Messages API call; injected so tests and offline runs need no network. */
export type Caller = (params: Anthropic.MessageCreateParamsNonStreaming, signal?: AbortSignal) => Promise<Anthropic.Message>;

export const MODELS = {
  /** The voters and the retry. */
  decide: () => process.env.AGENT_D_MODEL || 'claude-haiku-5-5',
  /** The gated supervisor. */
  supervisor: () => process.env.AGENT_D_SUPERVISOR_MODEL || 'claude-opus-5-5',
};

/**
 * Output budget per call, thinking included. Generous on purpose: a long case at high effort must not be cut
 * off before it writes its JSON. A call that still stops at the limit is retried once with double the budget.
 */
export const MAX_TOKENS = (role: ModelCallRecord['role']) =>
  role === 'supervisor' ? Number(process.env.AGENT_D_SUPERVISOR_MAX_TOKENS ?? 64_000) : Number(process.env.AGENT_D_MAX_TOKENS ?? 32_000);

export const EFFORT = () => (process.env.AGENT_D_EFFORT as 'low' | 'medium' | 'high' | undefined) || 'high';

/**
 * Estimated USD per million tokens [input, output]. Cache reads are billed at 10% of input and cache
 * writes at 125%. Override with AGENT_D_PRICES='{"model":[in,out]}' when the price list changes.
 */
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [1.5, 7.5],
  'claude-opus-5-5': [4, 20],
  ...(process.env.AGENT_D_PRICES ? (JSON.parse(process.env.AGENT_D_PRICES) as Record<string, [number, number]>) : {}),
};

export const zeroUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    costUsd: a.costUsd + b.costUsd,
  };
}

function usageOf(model: string, u: Anthropic.Usage | undefined): Usage {
  const [pin, pout] = PRICES[model] ?? [0, 0];
  const input = u?.input_tokens ?? 0;
  const output = u?.output_tokens ?? 0;
  const read = u?.cache_read_input_tokens ?? 0;
  const write = u?.cache_creation_input_tokens ?? 0;
  const costUsd = (input * pin + output * pout + read * pin * 0.1 + write * pin * 1.25) / 1_000_000;
  return { inputTokens: input, outputTokens: output, cacheReadTokens: read, cacheWriteTokens: write, costUsd };
}

export function defaultCaller(): Caller | undefined {
  if (!process.env.ANTHROPIC_API_KEY) return undefined;
  const client = new Anthropic({ maxRetries: 4, timeout: 240_000 });
  return (params, signal) => client.messages.create(params, { signal });
}

/** A per-process cap on supervisor calls and spend, so a batch can never run away. */
export const budget = {
  calls: 0,
  usd: 0,
  maxCalls: () => Number(process.env.AGENT_D_SUPERVISOR_MAX_CALLS ?? 200),
  maxUsd: () => Number(process.env.AGENT_D_SUPERVISOR_MAX_USD ?? 25),
  enabled: () => process.env.AGENT_D_SUPERVISOR !== 'off',
  allows() {
    return this.enabled() && this.calls < this.maxCalls() && this.usd < this.maxUsd();
  },
};

export interface JsonRequest<T> {
  role: ModelCallRecord['role'];
  model: string;
  system: string;
  /** Case content: identical across the votes, so it is cached. */
  caseText: string;
  /** The instruction for this call, after the cached part. */
  task: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Structured output with adaptive thinking at the configured effort, validated again with zod. One retry
 * that shows the model its schema error. Never throws: failures come back as `value: undefined`.
 */
export async function callJson<T>(caller: Caller, req: JsonRequest<T>): Promise<{ value?: T; record: ModelCallRecord }> {
  const format = outputFormat(req.schema);
  let task = req.task;
  let total = zeroUsage();
  let error = 'no attempt';
  let maxTokens = Math.max(req.maxTokens ?? 0, MAX_TOKENS(req.role));
  const started = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const msg = await caller(
        {
          model: req.model,
          max_tokens: maxTokens,
          thinking: { type: 'adaptive' },
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: req.caseText, cache_control: { type: 'ephemeral' } },
                { type: 'text', text: task },
              ],
            },
          ],
          output_config: { format, effort: EFFORT() },
        },
        req.signal,
      );
      total = addUsage(total, usageOf(req.model, msg.usage));
      if (msg.stop_reason === 'refusal') {
        error = 'model refused';
        break;
      }
      if (msg.stop_reason === 'max_tokens') {
        error = `stopped at the ${maxTokens}-token output limit`;
        maxTokens = Math.min(maxTokens * 2, 128_000);
        continue;
      }
      const raw = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        error = `not JSON (stop_reason ${msg.stop_reason}): ${raw.slice(0, 160)}`;
        task = `${req.task}\n\nYour previous answer was not valid JSON. Answer again with JSON only.`;
        continue;
      }
      const parsed = req.schema.safeParse(json);
      if (parsed.success) {
        return { value: parsed.data, record: { role: req.role, model: req.model, ok: true, ms: Date.now() - started, usage: total } };
      }
      error = `schema: ${z.prettifyError(parsed.error).slice(0, 400)}`;
      task = `${req.task}\n\nYour previous answer did not match the schema:\n${error}\nAnswer again, following it exactly.`;
    } catch (err) {
      if (req.signal?.aborted) {
        error = 'timed out';
        break;
      }
      error = err instanceof Error ? err.message.slice(0, 300) : String(err);
      if (err instanceof Anthropic.BadRequestError) break;
    }
  }
  return { record: { role: req.role, model: req.model, ok: false, ms: Date.now() - started, usage: total, error } };
}
