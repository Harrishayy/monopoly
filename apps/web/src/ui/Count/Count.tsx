import { cn } from '@/lib/cn';

/** Small number badge on nav tabs. Hidden at zero. Pair with text that says what it counts. */
export function Count({ value, max = 99, tone = 'neutral', className }: { value: number; max?: number; tone?: 'neutral' | 'accent'; className?: string }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        'inline-grid min-w-5 place-items-center rounded-full px-1.5 font-mono text-[10.5px] font-semibold leading-[18px] tabular-nums',
        tone === 'accent' ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2',
        className,
      )}
    >
      {value > max ? `${max}+` : value}
    </span>
  );
}
