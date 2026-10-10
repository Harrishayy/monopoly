'use client';

import { useEffect, useRef } from 'react';
import { LIVE_EVENT } from './api';
import type { LiveSignal } from './api-types';

/**
 * One EventSource on /api/live/stream per tab. Each signal is re-dispatched as a window event,
 * so any `useApi(url, { live: true })` reloads at once and components can react with `useLiveSignal`.
 */
let source: EventSource | null = null;
let users = 0;

function connect() {
  users++;
  if (source) return;
  source = new EventSource('/api/live/stream');
  source.onmessage = (m) => {
    try {
      const s = JSON.parse(m.data) as LiveSignal;
      window.dispatchEvent(new CustomEvent<LiveSignal>(LIVE_EVENT, { detail: s }));
    } catch {
      /* ignore malformed frames */
    }
  };
}

function release() {
  users--;
  if (users <= 0 && source) {
    source.close();
    source = null;
    users = 0;
  }
}

export function useLiveSignal(fn: (s: LiveSignal) => void) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    connect();
    const on = (e: Event) => cb.current((e as CustomEvent<LiveSignal>).detail);
    window.addEventListener(LIVE_EVENT, on);
    return () => {
      window.removeEventListener(LIVE_EVENT, on);
      release();
    };
  }, []);
}
