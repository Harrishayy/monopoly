'use client';

import * as D from '@radix-ui/react-dialog';
import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons. The confirm button should repeat the effect ("Approve £420", not "OK"). */
  footer?: React.ReactNode;
  className?: string;
}

/** Modal confirmation, e.g. before an irreversible option. */
export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-(--z-dialog) bg-ink/40 data-[state=open]:animate-[fade-in_var(--dur-base)_var(--out)]" />
        <D.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-(--z-dialog) grid w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-ui-lg border-(length:--bw) border-line-strong bg-surface p-5 shadow-ui data-[state=open]:animate-[pop-in_var(--dur-base)_var(--out)]',
            className,
          )}
        >
          <div className="grid gap-1.5">
            <D.Title className="font-display text-lg font-bold">{title}</D.Title>
            {description ? <D.Description className="text-sm text-ink-2">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          {children}
          {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const DialogClose = D.Close;
