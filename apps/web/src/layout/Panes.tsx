'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const LIST = { def: 270, min: 200, max: 480 };
const ASIDE = { def: 340, min: 280 };
const DETAIL_MIN = 380;
const KEY = 'casework-panes';
const STEP = 24;

interface Widths {
  list: number;
  aside: number;
}

function load(): Widths {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Widths>;
    return { list: v.list ?? LIST.def, aside: v.aside ?? ASIDE.def };
  } catch {
    return { list: LIST.def, aside: ASIDE.def };
  }
}

function save(w: Widths) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    // Private windows: widths just don't persist.
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Three-pane layout: list · detail · decision. Collapses to two panes under 1120px and one under 860px.
 * On wide screens the list and decision panes scroll on their own, and both borders can be dragged
 * (or focused and moved with the arrow keys; double-click resets). Widths are remembered per browser.
 */
export function Panes({
  list,
  detail,
  aside,
  listOnMobile = true,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  aside?: React.ReactNode;
  listOnMobile?: boolean;
}) {
  const [w, setW] = useState<Widths>({ list: LIST.def, aside: ASIDE.def });
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setW(load()), []);

  const asideMax = useCallback(() => Math.max(ASIDE.min, (root.current?.clientWidth ?? 1400) - w.list - DETAIL_MIN), [w.list]);
  const set = useCallback(
    (next: Partial<Widths>) =>
      setW((cur) => {
        const total = root.current?.clientWidth ?? 1400;
        const list = clamp(next.list ?? cur.list, LIST.min, LIST.max);
        const aside = clamp(next.aside ?? cur.aside, ASIDE.min, Math.max(ASIDE.min, total - list - DETAIL_MIN));
        const v = { list, aside };
        save(v);
        return v;
      }),
    [],
  );

  const asideWidth = expanded ? asideMax() : w.aside;
  const pane = 'min-[860px]:sticky min-[860px]:top-(--nav-h) min-[860px]:max-h-[calc(100dvh-var(--nav-h))] min-[860px]:overflow-y-auto';

  return (
    <div
      ref={root}
      style={{ '--list-w': `${w.list}px`, '--aside-w': `${asideWidth}px` } as React.CSSProperties}
      className={cn(
        'grid min-h-[calc(100dvh-var(--nav-h))] grid-cols-1 items-start min-[860px]:grid-cols-[var(--list-w)_minmax(0,1fr)]',
        aside && 'min-[1120px]:grid-cols-[var(--list-w)_minmax(0,1fr)_var(--aside-w)]',
      )}
    >
      <section
        aria-label="List"
        className={cn(
          'relative min-w-0 border-b-(length:--bw) border-line min-[860px]:border-b-0 min-[860px]:border-r-(length:--bw) min-[860px]:self-stretch',
          pane,
          !listOnMobile && 'max-[859px]:hidden',
        )}
      >
        {list}
      </section>
      <section aria-label="Detail" className="relative min-w-0">
        <Resizer
          label="Resize list"
          className="left-0 max-[859px]:hidden"
          value={w.list}
          min={LIST.min}
          max={LIST.max}
          onDrag={(dx, start) => set({ list: start + dx })}
          onStep={(d) => set({ list: w.list + d * STEP })}
          onReset={() => set({ list: LIST.def })}
        />
        {aside && (
          <Resizer
            label="Resize decision panel"
            className="right-0 translate-x-1/2 max-[1119px]:hidden"
            value={asideWidth}
            min={ASIDE.min}
            max={asideMax()}
            onDrag={(dx, start) => {
              setExpanded(false);
              set({ aside: start - dx });
            }}
            onStep={(d) => {
              setExpanded(false);
              set({ aside: asideWidth - d * STEP });
            }}
            onReset={() => {
              setExpanded(false);
              set({ aside: ASIDE.def });
            }}
            startValue={() => asideWidth}
          />
        )}
        {detail}
      </section>
      {aside && (
        <aside
          aria-label="Decision"
          className={cn(
            'relative min-w-0 border-t-(length:--bw) border-line bg-surface-2/40 min-[860px]:col-span-2 min-[1120px]:col-span-1 min-[1120px]:self-stretch min-[1120px]:border-l-(length:--bw) min-[1120px]:border-t-0',
            'min-[1120px]:sticky min-[1120px]:top-(--nav-h) min-[1120px]:max-h-[calc(100dvh-var(--nav-h))] min-[1120px]:overflow-y-auto',
          )}
        >
          <div className="sticky top-0 z-10 pointer-events-none hidden justify-end px-2 pt-2 min-[1120px]:flex">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-pressed={expanded}
              title={expanded ? 'Back to normal width' : 'Widen this panel'}
              className="pointer-events-auto grid size-7 cursor-pointer place-items-center rounded-ui border-(length:--bw) border-line bg-surface text-ink-2 hover:text-ink"
            >
              {expanded ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
              <span className="sr-only">{expanded ? 'Back to normal width' : 'Widen this panel'}</span>
            </button>
          </div>
          {aside}
        </aside>
      )}
    </div>
  );
}

/** A draggable, keyboard-operable column border. */
function Resizer({
  label,
  className,
  value,
  min,
  max,
  onDrag,
  onStep,
  onReset,
  startValue,
}: {
  label: string;
  className?: string;
  value: number;
  min: number;
  max: number;
  onDrag: (dx: number, start: number) => void;
  onStep: (dir: 1 | -1) => void;
  onReset: () => void;
  startValue?: () => number;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={Math.round(max)}
      tabIndex={0}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          onStep(e.key === 'ArrowRight' ? 1 : -1);
        } else if (e.key === 'Home' || e.key === 'Enter') {
          e.preventDefault();
          onReset();
        }
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        const x0 = e.clientX;
        const start = startValue?.() ?? value;
        setDragging(true);
        const move = (ev: PointerEvent) => onDrag(ev.clientX - x0, start);
        const up = () => {
          setDragging(false);
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          document.body.style.removeProperty('user-select');
        };
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }}
      className={cn(
        'group absolute top-0 z-20 h-full w-2 -translate-x-1/2 cursor-col-resize touch-none outline-none',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent hover:after:bg-accent/50 focus-visible:after:bg-accent',
        dragging && 'after:bg-accent',
        className,
      )}
    />
  );
}
