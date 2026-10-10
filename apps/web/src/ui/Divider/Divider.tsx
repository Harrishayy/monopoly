import { cn } from '@/lib/cn';

/** Rule between blocks. Pass `landmark` only when it separates landmarks (adds role="separator"). */
export function Divider({ orientation = 'horizontal', strong, landmark, className }: { orientation?: 'horizontal' | 'vertical'; strong?: boolean; landmark?: boolean; className?: string }) {
  return (
    <div
      role={landmark ? 'separator' : undefined}
      aria-orientation={landmark ? orientation : undefined}
      className={cn(orientation === 'horizontal' ? 'h-(--bw) w-full' : 'w-(--bw) self-stretch', strong ? 'bg-line-strong' : 'bg-line', className)}
    />
  );
}
