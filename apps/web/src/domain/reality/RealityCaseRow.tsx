'use client';

import Link from 'next/link';
import type { BatchCase } from '@/lib/api-types';
import { Button, Mono, Spinner, StatusChip } from '@/ui';

export type AnswerFile = 'ANSWER.md' | 'REASONING.md' | 'trace.jsonl';

/** One case in a batch: its outcome and links to what the system wrote or the live run. */
export function RealityCaseRow({ result, onView }: { result: BatchCase; onView?: (path: string) => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-(length:--bw) border-line py-2 last:border-b-0">
      <Mono className="w-10 text-[12px] text-ink-2">#{result.n}</Mono>
      <Link href={`/cases/${encodeURIComponent(result.ref)}${result.runId ? `?run=${result.runId}` : ''}`} className="min-w-24 flex-1 truncate font-mono text-[12.5px] hover:underline">
        {result.ref}
      </Link>
      {result.status === 'pending' && <StatusChip status="new" size="sm" label="Waiting" />}
      {result.status === 'running' && (
        <span className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <Spinner size={12} /> Running
        </span>
      )}
      {result.status === 'done' && <StatusChip status={result.outcome ?? 'failed'} size="sm" label={result.outcome === 'resolved' ? 'Next step taken' : undefined} />}
      {result.error && <span className="w-full text-[12px] text-bad">{result.error}</span>}
      {result.answerPath && onView && (
        <span className="flex gap-1">
          {(['ANSWER.md', 'REASONING.md', 'trace.jsonl'] as AnswerFile[]).map((f) => (
            <Button key={f} size="sm" variant="ghost" className="h-8 px-2 font-mono text-[11.5px]" onClick={() => onView(`${result.answerPath}/${f}`)}>
              {f}
            </Button>
          ))}
        </span>
      )}
    </li>
  );
}
