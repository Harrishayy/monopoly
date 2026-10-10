'use client';

import { useApi } from '@/lib/api';
import { ErrorState, Mono, Sheet, Skeleton } from '@/ui';
import { MarkdownText } from './MarkdownText';

/** Shows a file the CLI wrote (ANSWER.md, REASONING.md or trace.jsonl) in a side sheet. */
export function AnswerViewer({ path, onClose }: { path: string | null; onClose: () => void }) {
  const { data, error, loading } = useApi<string>(path ? `/api/answers?path=${encodeURIComponent(path)}` : null);
  const text = data === undefined ? undefined : typeof data === 'string' ? data : JSON.stringify(data);
  return (
    <Sheet open={!!path} onOpenChange={(o) => !o && onClose()} title={path ?? ''}>
      {loading && <Skeleton lines={8} />}
      {error && <ErrorState error={{ title: 'Couldn’t read the file', detail: error }} />}
      {text !== undefined &&
        (path?.endsWith('.jsonl') ? (
          <ol className="grid gap-1.5">
            {text
              .split('\n')
              .filter(Boolean)
              .map((l, i) => {
                let e: { seq?: number; type?: string } = {};
                try {
                  e = JSON.parse(l);
                } catch {}
                return (
                  <li key={i} className="grid gap-0.5 border-b-(length:--bw) border-dashed border-line pb-1.5">
                    <Mono className="text-[12px] font-semibold">
                      {e.seq ?? i} · {e.type ?? 'unparsed'}
                    </Mono>
                    <Mono muted className="text-[11px]">{l.length > 400 ? `${l.slice(0, 400)}…` : l}</Mono>
                  </li>
                );
              })}
          </ol>
        ) : (
          <MarkdownText text={text} />
        ))}
    </Sheet>
  );
}
