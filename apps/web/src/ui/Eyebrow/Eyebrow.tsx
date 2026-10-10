import { cn } from '@/lib/cn';

const TONE = { muted: 'text-ink-2', accent: 'text-accent', bad: 'text-bad' };

/** Small uppercase label above content. Never the only label for a control. */
export function Eyebrow({ children, tone = 'muted', className, as: C = 'span' }: { children: React.ReactNode; tone?: keyof typeof TONE; className?: string; as?: 'span' | 'h2' | 'h3' | 'h4' | 'p' }) {
  return <C className={cn('font-mono text-[11px] font-medium uppercase tracking-[.08em]', TONE[tone], className)}>{children}</C>;
}
