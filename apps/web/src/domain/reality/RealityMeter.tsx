'use client';

import type { Outcome } from '@casework/core';
import type { BatchCase } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import './reality.css';

const LEGEND: { key: Outcome | 'pending' | 'running'; label: string; cls: string }[] = [
  { key: 'resolved', label: 'Next step taken', cls: 's-resolved' },
  { key: 'escalated', label: 'Escalated', cls: 's-escalated' },
  { key: 'needs_info', label: 'Needs info', cls: 's-needs_info' },
  { key: 'failed', label: 'Failed', cls: 's-failed' },
  { key: 'declined', label: 'Declined', cls: 's-blocked' },
  { key: 'running', label: 'Running', cls: 's-running' },
  { key: 'pending', label: 'Waiting', cls: 's-blocked' },
];

const keyOf = (c: BatchCase) => (c.status === 'done' ? (c.outcome ?? 'failed') : c.status);

/** One cell per case, coloured by outcome, with a text legend of counts. Cells open the case. */
export function RealityMeter({ cases, onOpen, label = 'Batch results' }: { cases: BatchCase[]; onOpen?: (c: BatchCase) => void; label?: string }) {
  const counts = new Map<string, number>();
  cases.forEach((c) => counts.set(keyOf(c), (counts.get(keyOf(c)) ?? 0) + 1));
  return (
    <div className="grid gap-4">
      <div role="group" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(22px,1fr))] gap-1">
        {cases.map((c, i) => {
          const k = keyOf(c);
          const l = LEGEND.find((x) => x.key === k)!;
          return (
            <button
              key={`${c.ref}-${i}`}
              type="button"
              onClick={() => onOpen?.(c)}
              disabled={!onOpen}
              title={`#${c.n} ${c.ref}: ${l.label}`}
              aria-label={`Case ${c.n}, ${c.ref}: ${l.label}`}
              className={cn('rt-cell cursor-pointer disabled:cursor-default', l.cls, k === 'pending' && 'pending', k === 'running' && 'running')}
              style={{ ['--i' as string]: i }}
            />
          );
        })}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
        {LEGEND.filter((l) => counts.get(l.key)).map((l) => (
          <div key={l.key} className={cn(l.cls, 'flex items-center justify-between gap-2')}>
            <dt className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-[2px] bg-(--c)" aria-hidden />
              {l.label}
            </dt>
            <dd className="font-mono tabular-nums">{counts.get(l.key)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
