import { duration } from '@/lib/format';

/** ms as 820ms, 12.4s or 6m 12s. */
export function DurationText({ ms, className }: { ms: number; className?: string }) {
  return <span className={`font-mono tabular-nums ${className ?? ''}`}>{duration(ms)}</span>;
}
