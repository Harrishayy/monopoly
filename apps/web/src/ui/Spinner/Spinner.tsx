import { cn } from '@/lib/cn';

/** Small indeterminate loader for buttons and steps. Use Skeleton for anything larger. */
export function Spinner({ size = 16, className, label }: { size?: 12 | 16; className?: string; label?: string }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      style={{ width: size, height: size }}
    />
  );
}
