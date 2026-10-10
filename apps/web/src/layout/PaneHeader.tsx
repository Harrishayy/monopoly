import { cn } from '@/lib/cn';
import { Eyebrow } from '@/ui';

/** Title row at the top of a pane. Sticky inside its pane. */
export function PaneHeader({ title, eyebrow, actions, sticky = true, className }: { title: React.ReactNode; eyebrow?: string; actions?: React.ReactNode; sticky?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 border-b-(length:--bw) border-line bg-bg/95 px-4 py-3 backdrop-blur', sticky && 'sticky top-0 z-(--z-sticky)', className)}>
      <div className="grid min-w-0 gap-0.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="truncate text-base font-bold">{title}</h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
