'use client';

import type { RunView } from '@casework/core';
import { useEffect, useRef } from 'react';
import { VisuallyHidden } from '@/ui';
import { TraceStep } from './TraceStep';

/** Ordered steps of a run, live or replayed, from the shared RunView. Auto-scrolls while live unless you scrolled up. */
export function RunTrace({ view, mode = 'replay', empty }: { view: RunView; mode?: 'live' | 'replay'; empty?: React.ReactNode }) {
  const endRef = useRef<HTMLLIElement>(null);
  const pinned = useRef(true);
  const n = view.steps.length;

  useEffect(() => {
    const onScroll = () => {
      const el = endRef.current;
      if (!el) return;
      pinned.current = el.getBoundingClientRect().top < window.innerHeight + 120;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (mode === 'live' && pinned.current) endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [n, mode]);

  if (!n) return <>{empty ?? null}</>;
  const start = view.startedAt ? new Date(view.startedAt).getTime() : new Date(view.steps[0]!.at).getTime();
  const last = view.steps.at(-1)!;
  const failAttempts = new Map<number, number>();
  for (const s of view.steps) {
    if (s.kind !== 'fail' || !s.callId) continue;
    failAttempts.set(s.seq, view.steps.filter((x) => x.kind === 'fail' && x.callId === s.callId && x.seq <= s.seq).length);
  }
  return (
    <>
      <ol className="grid" aria-label="Run trace">
        {view.steps.map((s) => (
          <TraceStep
            key={s.seq}
            kind={s.kind}
            title={s.title}
            detail={s.detail}
            at={s.at}
            offsetMs={new Date(s.at).getTime() - start}
            state={view.status === 'running' && s.seq === last.seq ? 'active' : 'done'}
            call={s.kind === 'tool' && s.callId ? view.toolCalls.find((c) => c.callId === s.callId) : undefined}
            attempt={failAttempts.get(s.seq)}
          />
        ))}
        <li ref={endRef} aria-hidden className="h-px" />
      </ol>
      <div aria-live="polite">
        <VisuallyHidden>{mode === 'live' ? `${last.title}. ${view.status === 'completed' ? 'Run finished.' : ''}` : ''}</VisuallyHidden>
      </div>
    </>
  );
}
