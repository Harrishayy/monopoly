'use client';

import * as T from '@radix-ui/react-tooltip';

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <T.Provider delayDuration={300} skipDelayDuration={150}>
    {children}
  </T.Provider>
);

/** Short hint on hover or focus. Never the only place important information lives. */
export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactElement; side?: T.TooltipContentProps['side'] }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-(--z-dialog) max-w-72 rounded-ui bg-ink px-2 py-1 text-[12px] leading-snug text-bg shadow-ui data-[state=delayed-open]:animate-[fade-in_var(--dur-fast)_var(--out)]"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
