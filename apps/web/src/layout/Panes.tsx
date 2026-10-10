import { cn } from '@/lib/cn';

/** Three-pane layout: list · detail · decision. Collapses to two panes under 1120px and one under 860px. */
export function Panes({ list, detail, aside }: { list: React.ReactNode; detail: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div
      className={cn(
        'grid min-h-[calc(100dvh-57px)] grid-cols-1 min-[860px]:grid-cols-[260px_minmax(0,1fr)]',
        aside && 'min-[1120px]:grid-cols-[270px_minmax(0,1fr)_310px]',
      )}
    >
      <section aria-label="List" className="min-w-0 border-b-(length:--bw) border-line min-[860px]:border-b-0 min-[860px]:border-r-(length:--bw)">
        {list}
      </section>
      <section aria-label="Detail" className="min-w-0">
        {detail}
      </section>
      {aside && (
        <aside aria-label="Decision" className="min-w-0 border-t-(length:--bw) border-line bg-surface-2/40 min-[860px]:col-span-2 min-[1120px]:col-span-1 min-[1120px]:border-l-(length:--bw) min-[1120px]:border-t-0">
          {aside}
        </aside>
      )}
    </div>
  );
}
