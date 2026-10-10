'use client';

import type { StepKind, ToolCallView } from '@casework/core';
import { memo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/ui';
import { ToolCallBlock } from './ToolCallBlock';

export type TraceStepKind = StepKind | 'retry';
export type TraceStepState = 'pending' | 'active' | 'done';

const ICON: Record<TraceStepKind, IconName> = {
  read: 'read', assess: 'assess', propose: 'propose', tool: 'tool', decide: 'decide', fail: 'fail', retry: 'retry', blocked: 'blocked', escalate: 'escalate', resolve: 'resolve',
};
const NODE_TONE: Partial<Record<TraceStepKind, string>> = {
  fail: 's-failed text-(--c) border-(--c)/50',
  retry: 's-escalated text-(--c) border-(--c)/50',
  blocked: 's-failed text-(--c) border-(--c)/50',
  escalate: 's-escalated text-(--c) border-(--c)',
  resolve: 's-resolved text-(--c) border-(--c)',
};
const KIND_LABEL: Record<TraceStepKind, string> = {
  read: 'Read', assess: 'Assessed', propose: 'Proposed', tool: 'Tool call', decide: 'Decision', fail: 'Failure', retry: 'Retry', blocked: 'Refused', escalate: 'Escalated', resolve: 'Resolved',
};

export interface TraceStepProps {
  kind: TraceStepKind;
  title: string;
  detail: string;
  at: string;
  /** ms since the run started, shown on the right. */
  offsetMs?: number;
  state?: TraceStepState;
  call?: ToolCallView;
  /** Attempt number on fail steps. */
  attempt?: number;
  defaultExpanded?: boolean;
}

/** One step in the trace. Tool steps expand to the full call with every attempt. */
export const TraceStep = memo(function TraceStep({ kind, title, detail, offsetMs, state = 'done', call, attempt, defaultExpanded }: TraceStepProps) {
  const [open, setOpen] = useState(!!defaultExpanded);
  const expandable = !!call || detail.length > 160;
  return (
    <li data-active={state === 'active' || undefined} className={cn('trace-step relative grid grid-cols-[32px_minmax(0,1fr)_auto] gap-3 py-2 transition-opacity', state === 'pending' && 'opacity-30')}>
      <span
        className={cn(
          'trace-node relative z-10 grid size-8 place-items-center rounded-full border-(length:--bw) border-line bg-surface-2 text-ink-2 transition-[background-color,color,transform] duration-(--dur-base)',
          NODE_TONE[kind],
          state === 'active' && 'scale-110 border-accent bg-accent text-accent-ink',
        )}
      >
        <Icon name={ICON[kind]} size={14} label={KIND_LABEL[kind]} />
      </span>
      <div className="min-w-0">
        <div className={cn('text-sm font-semibold [overflow-wrap:anywhere]', kind === 'tool' && 'font-mono text-[12.5px] font-medium')}>
          {title}
          {attempt !== undefined && kind === 'fail' && <span className="ml-2 font-mono text-[11px] font-normal text-ink-2">attempt {attempt}</span>}
        </div>
        <div className={cn('text-[13px] text-ink-2 [overflow-wrap:anywhere]', kind === 'fail' && 'text-bad', !open && 'line-clamp-3')}>{detail}</div>
        {expandable && (
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-1 cursor-pointer text-[12px] font-semibold text-accent hover:underline">
            {open ? 'Hide details' : call ? 'Show call' : 'Show more'}
          </button>
        )}
        {open && call && <div className="mt-2"><ToolCallBlock call={call} /></div>}
      </div>
      <span className="hidden pt-2 font-mono text-[11px] text-ink-2 sm:block">{offsetMs !== undefined ? `+${(offsetMs / 1000).toFixed(1)}s` : ''}</span>
    </li>
  );
});
