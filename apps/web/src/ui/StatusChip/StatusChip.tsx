import type { CaseStatus, Outcome } from '@casework/core';
import { cn } from '@/lib/cn';

export type ChipStatus = CaseStatus | Outcome;

const LABEL: Record<ChipStatus, string> = {
  new: 'New',
  running: 'Running',
  resolved: 'Resolved',
  escalated: 'Escalated',
  needs_info: 'Needs info',
  failed: 'Failed',
  blocked: 'Blocked',
  declined: 'Declined',
};

/** Case or run status. Always text plus colour, never colour alone. Running pulses (static under reduced motion). */
export function StatusChip({ status, size = 'md', label, className }: { status: ChipStatus; size?: 'sm' | 'md'; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        `s-${status === 'declined' ? 'blocked' : status}`,
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-ui border border-(--c)/40 bg-(--c)/10 font-mono font-semibold uppercase leading-none tracking-wider text-(--c)',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2 py-1 text-[11px]',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full bg-current', status === 'running' && 'animate-pulse')} aria-hidden />
      {label ?? LABEL[status]}
    </span>
  );
}
