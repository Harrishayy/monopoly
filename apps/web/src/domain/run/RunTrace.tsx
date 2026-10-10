import type { RunView, StepKind } from '@casework/core';
import { TriangleAlert, BookOpen, Check, GitBranch, Hand, Lock, Wrench } from 'lucide-react';
import { cn } from '@/lib/cn';

const ICON: Record<StepKind, React.ComponentType<{ size?: number }>> = {
  read: BookOpen,
  tool: Wrench,
  decide: GitBranch,
  fail: TriangleAlert,
  blocked: Lock,
  escalate: Hand,
  resolve: Check,
};

const TONE: Partial<Record<StepKind, string>> = {
  fail: 'text-bad border-bad/50',
  blocked: 'text-bad border-bad/50',
  escalate: 'text-hold border-hold',
  resolve: 'text-ok border-ok',
};

/** Ordered steps of a run, from the shared RunView. Live and replay use the same component. */
export function RunTrace({ view }: { view: RunView }) {
  if (!view.steps.length) return null;
  const last = view.steps.at(-1)?.seq;
  return (
    <ol className="grid" aria-live="polite">
      {view.steps.map((s) => {
        const Icon = ICON[s.kind];
        const active = view.status === 'running' && s.seq === last;
        return (
          <li key={s.seq} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-2">
            <span
              className={cn(
                'z-10 grid size-8 place-items-center rounded-full border-(length:--bw) border-line bg-surface-2 text-ink-2',
                TONE[s.kind],
                active && 'scale-110 border-accent bg-accent text-accent-ink',
              )}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0">
              <div className={cn('text-sm font-semibold [overflow-wrap:anywhere]', s.kind === 'tool' && 'font-mono text-[12.5px] font-medium')}>
                {s.title}
              </div>
              <div className={cn('text-[13px] text-ink-2', s.kind === 'fail' && 'text-bad')}>{s.detail}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
