'use client';

import * as T from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';
import { Count } from '../Count';

export interface TabItem<V extends string> {
  value: V;
  label: string;
  count?: number;
}

/** Switch panels. Pass panels as children keyed by value with <TabPanel>. */
export function Tabs<V extends string>({ items, value, onChange, children, label, className }: { items: TabItem<V>[]; value: V; onChange: (v: V) => void; children: React.ReactNode; label: string; className?: string }) {
  return (
    <T.Root value={value} onValueChange={(v) => onChange(v as V)} className={cn('grid gap-3', className)}>
      <T.List aria-label={label} className="flex flex-wrap gap-1 border-b-(length:--bw) border-line">
        {items.map((t) => (
          <T.Trigger
            key={t.value}
            value={t.value}
            className="-mb-(--bw) flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-[13.5px] font-semibold text-ink-2 hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink"
          >
            {t.label}
            {t.count !== undefined && <Count value={t.count} />}
          </T.Trigger>
        ))}
      </T.List>
      {children}
    </T.Root>
  );
}

export const TabPanel = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => (
  <T.Content value={value} className={cn('outline-none', className)}>
    {children}
  </T.Content>
);
