'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Window event fired for every signal on /api/live/stream. */
export const LIVE_EVENT = 'casework:live';

/** fetch + JSON with a readable error message from the route's { error }. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : undefined;
  if (!res.ok) {
    const err = body && typeof body === 'object' && 'error' in body ? (body as { error: unknown }).error : body;
    throw new Error(typeof err === 'string' ? err : Array.isArray(err) ? err.map((e: { message?: string }) => e.message).join('; ') : `Request failed (${res.status})`);
  }
  return body as T;
}

/**
 * Loads a URL and, while `poll` is set, refreshes it every `intervalMs`.
 * Keeps the last good data on refresh errors so screens don't flash.
 */
export function useApi<T>(
  url: string | null,
  { poll, intervalMs = 1500, initial, live }: { poll?: boolean | ((d: T | undefined) => boolean); intervalMs?: number; initial?: T; live?: boolean } = {},
) {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url && initial === undefined);
  const dataRef = useRef(data);
  dataRef.current = data;

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const d = await api<T>(url);
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  // `live`: also reload as soon as a live signal arrives (see lib/live.ts), not just on the next poll.
  useEffect(() => {
    if (!url || !live) return;
    const on = () => void load();
    window.addEventListener(LIVE_EVENT, on);
    return () => window.removeEventListener(LIVE_EVENT, on);
  }, [url, live, load]);

  useEffect(() => {
    if (!url || !poll) return;
    const id = setInterval(() => {
      const keep = typeof poll === 'function' ? poll(dataRef.current) : poll;
      if (keep && document.visibilityState === 'visible') void load();
    }, intervalMs);
    return () => clearInterval(id);
  }, [url, poll, intervalMs, load]);

  return { data, error, loading, reload: load, setData };
}
