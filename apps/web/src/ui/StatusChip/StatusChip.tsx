import type { CaseStatus } from '@casework/core';
import { cn } from '@/lib/cn';

const LABEL: Record<CaseStatus, string> = {
  new: 'New',
  running: 'Running',
  resolved: 'Resolved',
  escalated: 'Escalated',
  needs_info: 'Needs info',
  failed: 'Failed',
  blocked: 'Blocked',
};

/** Case or run status. Always text plus colour, never colour alone. */
export function StatusChip({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <span
      className={cn(
        `s-${status}`,
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-ui px-2 py-1 font-mono text-[11px] font-semibold uppercase leading-none tracking-wider',
        'text-(--c) border border-(--c)/40 bg-(--c)/10',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full bg-current', status === 'running' && 'animate-pulse')} aria-hidden />
      {LABEL[status]}
    </span>
  );
}
