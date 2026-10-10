'use client';

import { useState } from 'react';
import { HandoverCard } from '@/domain/handover';
import { PageHeader } from '@/layout';
import { useApi } from '@/lib/api';
import type { RunSummary } from '@/lib/api-types';
import { EmptyState, ErrorState, SegmentedControl, Skeleton } from '@/ui';

type Filter = 'open' | 'decided' | 'all';

/** Queue of handovers waiting for a person, newest first. */
export function EscalationsView() {
  const [filter, setFilter] = useState<Filter>('open');
  const [includeBatches, setIncludeBatches] = useState<'hand' | 'all'>('hand');
  const { data, error, loading, reload } = useApi<RunSummary[]>('/api/escalations', { poll: true, intervalMs: 3000 });
  const pool = (data ?? []).filter((r) => includeBatches === 'all' || !r.groupId);
  const items = pool.filter((r) => (filter === 'all' ? true : filter === 'open' ? !r.decision : !!r.decision));
  const open = pool.filter((r) => !r.decision).length;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow={`${open} waiting`}
        title="Escalations"
        description="Each card is everything a person needs to decide: what the agent knows, what it tried, what it refused, and the options. Your choice is recorded with the run."
        actions={
          <div className="flex flex-wrap gap-2">
            <SegmentedControl
              label="Status"
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'open', label: 'Waiting' },
                { value: 'decided', label: 'Decided' },
                { value: 'all', label: 'All' },
              ]}
            />
            <SegmentedControl
              label="Source"
              size="sm"
              value={includeBatches}
              onChange={setIncludeBatches}
              options={[
                { value: 'hand', label: 'Started by hand' },
                { value: 'all', label: 'Include eval and batches' },
              ]}
            />
          </div>
        }
      />
      {loading && <Skeleton variant="block" className="h-64" />}
      {error && <ErrorState error={{ title: 'Couldn’t load escalations', detail: error }} onRetry={reload} />}
      {data && !items.length && (
        <EmptyState
          mascot={filter === 'open' ? 'done' : 'idle'}
          title={filter === 'open' ? 'Nothing waiting for a person' : 'No decisions yet'}
          body={filter === 'open' ? 'When the agent hands a case over, it appears here with the facts, what it tried and the options.' : 'Decisions you make on handovers are listed here.'}
        />
      )}
      <ul className="grid gap-5">
        {items.map((r) => (
          <li key={r.runId}>
            <HandoverCard handover={r.handover!} caseRef={r.caseRef} caseTitle={r.caseTitle} runId={r.runId} decision={r.decision} onDecided={() => reload()} />
          </li>
        ))}
      </ul>
    </div>
  );
}
