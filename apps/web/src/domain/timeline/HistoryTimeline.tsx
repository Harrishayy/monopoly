'use client';

import type { CutLabel, HistoryEventView, RunSummary } from '@/lib/api-types';
import { KIND } from '@/domain/case';
import { cn } from '@/lib/cn';
import { Icon, RelativeTime, Spinner } from '@/ui';
import { EventBody } from './EventBody';
import { verdictFor } from './verdict';
import { VerdictChip } from './VerdictChip';

const kindOf = (channel: string) => {
  const c = channel.toLowerCase();
  if (c.includes('email')) return KIND.email;
  if (c.includes('call')) return KIND.call;
  if (c.includes('sms') || c.includes('message')) return KIND.sms;
  if (c === 'update' || c === 'hold') return KIND.crm;
  return KIND.note;
};

export interface HistoryTimelineProps {
  events: HistoryEventView[];
  labels: CutLabel[];
  /** The point being inspected; events from here on are dimmed as hidden from the agent. */
  cutBefore: number | null;
  /** Latest run at each point (key = cutBefore). */
  runsByCut: Map<number, RunSummary>;
  onDecide: (cutBefore: number) => void;
  busy?: boolean;
  /** Offer "Decide here" between every two events, not only at labelled decision points. */
  anywhere?: boolean;
}

/** The case history, with its labelled decision points marked. With `anywhere`, any gap between events can be a decision point. */
export function HistoryTimeline({ events, labels, cutBefore, runsByCut, onDecide, busy, anywhere }: HistoryTimelineProps) {
  const labelAt = new Map(labels.map((l) => [l.cutBefore, l]));
  const pointNo = new Map([...labels].sort((a, b) => a.cutBefore - b.cutBefore).map((l, i) => [l.cutBefore, i + 1]));
  return (
    <ol aria-label="Case history" className="grid">
      {events.map((e, i) => {
        const hidden = cutBefore !== null && e.n >= cutBefore;
        const k = kindOf(e.channel);
        const label = labelAt.get(e.n);
        const run = runsByCut.get(e.n);
        const verdict = verdictFor(label, run?.next?.action);
        const selected = cutBefore === e.n;
        return (
          <li key={e.n} className="grid">
            {i > 0 && (label || run || selected || anywhere) && (
              <div className={cn('group relative grid grid-cols-[32px_minmax(0,1fr)] gap-3', selected && 'my-1')}>
                <span aria-hidden className="mx-auto w-px bg-line" />
                <div className="flex min-h-8 flex-wrap items-center gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => onDecide(e.n)}
                    disabled={busy}
                    aria-label={`Decide as of just before event ${e.n}`}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-ui border-(length:--bw) px-2 py-1 font-mono text-[11px] font-semibold transition-opacity disabled:cursor-not-allowed',
                      selected
                        ? 'border-accent bg-accent text-accent-ink'
                        : label || run
                          ? 'border-accent/50 bg-accent-soft text-accent'
                          : 'border-dashed border-line text-ink-2',
                    )}
                  >
                    <Icon name="decide" size={12} />
                    {label ? `Decision point ${pointNo.get(e.n)}` : selected ? `Deciding before event ${e.n}` : 'Decide here'}
                  </button>
                  {label && <span className="text-[11.5px] text-ink-2">{label.kind === 'determined' ? 'Clear-cut' : 'Judgement call'}</span>}
                  {run && !run.done && <Spinner size={12} label="Deciding" />}
                  {verdict && <VerdictChip verdict={verdict} size="sm" />}
                </div>
              </div>
            )}
            {selected && (
              <div role="separator" aria-label="Hidden from the agent below" className="s-escalated my-1 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[.08em] text-(--c)">
                <span className="h-px flex-1 bg-(--c)/50" />
                Hidden from the agent
                <span className="h-px flex-1 bg-(--c)/50" />
              </div>
            )}
            <div className={cn('grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-1 transition-opacity', hidden && 'opacity-40', selected && 'rounded-ui bg-surface-2/60 opacity-100 ring-1 ring-line')}>
              <span className="grid size-8 place-items-center rounded-full border-(length:--bw) border-line bg-surface text-ink-2">
                <Icon name={k.icon} size={14} label={k.label} />
              </span>
              <div className="grid min-w-0 gap-0.5 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
                  <span className="font-mono text-[11px] text-ink-2">#{e.n}</span>
                  <b className="font-semibold">{e.channel}</b>
                  <span className="text-ink-2">
                    {e.from} → {e.to}
                  </span>
                  <RelativeTime at={e.at} absolute className="ml-auto font-mono text-[11px] text-ink-2" />
                </div>
                <EventBody text={e.body} lines={2} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
