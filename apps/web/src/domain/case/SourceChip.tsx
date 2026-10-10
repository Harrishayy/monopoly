'use client';

import type { Source } from '@casework/core';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui';
import { KIND, shortSourceLabel } from './kinds';

/** One piece of evidence. Click opens it in the viewer. `cited` highlights it. */
export function SourceChip({ source, onOpen, cited, active }: { source: Source; onOpen?: (id: string) => void; cited?: boolean; active?: boolean }) {
  const k = KIND[source.kind];
  return (
    <button
      type="button"
      onClick={() => onOpen?.(source.id)}
      aria-pressed={active}
      title={source.title}
      className={cn(
        'inline-flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-ui border-(length:--bw) border-line bg-surface px-2.5 py-2 text-left text-[12.5px] transition-colors hover:border-line-strong',
        cited && 'border-accent/50 bg-accent-soft',
        active && 'border-accent ring-1 ring-accent',
      )}
    >
      <Icon name={k.icon} size={14} className="shrink-0 text-accent" />
      <b className="truncate font-semibold">{shortSourceLabel(source.id)}</b>
      <span className="shrink-0 font-mono text-[11px] text-ink-2">{(source.meta as { channel?: string }).channel ?? k.label}</span>
      {cited && <span className="sr-only">(cited)</span>}
    </button>
  );
}
