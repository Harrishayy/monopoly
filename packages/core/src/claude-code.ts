import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';

/** How model calls are billed: the Messages API, or the logged-in Claude Code plan. */
export type EvalBackend = 'api' | 'claude-code';

export function evalBackend(env: NodeJS.ProcessEnv = process.env): EvalBackend {
  const value = (env.EVAL_BACKEND ?? env.MODEL_BACKEND ?? '').trim().toLowerCase();
  return value === 'claude-code' || value === 'claude' || value === 'plan' ? 'claude-code' : 'api';
}

/** Claude Code --model wants an alias; our code stores full ids like claude-haiku-5-5. */
export function claudeCodeModelAlias(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes('haiku')) return 'haiku';
  if (lower.includes('sonnet')) return 'sonnet';
  if (lower.includes('opus')) return 'opus';
  return model;
}

export interface ClaudeCodeRequest {
  prompt: string;
  system?: string;
  schema?: Record<string, unknown>;
  model: string;
  effort?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ClaudeCodeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ClaudeCodeResult {
  text: string;
  json: unknown;
  usage: ClaudeCodeUsage;
  costUsd: number | null;
  model: string;
}

export type ClaudeCodeRunner = (req: ClaudeCodeRequest) => Promise<ClaudeCodeResult>;

let testRunner: ClaudeCodeRunner | undefined;

/** Tests inject a runner so nothing shells out to `claude`. */
export function setClaudeCodeRunner(runner?: ClaudeCodeRunner): void {
  testRunner = runner;
}

export async function runClaudeCode(req: ClaudeCodeRequest): Promise<ClaudeCodeResult> {
  if (testRunner) return testRunner(req);
  return spawnClaudeCode(req);
}

function numberOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Read the JSON object `claude -p --output-format json` prints. */
export function parseClaudeCodeStdout(stdout: string, fallbackModel: string): ClaudeCodeResult {
  const trimmed = stdout.trim();
  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    const start = trimmed.lastIndexOf('{');
    if (start < 0) throw new Error(`Claude Code returned no JSON: ${trimmed.slice(0, 200)}`);
    payload = JSON.parse(trimmed.slice(start));
  }
  if (!payload || typeof payload !== 'object') throw new Error('Claude Code returned an empty result.');
  const row = payload as Record<string, unknown>;
  if (row.is_error === true || row.subtype === 'error') {
    throw new Error(typeof row.result === 'string' ? row.result : 'Claude Code reported an error.');
  }
  const raw = row.result;
  let json: unknown = null;
  let text = '';
  if (typeof raw === 'string') {
    text = raw;
    try { json = JSON.parse(raw); } catch { json = raw; }
  } else if (raw != null) {
    json = raw;
    text = JSON.stringify(raw);
  } else if (typeof row.structured_output === 'object') {
    json = row.structured_output;
    text = JSON.stringify(json);
  }
  if (!text) throw new Error('Claude Code returned an empty result.');
  const usageRow = (row.usage && typeof row.usage === 'object' ? row.usage : {}) as Record<string, unknown>;
  return {
    text,
    json,
    model: typeof row.model === 'string' && row.model ? row.model : fallbackModel,
    costUsd: typeof row.total_cost_usd === 'number' ? row.total_cost_usd : null,
    usage: {
      inputTokens: numberOf(usageRow.input_tokens ?? usageRow.inputTokens),
      outputTokens: numberOf(usageRow.output_tokens ?? usageRow.outputTokens),
      cacheReadTokens: numberOf(usageRow.cache_read_input_tokens ?? usageRow.cacheReadTokens),
      cacheWriteTokens: numberOf(usageRow.cache_creation_input_tokens ?? usageRow.cacheWriteTokens),
    },
  };
}

function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  // A spent or empty API key would win over the plan login. The point of this backend is the plan.
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

