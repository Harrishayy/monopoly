'use client';

import { applyEvent, emptyRunView, RunEvent, type RunView } from '@casework/core';
import { startTransition, useEffect, useRef, useState } from 'react';

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'ended' | 'error';

/**
 * Subscribes to a run's SSE stream and reduces events with the shared runView reducer.
 * EventSource resumes with Last-Event-ID on its own after a dropped connection.
 * `onEvent` sees every parsed event (e.g. to toast failures for runs started here).
 */
export function useRunStream(runId: string | null, onEvent?: (e: RunEvent) => void) {
  const [view, setView] = useState<RunView>(() => emptyRunView());
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!runId) {
      setView(emptyRunView());
      setStatus('idle');
      return;
    }
    setView(emptyRunView(runId));
    setStatus('connecting');
    setError(null);
    const es = new EventSource(`/api/runs/${runId}/events`);
    es.onopen = () => setStatus('open');
    es.onmessage = (m) => {
      const parsed = RunEvent.safeParse(JSON.parse(m.data));
      if (!parsed.success) return console.warn('Ignoring unknown run event', m.data);
      cb.current?.(parsed.data);
      startTransition(() => setView((v) => applyEvent(v, parsed.data)));
    };
    es.addEventListener('end', (m) => {
      const { error } = JSON.parse((m as MessageEvent).data) as { error: string | null };
      setError(error);
      setStatus(error ? 'error' : 'ended');
      es.close();
    });
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus('error');
        setError('Lost the connection to the run stream');
      }
    };
    return () => es.close();
  }, [runId]);

  return { view, status, error };
}
