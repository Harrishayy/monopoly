import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { finished } from 'node:stream/promises';
import { RunEvent } from '@casework/core';
import { LedgerEntry, TokenUsage, type AgentRunOutput } from '../schema';

/** Convert an unknown failure into a printable message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Quote a single value for substitution into a POSIX shell command. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** Read usage from the last completion event, or null for an incomplete trace. */
export function usageFromEvents(events: RunEvent[] | null): TokenUsage | null {
  const event = events?.findLast((e) => e.type === 'run.completed');
  if (event?.type !== 'run.completed') return null;
  return {
    inputTokens: event.usage.inputTokens, outputTokens: event.usage.outputTokens,
    cacheReadTokens: event.usage.cacheReadTokens, cacheWriteTokens: event.usage.cacheWriteTokens,
  };
}

/** Return a file's path when it exists, otherwise null. */
export async function existingFile(path: string): Promise<string | null> {
  return (await stat(path).catch(() => null))?.isFile() ? path : null;
}

async function readLines<T>(path: string, parse: (value: unknown) => T): Promise<{ values: T[] | null; invalid: number }> {
  let body: string;
  try { body = await readFile(path, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { values: null, invalid: 0 };
    throw error;
  }
  const values: T[] = [];
  let invalid = 0;
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { values.push(parse(JSON.parse(line))); } catch { invalid++; }
  }
  return { values, invalid };
}

/** Restore an adapter's saved outputs, skipping malformed trace and ledger lines. */
export async function readAgentOutput(outDir: string, opts: { persisted?: boolean; ms?: number; error?: string | null; exitOk?: boolean; ledger?: boolean } = {}): Promise<AgentRunOutput> {
  const [answerPath, reasoningPath, tracePath, trace, ledger] = await Promise.all([
    existingFile(join(outDir, 'ANSWER.md')), existingFile(join(outDir, 'REASONING.md')),
    existingFile(join(outDir, 'trace.jsonl')), readLines(join(outDir, 'trace.jsonl'), (v) => RunEvent.parse(v)),
    opts.ledger === false ? Promise.resolve({ values: null, invalid: 0 }) : readLines(join(outDir, 'ledger.jsonl'), (v) => LedgerEntry.parse(v)),
  ]);
  const saved = opts.persisted ? JSON.parse(await readFile(join(outDir, 'run.json'), 'utf8')) as { ok: boolean; error: string | null; ms: number; usage: unknown } : null;
  const answer = answerPath ? await readFile(answerPath, 'utf8') : null;
  let error = opts.error ?? saved?.error ?? null;
  const problems = [
    trace.invalid ? `${trace.invalid} invalid trace line(s)` : null,
    ledger.invalid ? `${ledger.invalid} invalid ledger line(s)` : null,
    !answerPath ? 'Missing ANSWER.md' : null,
    answer?.includes('**Runner error**') ? 'ANSWER.md contains **Runner error**' : null,
  ].filter((v): v is string => Boolean(v));
  if (problems.length) error = [error, ...problems].filter(Boolean).join('; ');
  return {
    ok: (saved?.ok ?? opts.exitOk ?? true) && Boolean(answerPath) && !answer?.includes('**Runner error**'),
    error, events: trace.values, ledger: ledger.values ?? [], ms: opts.ms ?? saved?.ms ?? 0,
    usage: saved?.usage != null ? TokenUsage.parse(saved.usage) : usageFromEvents(trace.values),
    answerPath, reasoningPath, tracePath,
  };
}

/** Run a shell command with a shared output log and terminate its process group on cancellation. */
export async function runShell(command: string, opts: { cwd: string; env: NodeJS.ProcessEnv; logPath: string; signal?: AbortSignal; timeoutMs?: number }): Promise<{ code: number | null; error: string | null }> {
  await mkdir(dirname(opts.logPath), { recursive: true });
  const log = createWriteStream(opts.logPath);
  // Observe log errors immediately, even while the command is still running.
  const logDone = finished(log).then(() => null, (error: unknown) => errorMessage(error));
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let error: string | null = null;
  const child = spawn('/bin/sh', ['-c', command], { cwd: opts.cwd, env: opts.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const kill = (signal: NodeJS.Signals) => {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal); } catch { /* The process group has already exited. */ }
  };
  const stop = (reason: string) => {
    if (error) return;
    error = reason;
    kill('SIGTERM');
    killTimer = setTimeout(() => kill('SIGKILL'), 5000);
  };
  const abort = () => stop(errorMessage(opts.signal?.reason ?? 'Aborted'));
  const logError = (err: Error) => stop(err.message);
  log.on('error', logError);
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  opts.signal?.addEventListener('abort', abort, { once: true });
  if (opts.timeoutMs !== undefined) timer = setTimeout(() => stop(`Timed out after ${opts.timeoutMs}ms`), opts.timeoutMs);
  if (opts.signal?.aborted) abort();
  try {
    const code = await new Promise<number | null>((resolve) => {
      child.once('error', (err) => { error = err.message; });
      child.once('close', (code) => resolve(code));
    });
    log.end();
    const logFailure = await logDone;
    return { code, error: error ?? logFailure ?? (code === 0 ? null : `Command exited with ${code === null ? 'a signal' : `code ${code}`}`) };
  } finally {
    clearTimeout(timer);
    clearTimeout(killTimer);
    opts.signal?.removeEventListener('abort', abort);
    log.removeListener('error', logError);
    if (!log.writableEnded) log.end();
  }
}
