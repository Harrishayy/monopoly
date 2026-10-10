import { Fragment } from 'react';
import { cn } from '@/lib/cn';

/** Inline **bold** only; everything else is plain text. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i} className="font-semibold">{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  );
}

/**
 * Renders the light markdown in case files and history bodies: headings, bullets, bold, paragraphs.
 * Not a full markdown parser on purpose; source text is shown, not interpreted.
 */
export function Prose({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <div className={cn('grid gap-2.5 text-[13.5px] leading-relaxed [overflow-wrap:anywhere]', className)}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        const h = b.match(/^#{1,4}\s+(.+)$/);
        if (h && lines.length === 1) return <h4 key={i} className="pt-1 font-display text-[15px] font-bold">{inline(h[1]!)}</h4>;
        if (lines.every((l) => /^\s*[-*]\s+/.test(l) || !l.trim()))
          return (
            <ul key={i} className="grid list-disc gap-1 pl-5">
              {lines.filter((l) => l.trim()).map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ''))}</li>)}
            </ul>
          );
        return (
          <p key={i} className="whitespace-pre-line">
            {lines.map((l, j) => {
              const hh = l.match(/^#{1,4}\s+(.+)$/);
              return (
                <Fragment key={j}>
                  {j > 0 && '\n'}
                  {hh ? <b className="font-display font-bold">{inline(hh[1]!)}</b> : inline(l.trim() ? l.replace(/^\s{2,}/, '') : l)}
                </Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
