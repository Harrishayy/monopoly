'use client';

import { useSyncExternalStore } from 'react';

// One shared 30s ticker drives every RelativeTime and SLA timer.
let now = Date.now();
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(fn: () => void) {
  subs.add(fn);
  timer ??= setInterval(() => {
    now = Date.now();
    subs.forEach((s) => s());
  }, 30_000);
  return () => {
    subs.delete(fn);
    if (!subs.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * The current time, or null on the server and during hydration, so server and client HTML match.
 * Callers render a time-independent fallback (e.g. the exact timestamp) while it is null.
 */
export const useNow = (): number | null => useSyncExternalStore(subscribe, () => now, () => null);
