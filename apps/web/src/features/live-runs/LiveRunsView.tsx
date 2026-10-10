'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mascot } from '@/domain/mascot';
import { filterByKind, RunKindBadge, RunKindFilter, type RunKindFilterValue } from '@/domain/run';
import { PageHeader } from '@/layout';
import { useApi } from '@/lib/api';
import type { RunSummary } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { EmptyState, ErrorState, Mono, RelativeTime, SegmentedControl, Skeleton, StatusChip } from '@/ui';

type Filter = 'standalone' | 'grouped' | 'all';

/** Every agent run in this session as a small live card. */
export function LiveRunsView() {
  const [filter, setFilter] = useState<Filter>('standalone');
  const { data, error, loading, reload } = useApi<RunSummary[]>('/api/runs', { poll: true, intervalMs: 1500 });
  const [kind, setKind] = useState<RunKindFilterValue>('all');
  const scoped = (data ?? []).filter((r) => (filter === 'all' ? true : filter === 'standalone' ? !r.groupId : !!r.groupId));
  const runs = filterByKind(scoped, kind);
  const active = data?.filter((r) => !r.done).length ?? 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow={active ? `${active} running` : 'Idle'}
        title="Live runs"
        description="Every run of the agent in this session, newest first. Runs are held in memory until the server restarts."
        actions={
          <SegmentedControl
            label="Which runs"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'standalone', label: 'Started by hand' },
              { value: 'grouped', label: 'Eval and batches' },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      />
      {scoped.length > 0 && <RunKindFilter runs={scoped} value={kind} onChange={setKind} />}
      {loading && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} variant="block" />)}</div>}
      {error && <ErrorState error={{ title: 'Couldn’t load runs', detail: error }} onRetry={reload} />}
      {data && !runs.length && (
        <EmptyState
          title="No runs here yet"
          body="Open a case and run the agent, or start an eval or batch from the Reality Test page. Runs appear here as they happen."
        />
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {runs.slice(0, 120).map((r) => (
          <li key={r.runId}>
            <Link
              href={`/cases/${encodeURIComponent(r.caseRef)}?run=${r.runId}`}
              className={cn('grid h-full gap-2.5 rounded-ui-lg border-(length:--bw) border-line bg-surface p-3.5 shadow-ui transition-colors hover:border-line-strong', !r.done && 'border-accent/60')}
            >
              <div className="flex items-start gap-3">
                <Mascot state={r.error ? 'fail' : r.mascot} size={40} />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <Mono className="text-[11.5px] text-ink-2">{r.caseRef}</Mono>
                  <b className="line-clamp-2 text-[13.5px] leading-snug">{r.caseTitle}</b>
                </div>
                {r.done ? <StatusChip size="sm" status={r.outcome ?? 'failed'} label={r.outcome === 'resolved' ? 'Next step' : undefined} /> : <StatusChip size="sm" status="running" />}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                <RunKindBadge tag={r} />
                <span>{r.mode === 'rules' ? 'Rules only' : 'Model'}</span>
                {r.cut && <span>Before event {r.cut.cutBefore}</span>}
                <span>{r.steps} steps</span>
                <RelativeTime at={r.startedAt} />
              </div>
              {r.next ? (
                <p className="text-[13px]">
                  <Mono>{r.next.action}</Mono> → {r.next.recipient}
                </p>
              ) : (
                r.lastStep && <p className="truncate text-[13px] text-ink-2">{r.lastStep.title}</p>
              )}
              {r.handover && !r.decision && <p className="text-[12.5px] font-semibold text-hold">Waiting for a person · {r.handover.queue}</p>}
              {r.error && <p className="text-[12.5px] text-bad">{r.error}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
