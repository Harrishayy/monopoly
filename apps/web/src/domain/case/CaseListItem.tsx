import type { CaseSummary } from '@casework/core';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon, RelativeTime, StatusChip, type ChipStatus } from '@/ui';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' });
import { KIND } from './kinds';

export interface CaseListItemProps {
  c: CaseSummary;
  selected?: boolean;
  /** Status from the latest run, when there is one. */
  status?: ChipStatus;
  /** Overrides the chip text, e.g. "Needs approval". */
  statusLabel?: string;
  /** Opened by a real call, email or portal report: marked, with a relative time. */
  live?: boolean;
  unread?: boolean;
  slaWarning?: boolean;
}

/** A row in the inbox. The whole row is one link. */
export function CaseListItem({ c, selected, status, statusLabel, live, unread, slaWarning }: CaseListItemProps) {
  return (
    <Link
      href={`/cases/${encodeURIComponent(c.ref)}`}
      aria-current={selected ? 'page' : undefined}
      data-ref={c.ref}
      className={cn(
        'grid gap-1.5 rounded-ui border-(length:--bw) border-transparent p-2.5 hover:bg-surface-2',
        selected && 'border-accent/35 bg-accent-soft hover:bg-accent-soft',
        slaWarning && 's-escalated border-l-4 border-l-(--c)',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-ink-2">
          <Icon name={KIND[c.channel].icon} size={12} />
          <span className="whitespace-nowrap">{c.ref}</span>
          {live && <span className="rounded-ui bg-accent-soft px-1 text-[9.5px] font-semibold uppercase tracking-wider text-ink">Live</span>}
          {unread && <span className="size-1.5 rounded-full bg-accent" aria-label="Unread" role="img" />}
        </span>
        <StatusChip status={status ?? c.status} size="sm" label={statusLabel} />
      </span>
      <span className={cn('text-[13.5px] leading-snug', unread ? 'font-bold' : 'font-semibold')}>{c.title}</span>
      <span className="flex items-center justify-between gap-2 text-xs text-ink-2">
        <span className="truncate">{c.customer.name}</span>
        {live ? (
          <RelativeTime at={c.updatedAt} className="shrink-0 font-mono text-[11px]" />
        ) : (
          <time dateTime={c.updatedAt} title="Latest event" className="shrink-0 font-mono text-[11px]">
            {day.format(new Date(c.updatedAt))}
          </time>
        )}
      </span>
    </Link>
  );
}
