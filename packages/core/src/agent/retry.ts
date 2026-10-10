export interface RetryOptions {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  /** Called after every failed attempt; emit `tool.failed` from here. */
  onFailure?: (error: Error, attempt: number, willRetry: boolean) => void;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number, outer?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`Timed out after ${ms}ms`)), ms);
  outer?.addEventListener('abort', () => ctrl.abort(outer.reason));
  try {
    return await Promise.race([
      fn(ctrl.signal),
      new Promise<never>((_, reject) => ctrl.signal.addEventListener('abort', () => reject(ctrl.signal.reason))),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Timeout + exponential backoff with jitter. Never retries after the outer signal aborts.
 * Pass the same idempotency key to every attempt (see ToolContext) so retries cannot act twice.
 */
export async function withRetry<T>(fn: (signal: AbortSignal) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 3, timeoutMs = 8000, baseDelayMs = 500, signal, onFailure } = opts;
  let lastError: Error = new Error('No attempts made');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await withTimeout(fn, timeoutMs, signal);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const willRetry = attempt < attempts && !signal?.aborted;
      onFailure?.(lastError, attempt, willRetry);
      if (!willRetry) break;
      const delay = baseDelayMs * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5);
      await sleep(delay, signal);
    }
  }
  throw lastError;
}
