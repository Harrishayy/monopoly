'use client';

import type { CaseStatus, MascotState } from '@casework/core';
import { Mascot, MASCOT_NAME } from '@/domain/mascot';
import { cn } from '@/lib/cn';
import { DIRECTIONS, useUi } from '@/state/ui';
import { Button, Eyebrow, StatusChip } from '@/ui';

const STATES: [MascotState, string, string][] = [
  ['idle', 'Idle', 'Watching the inbox'],
  ['think', 'Thinking', 'Reading sources'],
  ['act', 'Acting', 'Calling a tool'],
  ['fail', 'Recovering', 'A tool failed, retrying'],
  ['esc', 'Hand up', 'A person needs to decide'],
  ['done', 'Done', 'Case closed'],
];
const SWATCHES = ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'line', 'accent', 'ok', 'hold', 'info', 'bad'];
const STATUSES: CaseStatus[] = ['resolved', 'escalated', 'needs_info', 'failed', 'running', 'blocked'];

/**
 * Every token and component in every state. Add each new component here with all its states.
 * Full visual reference: docs/design/casework-design-directions.html
 */
export function DesignView() {
  const { direction, setDirection } = useUi();
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Eyebrow>Design reference</Eyebrow>
          <h1 className="text-4xl font-bold tracking-tight">Casework design system</h1>
        </div>
        <div role="group" aria-label="Direction" className="flex gap-1 rounded-ui border-(length:--bw) border-line bg-surface-2 p-1">
          {DIRECTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={d.id === direction}
              onClick={() => setDirection(d.id)}
              className={cn('rounded-ui px-3 py-1.5 text-[13px] font-semibold text-ink-2', d.id === direction && 'bg-surface text-ink')}
            >
              <span className="mr-1.5 font-mono text-[11px] opacity-70">{d.key}</span>
              {d.name}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Mascot · {MASCOT_NAME[direction]}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATES.map(([s, name, desc]) => (
            <div key={s} className="grid justify-items-center gap-1 rounded-ui-lg border-(length:--bw) border-line bg-surface p-4 text-center shadow-ui">
              <Mascot state={s} size={80} decorative />
              <b className="text-[13.5px]">{name}</b>
              <span className="text-xs text-ink-2">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Colour tokens</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {SWATCHES.map((t) => (
            <div key={t} className="grid gap-1.5 text-xs">
              <i className="block h-12 rounded-ui border-(length:--bw) border-line" style={{ background: `var(--${t})` }} />
              <code className="font-mono text-ink-2">--{t}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Run agent</Button>
          <Button>Ask for info</Button>
          <Button variant="ghost">Override</Button>
          <Button variant="danger">Stop run</Button>
          <Button variant="primary" size="sm" loading>
            Calling tool…
          </Button>
          <Button size="sm" disabled>
            Disabled
          </Button>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
