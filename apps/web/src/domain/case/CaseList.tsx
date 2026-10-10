'use client';

import type { CaseSummary } from '@casework/core';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { useApi } from '@/lib/api';
import type { RunSummary } from '@/lib/api-types';
import { useHotkeys } from '@/lib/hooks';
import { Eyebrow, Input, Skeleton, type ChipStatus } from '@/ui';
import { CaseListItem } from './CaseListItem';

type Filter = 'all' | 'open' | 'escalated' | 'resolved';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Step taken' },
];

/** Latest standalone run per case → the status shown in the list. */
export function runStatuses(runs: RunSummary[] | undefined) {
  const out = new Map<string, ChipStatus>();
  for (const r of runs ?? []) {
    if (out.has(r.caseRef)) continue;
    out.set(r.caseRef, !r.done ? 'running' : (r.outcome ?? 'failed'));
  }
  return out;
}

export interface CaseListProps {
  cases: CaseSummary[];
  selectedRef?: string;
  /** Plural noun for the list, e.g. from the track vocabulary. */
  noun: string;
  label: string;
  loading?: boolean;
}

/** The inbox: filter by status, search, and move with j/k or arrow keys. */
export function CaseList({ cases, selectedRef, noun, label, loading }: CaseListProps) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data: runs } = useApi<RunSummary[]>('/api/runs?standalone=1', { poll: true, intervalMs: 4000 });
  const statuses = useMemo(() => runStatuses(runs), [runs]);
  const listRef = useRef<HTMLUListElement>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cases.filter((c) => {
      const st = statuses.get(c.ref) ?? c.status;
      if (filter === 'open' && !['new', 'running', 'needs_info'].includes(st)) return false;
      if (filter === 'escalated' && st !== 'escalated') return false;
      if (filter === 'resolved' && st !== 'resolved') return false;
      return !needle || `${c.ref} ${c.title} ${c.customer.name}`.toLowerCase().includes(needle);
    });
  }, [cases, q, filter, statuses]);

  const move = (d: 1 | -1) => {
    if (!shown.length) return;
    const i = shown.findIndex((c) => c.ref === selectedRef);
    const next = shown[Math.min(shown.length - 1, Math.max(0, i < 0 ? 0 : i + d))]!;
    router.push(`/cases/${encodeURIComponent(next.ref)}`);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-ref="${next.ref}"]`)?.focus());
  };
  const keys = useMemo(() => ({ j: () => move(1), k: () => move(-1) }), [shown, selectedRef]); // eslint-disable-line react-hooks/exhaustive-deps
  useHotkeys(keys);

  return (
    <div className="grid content-start gap-2 p-2">
      <div className="flex items-center justify-between px-2 pt-2">
        <Eyebrow>{label}</Eyebrow>
        <Eyebrow>
          {shown.length === cases.length ? cases.length : `${shown.length} of ${cases.length}`}
        </Eyebrow>
      </div>
      <Input label={`Search ${noun.toLowerCase()}`} hideLabel placeholder={`Search ${noun.toLowerCase()}, refs`} prefix="search" value={q} onChange={(e) => setQ(e.target.value)} className="px-1" />
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className="cursor-pointer rounded-ui border-(length:--bw) border-line px-2 py-1 text-[12px] font-semibold text-ink-2 hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-ink"
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="row" />)
      ) : !cases.length ? (
        <p className="px-2 py-6 text-sm text-ink-2">No {noun.toLowerCase()} loaded. Check DATA_DIR in .env.</p>
      ) : !shown.length ? (
        <p className="px-2 py-6 text-sm text-ink-2">
          Nothing matches.{' '}
          <button type="button" className="cursor-pointer font-semibold text-accent underline" onClick={() => (setQ(''), setFilter('all'))}>
            Clear filters
          </button>
        </p>
      ) : (
        <ul
          ref={listRef}
          className="grid gap-1"
          aria-label={noun}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              move(e.key === 'ArrowDown' ? 1 : -1);
            }
          }}
        >
          {shown.map((c) => (
            <li key={c.ref}>
              <CaseListItem c={c} selected={c.ref === selectedRef} status={statuses.get(c.ref)} />
            </li>
          ))}
        </ul>
      )}
      <p className="px-2 pb-2 text-[11px] text-ink-2">
        <kbd className="font-mono">j</kbd>/<kbd className="font-mono">k</kbd> or arrow keys to move
      </p>
    </div>
  );
}
