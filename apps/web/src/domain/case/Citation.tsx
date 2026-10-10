'use client';

import { Icon, Popover } from '@/ui';
import { KIND, shortSourceLabel } from './kinds';
import { useSources } from './SourcesContext';

/** Small link from a fact to its source. Hover or focus previews the snippet; the button opens the viewer. */
export function Citation({ sourceId, label }: { sourceId: string; label?: string }) {
  const { sources, open } = useSources();
  const s = sources.find((x) => x.id === sourceId);
  const text = label ?? shortSourceLabel(sourceId);
  const chip = 'inline-flex min-w-0 max-w-full shrink cursor-pointer items-center gap-1 whitespace-nowrap rounded-ui bg-accent-soft px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-accent hover:ring-1 hover:ring-accent';
  if (!s)
    return (
      <span className={chip.replace('cursor-pointer', '')} title={`${sourceId} is not in the sources loaded here`}>
        {text}
      </span>
    );
  return (
    <Popover
      trigger={
        <button type="button" className={chip} aria-label={`Source: ${s.title}`}>
          <Icon name={KIND[s.kind].icon} size={12} className="shrink-0" />
          <span className="truncate">{text}</span>
        </button>
      }
    >
      <div className="grid gap-2">
        <b className="text-[13px] [overflow-wrap:anywhere]">{s.title}</b>
        <p className="line-clamp-6 whitespace-pre-line text-[12.5px] text-ink-2 [overflow-wrap:anywhere]">{s.body.replace(/\*\*/g, '').slice(0, 600)}</p>
        {open && (
          <button type="button" onClick={() => open(s.id)} className="justify-self-start cursor-pointer text-[12.5px] font-semibold text-accent underline underline-offset-2">
            Open in sources
          </button>
        )}
      </div>
    </Popover>
  );
}
