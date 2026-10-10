import type { RunView } from '@casework/core';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/ui';

type StageState = 'pending' | 'active' | 'done' | 'warn';

interface Stage {
  key: string;
  label: string;
  sub: string;
  icon: IconName;
  state: StageState;
  note: string;
}

/** The five stages a run passes through, lit from the RunView. This is the agent's architecture, shown on real data. */
export function pipelineStages(v: RunView): Stage[] {
  const running = v.status === 'running';
  const refused = v.blocked.length;
  const flags = v.assessment?.flags.length ?? 0;
  const must = v.assessment?.flags.filter((f) => f.mustEscalate).length ?? 0;
  const decidedBy = v.next?.decidedBy ?? (v.decisions.at(-1)?.label.includes('(playbook)') ? 'playbook' : v.decisions.length ? 'model' : undefined);
  const acted = v.toolCalls.some((c) => c.status === 'succeeded');
  const failedCalls = v.toolCalls.filter((c) => c.status === 'failed').length;
  const raw: (Omit<Stage, 'state'> & { done: boolean; warn?: boolean })[] = [
    { key: 'read', label: 'Read', sub: 'every source', icon: 'read', note: v.sourcesRead.length ? `${v.sourcesRead.length} sources` : '—', done: v.sourcesRead.length > 0 },
    { key: 'assess', label: 'Assess', sub: 'pack rules', icon: 'assess', note: v.assessment ? `${flags} flag${flags === 1 ? '' : 's'}${must ? ` · ${must} must escalate` : ''}` : '—', done: !!v.assessment, warn: must > 0 },
    { key: 'decide', label: 'Decide', sub: decidedBy === 'playbook' ? 'playbook' : 'model', icon: 'decide', note: decidedBy ? (decidedBy === 'playbook' ? 'rules-only playbook' : 'model chose') : '—', done: v.decisions.length > 0 || acted },
    { key: 'guard', label: 'Guard', sub: 'policy', icon: 'shield', note: refused ? `${refused} refused` : v.toolCalls.length ? 'passed' : '—', done: refused > 0 || v.toolCalls.length > 0, warn: refused > 0 },
    {
      key: 'act',
      label: v.handover ? 'Hand over' : 'Act',
      sub: v.handover ? 'to a person' : 'one action',
      icon: v.handover ? 'escalate' : 'tool',
      note: v.handover ? v.handover.queue : acted ? (v.toolCalls.find((c) => c.status === 'succeeded')?.tool ?? 'done') : failedCalls ? `${failedCalls} failed` : '—',
      done: !!v.outcome,
      warn: !!v.handover || failedCalls > 0,
    },
  ];
  let activeSet = false;
  return raw.map(({ done, warn, ...s }) => {
    let state: StageState = done ? (warn ? 'warn' : 'done') : 'pending';
    if (!done && running && !activeSet && v.steps.length > 0) {
      state = 'active';
      activeSet = true;
    }
    return { ...s, state };
  });
}

const TONE: Record<StageState, string> = {
  pending: 'border-line text-ink-2 opacity-60',
  active: 'border-accent bg-accent-soft text-ink',
  done: 's-resolved border-(--c)/50 text-ink',
  warn: 's-escalated border-(--c) text-ink',
};
const STATE_LABEL: Record<StageState, string> = { pending: 'not reached', active: 'in progress', done: 'done', warn: 'needs attention' };

/** Read → Assess → Decide → Guard → Act / Hand over, with what happened at each. */
export function PipelineStrip({ view, className }: { view: RunView; className?: string }) {
  const stages = pipelineStages(view);
  return (
    <ol aria-label="How the agent processed this run" className={cn('grid grid-cols-2 gap-1.5 sm:grid-cols-5', className)}>
      {stages.map((s, i) => (
        <li key={s.key} className={cn('relative grid gap-0.5 rounded-ui border-(length:--bw) bg-surface px-2.5 py-2 transition-colors', TONE[s.state], i === 4 && 'col-span-2 sm:col-span-1')}>
          <span className="flex items-center gap-1.5">
            <Icon name={s.icon} size={14} className={cn(s.state === 'done' || s.state === 'warn' ? 'text-(--c)' : s.state === 'active' ? 'text-accent' : '')} />
            <b className="text-[13px] font-semibold">{s.label}</b>
            <span className={cn('ml-auto size-1.5 rounded-full', s.state === 'active' ? 'animate-pulse bg-accent' : s.state === 'pending' ? 'bg-line' : 'bg-(--c)')} aria-hidden />
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[.06em] text-ink-2">{s.sub}</span>
          <span className="truncate text-[12px] text-ink-2" title={s.note}>
            {s.note}
          </span>
          <span className="sr-only">{STATE_LABEL[s.state]}</span>
        </li>
      ))}
    </ol>
  );
}
