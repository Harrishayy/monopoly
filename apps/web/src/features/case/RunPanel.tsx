'use client';

import { useState } from 'react';
import { Mascot } from '@/domain/mascot';
import { RunTrace } from '@/domain/run';
import { useRunStream } from '@/lib/sse';
import { Button, Eyebrow } from '@/ui';

/** Starts a run for this case and streams its trace. */
export function RunPanel({ caseRef }: { caseRef: string }) {
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const { view, status, error } = useRunStream(runId);

  async function start() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseRef }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not start the run');
      setRunId(body.runId);
    } catch (e) {
      setStartError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const running = status === 'connecting' || status === 'open';
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Mascot state={error ? 'fail' : view.mascot} size={28} />
          <Eyebrow>{runId ? `Agent run · ${view.steps.length} steps` : 'Agent run'}</Eyebrow>
        </span>
        <Button variant="primary" size="sm" onClick={start} loading={starting || running}>
          {runId ? 'Run again' : 'Run agent'}
        </Button>
      </div>
      <RunTrace view={view} />
      {(error || startError) && (
        <p role="alert" className="rounded-ui border border-dashed border-bad/60 p-3 text-[13px] text-bad">
          {error ?? startError}
        </p>
      )}
    </div>
  );
}
