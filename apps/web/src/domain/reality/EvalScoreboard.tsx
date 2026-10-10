'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { EvalRow, EvalScore, EvalView } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { Mono, ProgressBar, SegmentedControl, StatusChip } from '@/ui';

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '–');

function ScoreTile({ label, s, hint }: { label: string; s: EvalScore; hint: string }) {
  return (
    <div className="grid gap-1 rounded-ui-lg border-(length:--bw) border-line bg-surface p-4 shadow-ui">
      <span className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-2">{label}</span>
      <span className="font-display text-3xl font-bold tabular-nums">{pct(s.accepted, s.n)}</span>
      <span className="text-[12.5px] text-ink-2">
        accepted action · <span className={cn(s.prohibited ? 'font-semibold text-bad' : '')}>{pct(s.prohibited, s.n)} prohibited</span> · {s.n} cuts
      </span>
      <span className="text-[12px] text-ink-2">{hint}</span>
    </div>
  );
}

/** Labelled cut used in a case link. Case numbers come from the eval labels. */
export const cutHref = (r: Pick<EvalRow, 'case' | 'cutBefore'>, refPrefix: string) => `/cases/${refPrefix}-${r.case}?cut=${r.cutBefore}`;

/**
 * The eval harness made visible: how often the agent picks an action the agency accepted at each
 * labelled point in the example histories, and how often it picks a prohibited one.
 */
export function EvalScoreboard({ view, refPrefix }: { view: EvalView; refPrefix: string }) {
  const [filter, setFilter] = useState<'misses' | 'prohibited' | 'all'>('misses');
  const byAction = useMemo(() => {
    const m = new Map<string, EvalRow[]>();
    for (const r of view.rows) for (const a of r.accept) m.set(a, [...(m.get(a) ?? []), r]);
    return [...m].sort((a, b) => b[1].length - a[1].length);
  }, [view.rows]);
  const rows = view.rows.filter((r) => (filter === 'all' ? true : filter === 'prohibited' ? r.prohibited : !r.pass));

  return (
    <div className="grid gap-6">
      {!view.done && <ProgressBar value={view.rows.length} max={view.total} label="Cuts scored" />}
      <div className="grid gap-3 md:grid-cols-3">
        <ScoreTile label="All cuts" s={view.score.all} hint="Every labelled point in the example histories" />
        <ScoreTile label="Determined" s={view.score.determined} hint="One right answer follows from the facts" />
        <ScoreTile label="Judgement" s={view.score.judgement} hint="More than one reasonable next step" />
      </div>

      <section className="grid gap-2" aria-labelledby="by-action">
        <h3 id="by-action" className="text-base font-bold">By expected action</h3>
        <p className="text-[12.5px] text-ink-2">A cut counts once for each action the agency would have accepted there.</p>
        <ul className="grid gap-1.5">
          {byAction.map(([a, rs]) => {
            const ok = rs.filter((r) => r.pass).length;
            return (
              <li key={a} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_88px] items-center gap-3 text-[13px]">
                <Mono className="truncate">{a}</Mono>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(100 * ok) / rs.length}%` }} />
                </span>
                <span className="text-right font-mono tabular-nums">
                  {pct(ok, rs.length)} <span className="text-ink-2">/{rs.length}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-3" aria-labelledby="cut-rows">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="cut-rows" className="text-base font-bold">Cuts</h3>
          <SegmentedControl
            label="Show cuts"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'misses', label: `Misses (${view.rows.filter((r) => !r.pass).length})` },
              { value: 'prohibited', label: `Prohibited (${view.rows.filter((r) => r.prohibited).length})` },
              { value: 'all', label: `All (${view.rows.length})` },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-2">{view.rows.length ? 'None in this view.' : 'No cuts scored yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-ink-2">
                <tr className="border-b-(length:--bw) border-line">
                  <th className="py-2 pr-3 font-semibold">Cut</th>
                  <th className="py-2 pr-3 font-semibold">Verdict</th>
                  <th className="py-2 pr-3 font-semibold">Stage (rules)</th>
                  <th className="py-2 pr-3 font-semibold">Chose</th>
                  <th className="py-2 font-semibold">Accepted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.case}@${r.cutBefore}`} className="border-b-(length:--bw) border-dashed border-line align-top">
                    <td className="py-2 pr-3">
                      <Link href={cutHref(r, refPrefix)} className="font-mono text-accent underline-offset-2 hover:underline">
                        {r.case}@{r.cutBefore}
                      </Link>
                      <span className="block text-[11px] text-ink-2">{r.kind}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <StatusChip size="sm" status={r.pass ? 'resolved' : r.prohibited ? 'failed' : 'escalated'} label={r.pass ? 'Accepted' : r.prohibited ? 'Prohibited' : 'Missed'} />
                    </td>
                    <td className="py-2 pr-3 text-ink-2">{r.stage ?? '–'}</td>
                    <td className="py-2 pr-3">
                      <Mono>{r.action}</Mono>
                      <span className="block text-[11px] text-ink-2">{r.decidedBy}</span>
                    </td>
                    <td className="py-2">
                      {r.accept.map((a) => (
                        <Mono key={a} className="mr-2 inline-block">
                          {a}
                        </Mono>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
