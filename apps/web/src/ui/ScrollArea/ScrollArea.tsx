'use client';

import * as SA from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/cn';

/** Scrolling pane with a themed scrollbar. Native scrolling and keyboard behaviour are kept. */
export function ScrollArea({ children, className, axis = 'y', label }: { children: React.ReactNode; className?: string; axis?: 'x' | 'y'; label?: string }) {
  return (
    <SA.Root type="hover" className={cn('overflow-hidden', className)}>
      <SA.Viewport className="size-full [&>div]:!block" aria-label={label} tabIndex={label ? 0 : undefined}>
        {children}
      </SA.Viewport>
      <SA.Scrollbar orientation={axis === 'y' ? 'vertical' : 'horizontal'} className="flex touch-none select-none p-0.5 data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2 data-[orientation=horizontal]:flex-col">
        <SA.Thumb className="relative flex-1 rounded-full bg-line-strong/50" />
      </SA.Scrollbar>
    </SA.Root>
  );
}
