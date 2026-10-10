'use client';

import type { RunView } from '@casework/core';
import { Citation } from '@/domain/case';
import { Button, CopyButton, Eyebrow, StatusChip } from '@/ui';
import { BlockedAction } from './BlockedAction';
import { ConfidenceMeter } from './ConfidenceMeter';
import { OUTCOME_LABEL } from './OutcomeStamp';

export interface DecisionPanelProps {
  view: RunView;
  onOpenHandover?: () => void;
  onViewTrace?: () => void;
  /** Extra context line, e.g. "As of 11 Oct, before event 4". */
  context?: React.ReactNode;
  /** Show the draft message. Off where the page already shows it (live cases: conversation and review). */
  showDraft?: boolean;
}

/** The agent's decision, compactly: outcome, the one next step and why, how sure, and anything refused. */
export function DecisionPanel({ view: v, onOpenHandover, onViewTrace, context, showDraft = true }: DecisionPanelProps) {
  const n = v.next;
  const running = v.status === 'running';
  const tokens = v.usage ? v.usage.inputTokens + v.usage.outputTokens : 0;
  const open = [...(n?.boundaries ?? []).map((b) => ({ k: 'Does not settle', b })), ...(n?.remainingWork ?? []).map((b) => ({ k: 'Still open', b }))];
  return (
    <section className="grid gap-3" aria-label="Agent decision">
      <header className="flex flex-wrap items-center gap-2">
        <Eyebrow as="h2">Agent decision</Eyebrow>
        {running ? <StatusChip status="running" size="sm" /> : v.outcome && <StatusChip status={v.outcome} size="sm" label={OUTCOME_LABEL[v.outcome]} />}
      </header>
      {context && <p className="-mt-1.5 text-[12px] text-ink-2">{context}</p>}

      {running && !n && <p className="text-[13.5px] text-ink-2">{v.steps.at(-1)?.title ?? 'Starting…'}</p>}

      {n && (
        <>
          <div className="grid gap-0.5">
            <p className="font-mono text-[13.5px] font-semibold [overflow-wrap:anywhere]">{n.action}</p>
            <p className="text-[12.5px] text-ink-2">
              to <b className="font-semibold text-ink">{n.recipient}</b> by {n.channel} · {n.decidedBy === 'model' ? 'model' : 'rules only'}
            </p>
          </div>
          <p className="text-[13.5px] leading-snug [overflow-wrap:anywhere]">{n.reason}</p>
          {showDraft && n.message && (
            <details className="rounded-ui border-(length:--bw) border-line bg-surface px-3 py-2">
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-[12.5px] font-semibold">
                Draft {n.channel}
                <CopyButton value={n.message} label="Copy" className="h-6" />
              </summary>
              <p className="mt-2 max-h-60 overflow-y-auto whitespace-pre-line text-[13px] [overflow-wrap:anywhere]">{n.message}</p>
            </details>
          )}
          <ConfidenceMeter value={n.confidence} reasons={n.confidence < 0.8 && n.decidedBy === 'playbook' ? ['Decided by rules only; a person should check the wording'] : undefined} />
          {n.citations.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-ink-2">Based on</span>
              {n.citations.map((id) => (
                <Citation key={id} sourceId={id} />
              ))}
            </div>
          )}
          {open.length > 0 && (
            <details className="text-[13px]">
              <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-2">Limits and open items ({open.length})</summary>
              <ul className="mt-1.5 grid list-disc gap-0.5 pl-4">
                {open.map((o) => (
                  <li key={`${o.k}:${o.b}`}>
                    <span className="text-ink-2">{o.k}: </span>
                    {o.b}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {!n && !running && v.summary && <p className="text-[13.5px]">{v.summary}</p>}
      {v.blocked.map((b, i) => (
        <BlockedAction key={`${b.action}-${i}`} {...b} />
      ))}

      <p className="font-mono text-[11px] text-ink-2">
        {v.sourcesRead.length} source{v.sourcesRead.length === 1 ? '' : 's'} · {v.toolCalls.length} tool call{v.toolCalls.length === 1 ? '' : 's'}{tokens ? ` · ${tokens.toLocaleString('en-GB')} tokens` : ''}
      </p>
      {!running && (v.handover ? onOpenHandover : onViewTrace) && (
        <div>
          {v.handover && onOpenHandover ? (
            <Button variant="primary" size="sm" icon="arrow" onClick={onOpenHandover}>
              Open handover
            </Button>
          ) : (
            <Button size="sm" onClick={onViewTrace}>
              View audit log
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
