import { cn } from '@/lib/cn';

export interface KeyValueItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

/** Label/value rows for metadata. Mono values are right-aligned. */
export function KeyValue({ items, columns = 1, className }: { items: KeyValueItem[]; columns?: 1 | 2; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6', columns === 2 && 'sm:grid-cols-2', className)}>
      {items.map((i) => (
        <div key={i.label} className="flex items-baseline justify-between gap-4 border-b-(length:--bw) border-dashed border-line py-1.5 text-[13.5px] last:border-b-0">
          <dt className="shrink-0 text-ink-2">{i.label}</dt>
          <dd className={cn('min-w-0 text-right [overflow-wrap:anywhere]', i.mono && 'font-mono text-[12.5px] tabular-nums')}>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
