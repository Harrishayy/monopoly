'use client';

import type { Handover, HandoverOption, HumanDecision } from '@casework/core';
import { useState } from 'react';
import { Mascot } from '@/domain/mascot';
import { BlockedAction, ConfidenceMeter } from '@/domain/run';
import { api } from '@/lib/api';
import { Eyebrow, StatusChip, Textarea, toast } from '@/ui';
import { FactList } from './FactList';
import { HumanDecisionRecord } from './HumanDecisionRecord';
import { OptionList } from './OptionList';
import { TriedList } from './TriedList';

export interface HandoverCardProps {
  handover: Handover;
  caseRef: string;
  caseTitle?: string;
  runId: string;
  decision?: HumanDecision;
  onDecided?: (d: HumanDecision) => void;
  /** Shown once decided: what the system does next with the decision. */
  nextSteps?: React.ReactNode;
}

/**
 * Everything a person needs to decide, in one card that makes sense on its own:
 * why the agent stopped, what it knows (with sources), what it tried, the options, and what it refused.
 */
export function HandoverCard({ handover: h, caseRef, caseTitle, runId, decision: initial, onDecided, nextSteps }: HandoverCardProps) {
  const [decision, setDecision] = useState<HumanDecision | undefined>(initial);
  const [busy, setBusy] = useState<string>();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const done = decision ?? initial;

  async function choose(o: HandoverOption) {
    setBusy(o.id);
    setError(undefined);
    try {
      const d = await api<HumanDecision>(`/api/cases/${encodeURIComponent(caseRef)}/decisions`, { method: 'POST', json: { runId, optionId: o.id, note: note.trim() || undefined } });
      setDecision(d);
      onDecided?.(d);
      toast.success('Decision recorded', { description: o.label });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <article aria-label={`Handover for ${caseRef}`} className="@container min-w-0 overflow-hidden rounded-ui-lg border-(length:--bw) border-line-strong bg-surface shadow-ui">
      <div className="grid @xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4 p-4 @md:p-5">
          <div className="flex items-start gap-3">
            <Mascot state={done ? 'done' : 'esc'} size={46} />
            <div className="grid min-w-0 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={done ? 'resolved' : 'escalated'} label={done ? 'Decided' : 'Needs you'} size="sm" />
                <span className="font-mono text-[11.5px] text-ink-2">
                  {caseRef} · {h.queue}
                </span>
              </div>
              <h3 className="text-[18px] font-bold tracking-tight">{done ? 'Decided. Here is the record.' : 'I stopped here. You need to decide.'}</h3>
              {caseTitle && <p className="text-[12.5px] text-ink-2">{caseTitle}</p>}
              <p className="text-[14px] [overflow-wrap:anywhere]">{h.reason}</p>
            </div>
          </div>
          <ConfidenceMeter value={h.confidence} />
          <section className="grid gap-2">
            <Eyebrow as="h4">What I know</Eyebrow>
            <FactList facts={h.facts} />
          </section>
          <section className="grid gap-2">
            <Eyebrow as="h4">What I tried</Eyebrow>
            <TriedList tried={h.tried} />
          </section>
        </div>
        <div className="grid content-start gap-3 border-t-(length:--bw) border-line bg-surface-2/45 p-4 @md:p-5 @xl:border-l-(length:--bw) @xl:border-t-0">
          <Eyebrow as="h4">{done ? 'Decision' : 'Your options'}</Eyebrow>
          {!done && <Textarea label="Note for the record (optional)" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
          <OptionList options={h.options} onChoose={choose} chosenId={done?.optionId} busyId={busy} disabled={!!busy} />
          {error && (
            <p role="alert" className="text-[12.5px] text-bad">
              {error}
            </p>
          )}
          {done && <HumanDecisionRecord decision={done} optionLabel={h.options.find((o) => o.id === done.optionId)?.label} />}
          {done && nextSteps && (
            <div className="grid gap-1 rounded-ui border-(length:--bw) border-accent/40 bg-accent-soft/60 px-3 py-2.5 text-[13px]" role="status">
              <Eyebrow tone="accent">What happens next</Eyebrow>
              {nextSteps}
            </div>
          )}
          {h.refused.map((r) => (
            <BlockedAction key={`${r.action}-${r.ruleId}`} action={r.action} ruleId={r.ruleId} heading="The agent will not" />
          ))}
          <p className="text-[12px] text-ink-2">Your choice is logged with this card, so the audit trail shows who decided and why.</p>
        </div>
      </div>
    </article>
  );
}
