'use client';

import type { Source } from '@casework/core';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { Eyebrow, Icon, Skeleton } from '@/ui';
import { KIND, shortSourceLabel } from './kinds';
import { CallView, CrmRecordView, DocumentView, EmailView, MessageView, TicketView } from './views';

/** Reads any source, dispatching on kind. The highlighted source gets a ring and scrolls into view. */
export function SourceViewer({ sources, activeId, highlight, loading }: { sources: Source[]; activeId?: string; highlight?: { sourceId: string }; loading?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const s = sources.find((x) => x.id === activeId) ?? sources[0];
  const lit = !!s && highlight?.sourceId === s.id;
  useEffect(() => {
    if (lit) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [lit, s?.id]);
  if (loading) return <Skeleton lines={6} />;
  if (!s) return <p className="text-sm text-ink-2">No sources.</p>;
  const View = { call: CallView, email: EmailView, doc: DocumentView, crm: CrmRecordView, ticket: TicketView, sms: MessageView, note: MessageView }[s.kind];
  return (
    <article
      ref={ref}
      aria-label={s.title}
      className={cn('grid gap-3 rounded-ui-lg border-(length:--bw) border-line bg-surface p-4', lit && 'border-accent ring-2 ring-accent/40')}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Icon name={KIND[s.kind].icon} size={16} className="text-accent" />
        <h3 className="min-w-0 flex-1 text-[15px] font-bold [overflow-wrap:anywhere]">{s.title}</h3>
        <Eyebrow>{shortSourceLabel(s.id)}</Eyebrow>
      </header>
      <div className="min-w-0">
        <View source={s} />
      </div>
    </article>
  );
}
