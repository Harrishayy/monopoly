'use client';

import type { ToolCallView } from '@casework/core';
import { cn } from '@/lib/cn';
import { DurationText, Eyebrow, JsonView, Spinner, StatusChip } from '@/ui';
import { RetryBadge } from './RetryBadge';

const STATUS = { calling: 'running', succeeded: 'resolved', retrying: 'escalated', failed: 'failed' } as const;
const LABEL = { calling: 'Calling', succeeded: 'Succeeded', retrying: 'Retrying', failed: 'Failed' } as const;

/** Arguments, every attempt, and the result or error for one tool call. */
export function ToolCallBlock({ call }: { call: ToolCallView }) {
  const fails = call.attempts.filter((a) => !a.ok).length;
  return (
    <div className="grid gap-2.5 rounded-ui border-(length:--bw) border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-mono text-[12.5px] font-semibold [overflow-wrap:anywhere]">{call.tool}</span>
        {call.status === 'calling' && <Spinner size={12} />}
        {fails > 0 && <RetryBadge attempt={call.attempts.length} state={call.status === 'succeeded' ? 'recovered' : call.status === 'failed' ? 'gave_up' : 'retrying'} />}
        <StatusChip status={STATUS[call.status]} label={LABEL[call.status]} size="sm" />
      </div>
      <div className="grid gap-1">
        <Eyebrow>Arguments</Eyebrow>
        <JsonView value={call.args} maxHeight={200} />
      </div>
      {call.attempts.length > 0 && (
        <ol className="grid gap-1 text-[12.5px]" aria-label="Attempts">
          {call.attempts.map((a, i) => (
            <li key={i} className={cn('flex flex-wrap items-baseline gap-2', !a.ok && 'text-bad')}>
              <span className="font-mono text-[11px] text-ink-2">#{i + 1}</span>
              {a.ok ? 'Succeeded' : `Failed: ${a.error}`}
              {a.ms !== undefined && <DurationText ms={a.ms} className="text-[11px] text-ink-2" />}
            </li>
          ))}
        </ol>
      )}
      {call.result !== undefined && (
        <div className="grid gap-1">
          <Eyebrow>Result</Eyebrow>
          <JsonView value={call.result} maxHeight={160} />
        </div>
      )}
    </div>
  );
}
