import type { CaseSummary } from '@casework/core';
import Link from 'next/link';
import { StatusChip } from '@/ui';
import { cn } from '@/lib/cn';

/** A row in the inbox. The whole row is one link. */
export function CaseListItem({ c, selected }: { c: CaseSummary; selected?: boolean }) {
  return (
    <Link
      href={`/cases/${encodeURIComponent(c.ref)}`}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'grid gap-1.5 rounded-ui border-(length:--bw) border-transparent p-2.5 hover:bg-surface-2',
        selected && 'border-accent/35 bg-accent-soft',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-ink-2">{c.ref}</span>
        <StatusChip status={c.status} className="px-1.5 py-0.5 text-[9.5px]" />
      </span>
      <span className="text-[13.5px] font-semibold leading-snug">{c.title}</span>
      <span className="text-xs text-ink-2">{c.customer.name}</span>
    </Link>
  );
}
