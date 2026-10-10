import type { CutLabel, RunSummary } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { Spinner } from '@/ui';
import { verdictFor } from './verdict';
import { VerdictChip } from './VerdictChip';

export interface ScorecardRow {
  label: CutLabel;
  run?: RunSummary;
}

/**
 * The case's decision points: moments in the history where the team labelled what should happen next.
 * One button per point: pick it to run the agent there (or reopen its last run), with the verdict once decided.
 */
export function Scorecard({ rows, selectedCut, onPick, busy }: { rows: ScorecardRow[]; selectedCut?: number | null; onPick: (cutBefore: number) => void; busy?: boolean }) {
  const decided = rows.filter((r) => r.run?.next);
  const accepted = decided.filter((r) => verdictFor(r.label, r.run!.next!.action) === 'accepted').length;
  const prohibited = decided.filter((r) => verdictFor(r.label, r.run!.next!.action) === 'prohibited').length;
  if (!rows.length) {
    return (
      <p className="rounded-ui border-(length:--bw) border-dashed border-line p-3 text-[13px] text-ink-2">
        No labelled decision points for this case. Press <b className="text-ink">Decide now</b>, or turn on “Decide at any event” below.
      </p>
    );
  }
  return (
    <section aria-label="Decision points" className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-bold">Where the agent has to decide</h2>
        <span className="font-mono text-[12px] text-ink-2">
          {accepted}/{decided.length} accepted{prohibited ? ` · ${prohibited} prohibited` : ''} · {rows.length - decided.length} to run
        </span>
      </div>
      <ol className="flex flex-wrap gap-2">
        {rows.map(({ label, run }, i) => {
          const v = verdictFor(label, run?.next?.action);
          const selected = selectedCut === label.cutBefore;
          return (
            <li key={label.cutBefore}>
              <button
                type="button"
                onClick={() => onPick(label.cutBefore)}
                disabled={busy && !run}
                aria-current={selected || undefined}
                title={label.situation}
                className={cn(
                  'grid cursor-pointer justify-items-start gap-1 rounded-ui border-(length:--bw) px-2.5 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60',
                  selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <span className="flex items-baseline gap-1.5 text-[12.5px]">
                  <b>Point {i + 1}</b>
                  <span className="font-mono text-[11px] text-ink-2">before #{label.cutBefore}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  {label.kind === 'determined' ? 'Clear-cut' : 'Judgement call'}
                  {v ? <VerdictChip verdict={v} size="sm" /> : run && !run.done ? <Spinner size={12} label="Deciding" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-[12px] text-ink-2">The organisers mark no decision points in property cases. These are moments our team labelled with the steps it would accept.</p>
    </section>
  );
}
