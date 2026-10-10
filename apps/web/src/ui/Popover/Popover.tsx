'use client';

import * as P from '@radix-ui/react-popover';

/** Rich content anchored to a trigger, e.g. a citation preview. */
export function Popover({ trigger, children, side = 'bottom', open, onOpenChange }: { trigger: React.ReactElement; children: React.ReactNode; side?: P.PopoverContentProps['side']; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content side={side} sideOffset={6} collisionPadding={12} className="z-(--z-dialog) w-80 max-w-[calc(100vw-24px)] rounded-ui-lg border-(length:--bw) border-line-strong bg-surface p-3 text-sm shadow-ui outline-none">
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
