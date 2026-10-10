'use client';

import { useNow } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui';

const fmt = (ms: number) => {
  const m = Math.round(Math.abs(ms) / 60_000);
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`;
};

/** Time left before the deadline. Colour changes always come with a text change. */
export function SlaTimer({ dueAt, now: fixed }: { dueAt: string; now?: number }) {
  const live = useNow();
  const current = fixed ?? live;
  if (current === null)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-ui border border-line px-2 py-1 font-mono text-[11px] font-semibold text-ink-2">
        <Icon name="clock" size={12} />
        Due <time dateTime={dueAt}>{dueAt.slice(0, 16).replace('T', ' ')}</time>
      </span>
    );
  const left = new Date(dueAt).getTime() - current;
  const state = left < 0 ? 'overdue' : left < 3_600_000 ? 'warn' : 'ok';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-ui border px-2 py-1 font-mono text-[11px] font-semibold',
        state === 'ok' && 'border-line text-ink-2',
        state === 'warn' && 's-escalated border-(--c)/50 text-(--c)',
        state === 'overdue' && 's-failed border-(--c)/50 bg-(--c)/10 text-(--c)',
      )}
    >
      <Icon name="clock" size={12} />
      {state === 'overdue' ? `Overdue ${fmt(left)}` : `${fmt(left)} left`}
    </span>
  );
}
