'use client';

import type { RunEvent } from '@casework/core';
import { toast as sonner, Toaster as Sonner } from 'sonner';

/** Mounted once in the root layout. Never more than three visible. */
export function Toaster() {
  return (
    <Sonner
      visibleToasts={3}
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'flex w-[356px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-ui-lg border-(length:--bw) border-line-strong bg-surface p-3 text-sm text-ink shadow-ui',
          title: 'font-semibold',
          description: 'text-[12.5px] text-ink-2',
          content: 'grid min-w-0 flex-1 gap-0.5',
          actionButton: 'ml-auto shrink-0 cursor-pointer self-center rounded-ui border-(length:--bw) border-line-strong bg-surface-2 px-2 py-1 text-[12px] font-semibold text-ink hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent',
          error: 's-failed border-l-4 border-l-(--c)',
          warning: 's-escalated border-l-4 border-l-(--c)',
          success: 's-resolved border-l-4 border-l-(--c)',
        },
      }}
    />
  );
}

/** Only failures, escalations and completions toast. */
export const toast = Object.assign(sonner, {
  event(e: RunEvent, caseLabel = 'Run') {
    switch (e.type) {
      case 'tool.failed':
        if (!e.willRetry) sonner.error(`${caseLabel}: tool failed`, { description: e.error });
        break;
      case 'escalation.created':
        sonner.warning(`${caseLabel}: handed to ${e.handover.queue}`, { description: e.handover.reason });
        break;
      case 'run.completed':
        if (e.outcome === 'resolved') sonner.success(`${caseLabel}: next step taken`, { description: e.summary });
        else if (e.outcome === 'failed') sonner.error(`${caseLabel}: run failed`, { description: e.summary });
        break;
    }
  },
});
