import type { Handover } from '@casework/core';
import { Citation } from '@/domain/case';

/** Facts, each with the source that proves it. The handover builder drops facts without one. */
export function FactList({ facts }: { facts: Handover['facts'] }) {
  return (
    <ul className="grid gap-2">
      {facts.map((f, i) => (
        <li key={`${f.sourceId}-${i}`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-[13.5px]">
          <span className="min-w-[10rem] flex-1 [overflow-wrap:anywhere]">{f.text}</span>
          <Citation sourceId={f.sourceId} />
        </li>
      ))}
    </ul>
  );
}
