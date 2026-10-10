'use client';

import * as TG from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/cn';

export interface SegmentedControlProps<V extends string> {
  label: string;
  options: { value: V; label: React.ReactNode }[];
  value: V;
  onChange: (v: V) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/** One of 2–4 options. Arrow keys move the selection; the thumb slides with CSS. */
export function SegmentedControl<V extends string>({ label, options, value, onChange, size = 'md', className }: SegmentedControlProps<V>) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <TG.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v as V)}
      className={cn('relative inline-grid auto-cols-fr grid-flow-col rounded-ui border-(length:--bw) border-line bg-surface-2 p-0.5', className)}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-[calc(var(--r)-1px)] bg-surface shadow-ui transition-transform duration-(--dur-base) ease-(--out)"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <TG.Item
          key={o.value}
          value={o.value}
          className={cn(
            'relative z-10 cursor-pointer whitespace-nowrap rounded-ui font-semibold text-ink-2 transition-colors hover:text-ink data-[state=on]:text-ink',
            size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3.5 py-1.5 text-[13.5px]',
          )}
        >
          {o.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
