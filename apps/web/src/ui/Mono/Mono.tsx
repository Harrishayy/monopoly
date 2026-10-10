import { cn } from '@/lib/cn';

/** Machine text: refs, tool names, amounts in tables. Wraps anywhere so long calls never overflow. */
export function Mono({ children, muted, className }: { children: React.ReactNode; muted?: boolean; className?: string }) {
  return <span className={cn('font-mono text-[0.9em] tabular-nums [overflow-wrap:anywhere]', muted && 'text-ink-2', className)}>{children}</span>;
}