async function spawnClaudeCode(req: ClaudeCodeRequest): Promise<ClaudeCodeResult> {
  const bin = process.env.CLAUDE_CODE_BIN || 'claude';
  const alias = claudeCodeModelAlias(req.model);
  const work = await mkdtemp(join(tmpdir(), 'casework-claude-'));
  const args = [
    '-p',
    '--output-format', 'json',
    '--input-format', 'text',
    '--tools', '',
    '--disable-slash-commands',
    '--restricted',
    '--permission-prompts', 'none',
    '--model', alias,
  ];
  if (req.effort) args.push('--effort', req.effort);
  const system = req.system?.trim() || 'Follow the user instructions. Return only the requested JSON.';
  args.push('--system-prompt', system);
  if (req.schema) args.push('--json-schema', JSON.stringify(req.schema));
  const timeoutMs = req.timeoutMs ?? 600_000;
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(bin, args, { cwd: work, env: childEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        req.signal?.removeEventListener('abort', onAbort);
        if (error) reject(error);
      };
      const onAbort = () => {
        child.kill('SIGTERM');
        finish(new Error('Claude Code call was cancelled.'));
      };
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        finish(new Error(`Claude Code timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk));
      child.on('error', (error) => {
        const message = error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? `Claude Code is not installed (looked for \`${bin}\`). Install it and run \`claude\` once to sign in.`
          : error instanceof Error ? error.message : String(error);
        finish(new Error(message));
      });
      child.on('close', (code) => {
        const out = Buffer.concat(chunks).toString('utf8');
        const err = Buffer.concat(errChunks).toString('utf8').trim();
        if (code !== 0 && !out.trim()) {
          finish(new Error(err || `Claude Code exited ${code}.`));
          return;
        }
        try { resolve(out); finish(); }
        catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
      });
      if (req.signal?.aborted) onAbort();
      else req.signal?.addEventListener('abort', onAbort, { once: true });
      child.stdin.write(req.prompt);
      child.stdin.end();
    });
    return parseClaudeCodeStdout(stdout, req.model);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not logged in|not authenticated|login required/i.test(message)) {
      throw new Error('Claude Code is not logged in. Run `claude` once to sign in to the plan, then retry.');
    }
    throw error;
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

function blocksText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.flatMap((block) => {
    if (typeof block === 'string') return [block];
    if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block) return [String(block.text)];
    return [];
  }).join('\n\n');
}

function schemaOf(params: Anthropic.MessageCreateParamsNonStreaming): Record<string, unknown> | undefined {
  const format = params.output_config && typeof params.output_config === 'object' && 'format' in params.output_config
    ? params.output_config.format
    : undefined;
  if (format && typeof format === 'object' && 'schema' in format && format.schema && typeof format.schema === 'object') {
    return format.schema as Record<string, unknown>;
  }
  return undefined;
}

function effortOf(params: Anthropic.MessageCreateParamsNonStreaming): string | undefined {
  const effort = params.output_config && typeof params.output_config === 'object' && 'effort' in params.output_config
    ? params.output_config.effort
    : undefined;
  return typeof effort === 'string' ? effort : undefined;
}

/** Messages-API-shaped caller that shells out to `claude -p` and bills the Claude Code plan. */
export function claudeCodeModelClient(): (params: Anthropic.MessageCreateParamsNonStreaming, signal?: AbortSignal) => Promise<Anthropic.Message> {
  return async (params, signal) => {
    const result = await runClaudeCode({
      prompt: params.messages.map((message) => blocksText(message.content)).join('\n\n'),
      system: blocksText(params.system),
      schema: schemaOf(params),
      model: params.model,
      effort: effortOf(params),
      signal,
    });
    return {
      id: 'claude-code',
      type: 'message',
      role: 'assistant',
      model: result.model,
      content: [{ type: 'text', text: result.json != null && typeof result.json !== 'string' ? JSON.stringify(result.json) : result.text }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cache_read_input_tokens: result.usage.cacheReadTokens,
        cache_creation_input_tokens: result.usage.cacheWriteTokens,
      },
    } as Anthropic.Message;
  };
}
