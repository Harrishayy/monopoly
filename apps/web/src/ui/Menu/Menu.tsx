'use client';

import * as M from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/cn';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Overflow actions. Arrow keys and typeahead from Radix. */
export function Menu({ trigger, items, label }: { trigger: React.ReactElement; items: MenuItem[]; label: string }) {
  return (
    <M.Root>
      <M.Trigger asChild aria-label={label}>
        {trigger}
      </M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={4} className="z-(--z-dialog) min-w-44 rounded-ui border-(length:--bw) border-line-strong bg-surface p-1 shadow-ui">
          {items.map((i) => (
            <M.Item
              key={i.label}
              disabled={i.disabled}
              onSelect={i.onSelect}
              className={cn('cursor-pointer rounded-ui px-2 py-1.5 text-sm outline-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent-soft', i.danger && 'text-bad')}
            >
              {i.label}
            </M.Item>
          ))}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
