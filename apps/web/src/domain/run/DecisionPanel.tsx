'use client';

import type { RunView } from '@casework/core';
import { Citation } from '@/domain/case';
import { Mascot } from '@/domain/mascot';
import { Button, CopyButton, Eyebrow, KeyValue } from '@/ui';
import { BlockedAction } from './BlockedAction';
import { ConfidenceMeter } from './ConfidenceMeter';
import { OutcomeStamp } from './OutcomeStamp';

export interface DecisionPanelProps {
  view: RunView;
  /** Animate the stamp: pass true only on the live running→completed transition. */
  animateIn?: boolean;
  onOpenHandover?: () => void;
  onViewTrace?: () => void;
  /** Extra context line, e.g. "As of 11 Oct, before event 4". */
  context?: React.ReactNode;
}

/** Outcome, the single next step with its draft, why, what it doesn't settle, and anything refused. */
export function DecisionPanel({ view: v, animateIn, onOpenHandover, onViewTrace, context }: DecisionPanelProps) {
  const n = v.next;
  const running = v.status === 'running';
  const tokens = v.usage ? v.usage.inputTokens + v.usage.outputTokens : 0;
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow as="h2">Agent decision</Eyebrow>
        <Mascot state={v.mascot} size={30} />
      </div>
      {context && <p className="-mt-2 text-[12.5px] text-ink-2">{context}</p>}
      <div className="flex min-h-[70px] items-center">
        <OutcomeStamp outcome={running ? undefined : v.outcome} animateIn={animateIn} />
      </div>
      {running && !n && <p className="text-[13.5px] text-ink-2">{v.steps.at(-1)?.title ?? 'Starting…'}</p>}
      {n && (
        <section className="grid gap-3" aria-label="Next step">
          <div className="grid gap-1">
            <Eyebrow>Next step</Eyebrow>
            <p className="font-mono text-[14px] font-semibold [overflow-wrap:anywhere]">{n.action}</p>
            <p className="text-[13px] text-ink-2">
              To <b className="text-ink">{n.recipient}</b> by {n.channel}
              {' · '}
              <span className="font-mono text-[11px] uppercase">{n.decidedBy === 'model' ? 'chosen by the model' : 'rules-only playbook'}</span>
            </p>
          </div>
          <p className="text-[14px] [overflow-wrap:anywhere]">{n.reason}</p>
          {n.message && (
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Eyebrow>Draft {n.channel}</Eyebrow>
                <CopyButton value={n.message} label="Copy draft" className="h-7" />
              </div>
              <blockquote tabIndex={0} className="max-h-60 overflow-y-auto whitespace-pre-line rounded-ui border-l-4 border-accent bg-surface px-3 py-2 text-[13px] [overflow-wrap:anywhere]">{n.message}</blockquote>
            </div>
          )}
          {n.citations.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12.5px] text-ink-2">Based on</span>
              {n.citations.map((id) => (
                <Citation key={id} sourceId={id} />
              ))}
            </div>
          )}
          <ConfidenceMeter value={n.confidence} reasons={n.confidence < 0.8 && n.decidedBy === 'playbook' ? ['Decided by rules only; a person should check the wording'] : undefined} />
          {n.boundaries.length > 0 && (
            <div className="grid gap-1">
              <Eyebrow>This does not settle</Eyebrow>
              <ul className="grid list-disc gap-0.5 pl-4 text-[13px]">
                {n.boundaries.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {n.remainingWork.length > 0 && (
            <div className="grid gap-1">
              <Eyebrow>Still open</Eyebrow>
              <ul className="grid list-disc gap-0.5 pl-4 text-[13px]">
                {n.remainingWork.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      {!n && !running && v.summary && <p className="text-[14px]">{v.summary}</p>}
      {v.blocked.map((b, i) => (
        <BlockedAction key={`${b.action}-${i}`} {...b} />
      ))}
      <KeyValue
        items={[
          { label: 'Sources read', value: v.sourcesRead.length, mono: true },
          { label: 'Tool calls', value: v.toolCalls.length, mono: true },
          ...(tokens ? [{ label: 'Model tokens', value: tokens.toLocaleString('en-GB'), mono: true }] : []),
        ]}
      />
      {!running && (
        <div className="flex flex-wrap gap-2">
          {v.handover && onOpenHandover ? (
            <Button variant="primary" size="sm" icon="arrow" onClick={onOpenHandover}>
              Open handover
            </Button>
          ) : (
            onViewTrace && (
              <Button variant="primary" size="sm" onClick={onViewTrace}>
                View audit log
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
