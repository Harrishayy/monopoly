import type { NextStep } from '@casework/core';
import type { CutLabel, HistoryEventView, Verdict } from '@/lib/api-types';
import { ConfidenceMeter } from '@/domain/run';
import { Eyebrow, Mono, RelativeTime, Spinner } from '@/ui';
import { EventBody } from './EventBody';
import { VerdictChip } from './VerdictChip';

export interface CutComparisonProps {
  /** null = decided on the full current history. */
  cutBefore: number | null;
  asOf?: string;
  /** The agent's step, once it has one. */
  next?: Pick<NextStep, 'action' | 'recipient' | 'reason' | 'confidence' | 'decidedBy'>;
  running?: boolean;
  /** What actually happened at the cut (event `cutBefore`). */
  happened?: HistoryEventView;
  label?: CutLabel;
  verdict?: Verdict;
}

const Chips = ({ items, tone }: { items: string[]; tone: 'ok' | 'bad' }) => (
  <span className="flex flex-wrap gap-1">
    {items.map((a) => (
      <span key={a} className={`${tone === 'ok' ? 's-resolved' : 's-failed'} rounded-ui border border-(--c)/40 bg-(--c)/10 px-1.5 py-0.5 font-mono text-[11px] text-ink`}>
        {tone === 'bad' && <span className="sr-only">Prohibited: </span>}
        {a}
      </span>
    ))}
  </span>
);

/** Side by side: what the agent decided at this point vs what really happened next, with the label's verdict. */
export function CutComparison({ cutBefore, asOf, next, running, happened, label, verdict }: CutComparisonProps) {
  return (
    <section aria-label="Agent vs what happened" className="grid gap-3 rounded-ui-lg border-(length:--bw) border-line-strong bg-surface p-4 shadow-ui">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-[15px] font-bold">{cutBefore === null ? 'Decision on the full history' : `Decision just before event ${cutBefore}`}</h2>
        {asOf && (
          <span className="font-mono text-[11px] text-ink-2">
            as of <RelativeTime at={asOf} absolute />
          </span>
        )}
        <span className="ml-auto">{verdict ? <VerdictChip verdict={verdict} /> : running ? <Spinner size={12} label="Deciding" /> : null}</span>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-1.5 rounded-ui border-(length:--bw) border-accent/40 bg-accent-soft/50 p-3">
          <Eyebrow tone="accent">Agent decided</Eyebrow>
          {next ? (
            <>
              <Mono className="text-[13.5px] font-semibold">{next.action}</Mono>
              <span className="text-[12.5px] text-ink-2">
                → {next.recipient} · {next.decidedBy === 'model' ? 'model' : 'playbook'}
              </span>
              <p className="line-clamp-4 text-[13px] [overflow-wrap:anywhere]">{next.reason}</p>
              <ConfidenceMeter value={next.confidence} />
            </>
          ) : (
            <p className="text-[13px] text-ink-2">{running ? 'Reading the history and deciding…' : 'Not decided yet.'}</p>
          )}
        </div>
        <div className="grid content-start gap-1.5 rounded-ui border-(length:--bw) border-line bg-surface-2/50 p-3">
          <Eyebrow>What happened next</Eyebrow>
          {happened ? (
            <>
              <span className="text-[12.5px] text-ink-2">
                Event {happened.n} · <b className="text-ink">{happened.channel}</b> · {happened.from} → {happened.to}
              </span>
              <EventBody text={happened.body} lines={3} />
            </>
          ) : (
            <p className="text-[13px] text-ink-2">{cutBefore === null ? 'Nothing yet; this is the latest point in the history.' : 'Not in the history.'}</p>
          )}
          {label?.happened && <p className="text-[12.5px] text-ink-2">Label: {label.happened}</p>}
        </div>
      </div>
      {label ? (
        <div className="grid gap-2 border-t-(length:--bw) border-dashed border-line pt-3 text-[13px]">
          <div className="flex flex-wrap items-baseline gap-2">
            <Eyebrow>Labelled answer · {label.kind}</Eyebrow>
          </div>
          <p>{label.situation}</p>
          <div className="grid gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-baseline sm:gap-x-3">
            <span className="text-[12.5px] text-ink-2">Accepted</span>
            <Chips items={label.accept} tone="ok" />
            {label.prohibit.length > 0 && (
              <>
                <span className="text-[12.5px] text-ink-2">Prohibited</span>
                <Chips items={label.prohibit} tone="bad" />
              </>
            )}
          </div>
          {label.boundaries && label.boundaries.length > 0 && (
            <ul className="grid list-disc gap-0.5 pl-4 text-[12.5px] text-ink-2">
              {label.boundaries.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {label.note && <p className="text-[12.5px] italic text-ink-2">{label.note}</p>}
        </div>
      ) : (
        cutBefore !== null && <p className="text-[12.5px] text-ink-2">No label for this point, so compare with what happened next yourself.</p>
      )}
    </section>
  );
}
