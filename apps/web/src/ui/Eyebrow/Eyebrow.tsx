import { cn } from '@/lib/cn';

/** Small uppercase label above content. Never the only label for a control. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[11px] font-medium uppercase tracking-[.08em] text-ink-2', className)}>
      {children}
    </span>
  );
}
