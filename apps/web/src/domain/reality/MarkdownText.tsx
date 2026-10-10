import { Fragment } from 'react';

/** Inline `code` and **bold** only. */
function inline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="rounded-[3px] bg-surface-2 px-1 font-mono text-[0.88em]">
        {part.slice(1, -1)}
      </code>
    ) : part.startsWith('**') && part.endsWith('**') ? (
      <b key={i}>{part.slice(2, -2)}</b>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/**
 * Renders the Markdown the ANSWERS writer produces: headings, lists, quotes, tables as text, code fences.
 * Deliberately small; anything unrecognised shows as a paragraph.
 */
export function MarkdownText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.startsWith('```')) {
      const body: string[] = [];
      while (++i < lines.length && !lines[i]!.startsWith('```')) body.push(lines[i]!);
      out.push(<pre key={i} className="overflow-x-auto rounded-ui bg-surface-2 p-3 font-mono text-[12px] leading-[1.65]">{body.join('\n')}</pre>);
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const cls = ['', 'text-xl', 'text-lg', 'text-base', 'text-sm'][h[1]!.length];
      out.push(<p key={i} role="heading" aria-level={h[1]!.length + 1} className={`${cls} mt-3 font-display font-bold first:mt-0`}>{inline(h[2]!)}</p>);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*([-*]|\d+\.)\s+/, ''));
      i--;
      const L = ordered ? 'ol' : 'ul';
      out.push(<L key={i} className={`${ordered ? 'list-decimal' : 'list-disc'} grid gap-1 pl-5`}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</L>);
    } else if (l.startsWith('>')) {
      const q: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) q.push(lines[i++]!.replace(/^>\s?/, ''));
      i--;
      out.push(<blockquote key={i} className="whitespace-pre-wrap border-l-2 border-line-strong pl-3 text-ink-2">{q.join('\n')}</blockquote>);
    } else if (l.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('|')) rows.push(lines[i++]!);
      i--;
      out.push(<pre key={i} className="overflow-x-auto font-mono text-[12px] leading-[1.65]">{rows.join('\n')}</pre>);
    } else if (l.trim()) out.push(<p key={i} className="[overflow-wrap:anywhere]">{inline(l)}</p>);
  }
  return <div className="grid gap-2 text-[14px] leading-relaxed">{out}</div>;
}
