import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pLimit from 'p-limit';
import { z } from 'zod';
import { JudgeVerdict, TokenUsage, type JudgeOptions, type JudgeInput, type JudgeClient, type JudgeRecord, type JudgeResponse } from '../schema';
import { defaultOutRoot } from '../paths';
import { createAnthropicJudgeClient, JudgeCompletionError, judgeErrorMessage } from './client';
import { buildJudgeRequest } from './request';
import { mergeVerdicts } from './merge';

export { buildJudgeRequest, createAnthropicJudgeClient };
export const JUDGE_PROMPT_VERSION: string = '2';
export const DEFAULT_JUDGE_MODEL = 'claude-opus-5-5';

const effortSchema = z.enum(['low', 'medium', 'high', 'xhigh', 'max']);
const clients = new WeakMap<JudgeOptions, JudgeClient>();
const limiters = new Map<number, ReturnType<typeof pLimit>>();
const cachedResponse = z.object({ verdict: JudgeVerdict, usage: TokenUsage, model: z.string(), stopReason: z.string().nullable() });
const zeroUsage = (): TokenUsage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be an integer >= 1`);
  return value;
}

/** Resolve judge settings from environment and explicit overrides, validating effort and counts. */
export function judgeOptionsFromEnv(env: NodeJS.ProcessEnv = process.env, overrides?: Partial<JudgeOptions>): JudgeOptions {
  const opts = {
    enabled: true, model: env.MODEL_JUDGE ?? DEFAULT_JUDGE_MODEL,
    effort: env.JUDGE_EFFORT ?? 'high', samples: Number(env.JUDGE_SAMPLES ?? 1),
    concurrency: Number(env.JUDGE_CONCURRENCY ?? 4), fallbacks: env.JUDGE_FALLBACKS !== 'off',
    cacheDir: join(defaultOutRoot(), 'cache/judge'), ...overrides,
  };
  return { ...opts, effort: effortSchema.parse(opts.effort), samples: positiveInteger(opts.samples, 'samples'), concurrency: positiveInteger(opts.concurrency, 'concurrency') };
}

async function readCache(path: string): Promise<JudgeResponse | null> {
  try {
    const parsed = cachedResponse.safeParse(JSON.parse(await readFile(path, 'utf8')));
    if (!parsed.success || parsed.data.stopReason === 'refusal' || parsed.data.stopReason === 'max_tokens') return null;
    return parsed.data;
  } catch { return null; }
}

async function writeCache(path: string, dir: string, response: JudgeResponse): Promise<void> {
  await mkdir(dir, { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(response), 'utf8');
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

/** Grade one scenario without throwing, aggregating successful samples and cache usage. */
export async function judgeScenario(input: JudgeInput, opts: JudgeOptions): Promise<JudgeRecord> {
  const usage = zeroUsage();
  let model = opts.model;
  const samples: JudgeVerdict[] = [];
  let cached = true;
  const record = (): JudgeRecord => ({ verdict: null, model, samples: samples.length, agreement: null, cached: false, usage, costUsd: null, error: null });
  if (!opts.enabled) return { ...record(), error: 'judge disabled' };
  try {
    positiveInteger(opts.samples, 'samples');
    positiveInteger(opts.concurrency, 'concurrency');
    effortSchema.parse(opts.effort);
    for (let sample = 0; sample < opts.samples; sample++) {
      const request = buildJudgeRequest(input, opts, sample);
      const key = createHash('sha256').update(JSON.stringify({ v: JUDGE_PROMPT_VERSION, model: request.model, effort: request.effort, sample, system: request.system, context: request.context, output: request.output })).digest('hex');
      const path = opts.cacheDir ? join(opts.cacheDir, `${key}.json`) : null;
      let response = path ? await readCache(path) : null;
      if (!response) {
        cached = false;
        let client = opts.client ?? clients.get(opts);
        if (!client) { client = createAnthropicJudgeClient(opts); clients.set(opts, client); }
        let limit = limiters.get(opts.concurrency);
        if (!limit) { limit = pLimit(opts.concurrency); limiters.set(opts.concurrency, limit); }
        const activeClient = client;
        response = await limit(() => activeClient.complete(request));
        const callUsage = TokenUsage.parse(response.usage);
        for (const key of Object.keys(usage) as (keyof TokenUsage)[]) usage[key] += callUsage[key];
        if (response.stopReason === 'refusal') throw new Error('Judge declined (category: unknown)');
        if (response.stopReason === 'max_tokens') throw new Error('Judge returned invalid output (max_tokens)');
        response = { ...response, verdict: JudgeVerdict.parse(response.verdict), usage: callUsage };
        if (path && opts.cacheDir) await writeCache(path, opts.cacheDir, response);
      }
      if (!samples.length) model = response.model;
      samples.push(response.verdict);
    }
    const merged = mergeVerdicts(samples, input.materialized.spec);
    return { ...record(), ...merged, cached, costUsd: cached ? 0 : estimateCostUsd(model, usage) };
  } catch (error) {
    if (error instanceof JudgeCompletionError) {
      model = error.model;
      for (const key of Object.keys(usage) as (keyof TokenUsage)[]) usage[key] += error.usage[key];
    }
    return { ...record(), costUsd: estimateCostUsd(model, usage), error: judgeErrorMessage(error) };
  }
}

/** Estimate dollars from separate token categories for known models, rounded to four decimals. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const rates: Record<string, readonly [number, number, number, number]> = {
    'claude-opus-5-5': [4, 20, 0.20, 5],
    'claude-sonnet-5-5': [2, 10, 0.20, 2.5],
    'claude-haiku-5-5': [0.10, 0.50, 0.01, 0.125],
  };
  const rate = rates[model];
  if (!rate) return null;
  return Math.round((usage.inputTokens * rate[0] + usage.outputTokens * rate[1] + usage.cacheReadTokens * rate[2] + usage.cacheWriteTokens * rate[3]) / 1_000_000 * 10000) / 10000;
}
