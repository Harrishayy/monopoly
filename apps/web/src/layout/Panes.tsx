import { cn } from '@/lib/cn';

/**
 * Three-pane layout: list · detail · decision. Collapses to two panes under 1120px and one under 860px.
 * On wide screens the list and decision panes scroll on their own, so the detail keeps its place.
 */
export function Panes({ list, detail, aside, listOnMobile = true }: { list: React.ReactNode; detail: React.ReactNode; aside?: React.ReactNode; listOnMobile?: boolean }) {
  const pane = 'min-[860px]:sticky min-[860px]:top-(--nav-h) min-[860px]:max-h-[calc(100dvh-var(--nav-h))] min-[860px]:overflow-y-auto';
  return (
    <div
      className={cn(
        'grid min-h-[calc(100dvh-var(--nav-h))] grid-cols-1 items-start min-[860px]:grid-cols-[260px_minmax(0,1fr)]',
        aside && 'min-[1120px]:grid-cols-[270px_minmax(0,1fr)_310px]',
      )}
    >
      <section
        aria-label="List"
        className={cn('min-w-0 border-b-(length:--bw) border-line min-[860px]:border-b-0 min-[860px]:border-r-(length:--bw) min-[860px]:self-stretch', pane, !listOnMobile && 'max-[859px]:hidden')}
      >
        {list}
      </section>
      <section aria-label="Detail" className="min-w-0">
        {detail}
      </section>
      {aside && (
        <aside
          aria-label="Decision"
          className={cn(
            'min-w-0 border-t-(length:--bw) border-line bg-surface-2/40 min-[860px]:col-span-2 min-[1120px]:col-span-1 min-[1120px]:self-stretch min-[1120px]:border-l-(length:--bw) min-[1120px]:border-t-0',
            'min-[1120px]:sticky min-[1120px]:top-(--nav-h) min-[1120px]:max-h-[calc(100dvh-var(--nav-h))] min-[1120px]:overflow-y-auto',
          )}
        >
          {aside}
        </aside>
      )}
    </div>
  );
}
