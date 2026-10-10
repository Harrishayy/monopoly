import { cn } from '@/lib/cn';

/** Placeholder shaped like the real content, so nothing jumps when data arrives. Static under reduced motion. */
export function Skeleton({ variant = 'line', lines = 1, className }: { variant?: 'line' | 'block' | 'row'; lines?: number; className?: string }) {
  const bar = 'skeleton rounded-ui bg-surface-2';
  if (variant === 'block') return <div aria-hidden className={cn(bar, 'h-24 w-full', className)} />;
  if (variant === 'row')
    return (
      <div aria-hidden className={cn('grid gap-2 p-2.5', className)}>
        <div className={cn(bar, 'h-3 w-1/3')} />
        <div className={cn(bar, 'h-4 w-5/6')} />
        <div className={cn(bar, 'h-3 w-1/2')} />
      </div>
    );
  return (
    <div aria-hidden className={cn('grid gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={cn(bar, 'h-3.5', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
