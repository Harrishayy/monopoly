import type { Handover } from '@casework/core';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui';

/** What the agent already attempted. Failures are marked with an X and the word "failed". */
export function TriedList({ tried }: { tried: Handover['tried'] }) {
  if (!tried.length) return <p className="text-[13px] text-ink-2">Nothing yet; the agent stopped before acting.</p>;
  return (
    <ul className="grid gap-1.5 text-[13px] text-ink-2">
      {tried.map((t, i) => (
        <li key={i} className={cn('flex items-start gap-2', !t.ok && 'text-bad')}>
          <Icon name={t.ok ? 'check' : 'x'} size={14} className={cn('mt-0.5 shrink-0', t.ok && 'text-ok')} />
          <span className="font-mono text-[12.5px] [overflow-wrap:anywhere]">
            {t.text}
            {!t.ok && <span className="ml-1 font-sans">(failed)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
