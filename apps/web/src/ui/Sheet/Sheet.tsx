'use client';

import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Side panel. Holds the source viewer on narrow screens; slides from the bottom below 860px. */
export function Sheet({ open, onOpenChange, title, side = 'right', children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; side?: 'right' | 'bottom'; children: React.ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-(--z-dialog) bg-ink/30" />
        <D.Content
          className={cn(
            'fixed z-(--z-dialog) flex flex-col bg-surface shadow-ui outline-none',
            side === 'right'
              ? 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-(--r-lg) border-t-(length:--bw) border-line-strong min-[860px]:inset-y-0 min-[860px]:left-auto min-[860px]:right-0 min-[860px]:max-h-none min-[860px]:w-[min(560px,90vw)] min-[860px]:rounded-none min-[860px]:border-l-(length:--bw) min-[860px]:border-t-0 data-[state=open]:animate-[slide-up_var(--dur-slow)_var(--out)] min-[860px]:data-[state=open]:animate-[slide-left_var(--dur-slow)_var(--out)]'
              : 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-(--r-lg) border-t-(length:--bw) border-line-strong data-[state=open]:animate-[slide-up_var(--dur-slow)_var(--out)]',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b-(length:--bw) border-line px-4 py-3">
            <D.Title className="font-display text-base font-bold [overflow-wrap:anywhere]">{title}</D.Title>
            <D.Description className="sr-only">{title}</D.Description>
            <D.Close aria-label="Close" className="grid size-9 cursor-pointer place-items-center rounded-ui text-ink-2 hover:bg-surface-2 hover:text-ink">
              <X size={16} aria-hidden />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
