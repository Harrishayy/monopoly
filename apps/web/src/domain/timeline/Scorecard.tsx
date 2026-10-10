import type { CutLabel, RunSummary } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { Mono, Spinner } from '@/ui';
import { verdictFor } from './verdict';
import { VerdictChip } from './VerdictChip';

export interface ScorecardRow {
  label: CutLabel;
  run?: RunSummary;
}

/** One row per labelled point: what the label accepts, what the agent chose, and the verdict. Click a row to inspect its run. */
export function Scorecard({ rows, selectedRunId, onSelect }: { rows: ScorecardRow[]; selectedRunId?: string | null; onSelect: (runId: string, cutBefore: number) => void }) {
  const decided = rows.filter((r) => r.run?.next);
  const accepted = decided.filter((r) => verdictFor(r.label, r.run!.next!.action) === 'accepted').length;
  const prohibited = decided.filter((r) => verdictFor(r.label, r.run!.next!.action) === 'prohibited').length;
  return (
    <section aria-label="Scorecard" className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-bold">Scorecard</h2>
        <span className="font-mono text-[12px] text-ink-2">
          {accepted}/{decided.length} accepted · {prohibited} prohibited · {rows.length - decided.length} to go
        </span>
      </div>
      <div className="overflow-x-auto rounded-ui border-(length:--bw) border-line">
        <table className="w-full min-w-[460px] border-collapse text-[12.5px]">
          <thead className="bg-surface-2/60 text-left text-ink-2">
            <tr>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Point</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Accepted</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Agent chose</th>
              <th scope="col" className="px-2.5 py-1.5 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, run }) => {
              const v = verdictFor(label, run?.next?.action);
              const selected = !!run && run.runId === selectedRunId;
              return (
                <tr key={label.cutBefore} className={cn('border-t-(length:--bw) border-line', selected && 'bg-accent-soft')}>
                  <td className="px-2.5 py-1.5">
                    {run ? (
                      <button type="button" onClick={() => onSelect(run.runId, label.cutBefore)} className="cursor-pointer font-mono font-semibold text-accent underline-offset-2 hover:underline" aria-current={selected || undefined}>
                        before {label.cutBefore}
                      </button>
                    ) : (
                      <span className="font-mono text-ink-2">before {label.cutBefore}</span>
                    )}
                    <span className="ml-1.5 text-[11px] text-ink-2">{label.kind}</span>
                  </td>
                  <td className="px-2.5 py-1.5">
                    <Mono muted>{label.accept.join(' · ')}</Mono>
                  </td>
                  <td className="px-2.5 py-1.5">{run?.next ? <Mono>{run.next.action}</Mono> : run && !run.done ? <Spinner size={12} label="Deciding" /> : <span className="text-ink-2">—</span>}</td>
                  <td className="px-2.5 py-1.5">{v ? <VerdictChip verdict={v} size="sm" /> : <span className="text-ink-2">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
