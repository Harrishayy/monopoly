import type { Case } from '@casework/core';
import { CopyButton, StatusChip, type ChipStatus } from '@/ui';
import { SlaTimer } from './SlaTimer';

/** Ref, status, SLA, title (the page h1) and customer. */
export function CaseHeader({ c, status, actions }: { c: Pick<Case, 'ref' | 'title' | 'customer' | 'status' | 'slaDueAt'>; status?: ChipStatus; actions?: React.ReactNode }) {
  return (
    <header className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-2">{c.ref}</span>
        <CopyButton value={c.ref} label="Copy ref" className="h-6 px-1.5 text-[11px]" />
        <StatusChip status={status ?? c.status} />
        {c.slaDueAt && <SlaTimer dueAt={c.slaDueAt} />}
        {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
      </div>
      <h1 className="text-2xl font-bold tracking-tight [overflow-wrap:anywhere]">{c.title}</h1>
      <p className="text-sm text-ink-2">
        Raised by {c.customer.name}
      </p>
    </header>
  );
}
