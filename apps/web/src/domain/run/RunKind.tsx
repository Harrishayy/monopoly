'use client';

import { RUN_KIND_META, RUN_KINDS, type RunKind } from '@casework/core';
import type { RunTag } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { Input, Select } from '@/ui';

export type RunKindFilterValue = RunKind | 'all';

/** Small label for what a run was for, plus the name it was given. */
export function RunKindBadge({ tag, className }: { tag: RunTag; className?: string }) {
  const meta = RUN_KIND_META[tag.kind];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12px]', className)} title={tag.note ?? meta.description}>
      <span className={cn('rounded-ui border-(length:--bw) px-1.5 py-px font-mono text-[10.5px] font-semibold uppercase tracking-wider', KIND_TONE[tag.kind])}>{meta.label}</span>
      {tag.name && <span className="font-semibold text-ink">{tag.name}</span>}
    </span>
  );
}

const KIND_TONE: Record<RunKind, string> = {
  smoke: 'border-line bg-surface-2 text-ink-2',
  train: 'border-line-strong bg-surface text-ink',
  val: 'border-accent/50 bg-accent-soft text-ink',
  test: 'border-accent bg-accent text-accent-ink',
  full: 'border-line-strong bg-surface text-ink',
  practice: 'border-line bg-surface-2 text-ink',
  reality: 'border-ink bg-ink text-bg',
  live: 'border-ok/50 bg-ok/10 text-ok',
  adhoc: 'border-line bg-surface text-ink-2',
};

/** Chips to split a list of runs by kind. Only kinds present are shown, each with its count. */
export function RunKindFilter({ runs, value, onChange, className }: { runs: { kind: RunKind }[]; value: RunKindFilterValue; onChange: (v: RunKindFilterValue) => void; className?: string }) {
  const counts = new Map<RunKind, number>();
  for (const r of runs) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const items: { value: RunKindFilterValue; label: string; n: number }[] = [
    { value: 'all', label: 'All', n: runs.length },
    ...RUN_KINDS.filter((k) => counts.has(k)).map((k) => ({ value: k, label: RUN_KIND_META[k].label, n: counts.get(k)! })),
  ];
  return (
    <div role="radiogroup" aria-label="Run type" className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((i) => {
        const on = i.value === value;
        return (
          <button
            key={i.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(i.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border-(length:--bw) px-2.5 py-1 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent',
              on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {i.label}
            <span className="font-mono text-[11px] tabular-nums opacity-70">{i.n}</span>
          </button>
        );
      })}
    </div>
  );
}

export const filterByKind = <T extends { kind: RunKind }>(runs: T[], v: RunKindFilterValue) => (v === 'all' ? runs : runs.filter((r) => r.kind === v));

/** Kind and name to give a run before starting it. */
export function RunTagFields({ value, onChange, kinds = RUN_KINDS }: { value: RunTag; onChange: (t: RunTag) => void; kinds?: readonly RunKind[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select label="Run type" value={value.kind} onChange={(kind) => onChange({ ...value, kind })} options={kinds.map((k) => ({ value: k, label: `${RUN_KIND_META[k].label} · ${RUN_KIND_META[k].description}` }))} />
      <Input label="Name (optional)" placeholder="e.g. haiku prompt v3" maxLength={80} value={value.name ?? ''} onChange={(e) => onChange({ ...value, name: e.target.value })} />
    </div>
  );
}
