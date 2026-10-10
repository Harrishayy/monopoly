import { cn } from '@/lib/cn';

/** Determinate progress, e.g. cases finished in a batch. */
export function ProgressBar({ value, max, label, className }: { value: number; max: number; label: string; className?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-(--dur-slow) ease-(--out)', pct >= 100 ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct}%` }} />
    </div>
  );
}
