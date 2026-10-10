import Anthropic from '@anthropic-ai/sdk';
import { claudeCodeModelClient, evalBackend } from '../claude-code';

/** One Messages API call. Injected so tests and offline runs need no network. */
export type ModelClient = (params: Anthropic.MessageCreateParamsNonStreaming, signal?: AbortSignal) => Promise<Anthropic.Message>;

export const DEFAULT_DECIDE_MODEL = 'claude-haiku-5-5';

/** The real client, or undefined when no API key is configured (runs then use the playbook). */
export function defaultModelClient(): ModelClient | undefined {
  if (evalBackend() === 'claude-code') return claudeCodeModelClient();
  if (!process.env.ANTHROPIC_API_KEY) return undefined;
  // Batch runs hit rate limits; the SDK backs off (honouring retry-after) on 429 and 529.
  const client = new Anthropic({ maxRetries: Number(process.env.MODEL_MAX_RETRIES ?? 8), timeout: 180_000 });
  return (params, signal) => client.messages.create(params, { signal });
}

export function decideModel(): string {
  return process.env.MODEL_DECIDE || DEFAULT_DECIDE_MODEL;
}

/** Tool names may only use [a-zA-Z0-9_-]; packs use dots ("landlord.chase"). */
export const toApiName = (name: string) => name.replace(/\./g, '__');
export const fromApiName = (name: string) => name.replace(/__/g, '.');
