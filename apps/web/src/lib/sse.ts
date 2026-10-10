'use client';

import { applyEvent, emptyRunView, RunEvent, type RunView } from '@casework/core';
import { startTransition, useEffect, useState } from 'react';

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'ended' | 'error';

/** Subscribes to a run's SSE stream and reduces events with the shared runView reducer. */
export function useRunStream(runId: string | null) {
  const [view, setView] = useState<RunView>(() => emptyRunView());
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    setView(emptyRunView(runId));
    setStatus('connecting');
    setError(null);
    const es = new EventSource(`/api/runs/${runId}/events`);
    es.onopen = () => setStatus('open');
    es.onmessage = (m) => {
      const parsed = RunEvent.safeParse(JSON.parse(m.data));
      if (!parsed.success) return console.warn('Ignoring unknown run event', m.data);
      startTransition(() => setView((v) => applyEvent(v, parsed.data)));
    };
    es.addEventListener('end', (m) => {
      const { error } = JSON.parse((m as MessageEvent).data) as { error: string | null };
      setError(error);
      setStatus(error ? 'error' : 'ended');
      es.close();
    });
    return () => es.close();
  }, [runId]);

  return { view, status, error };
}
