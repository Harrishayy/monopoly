'use client';

import type { Case, Vocabulary } from '@casework/core';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CaseHeader, SourcesProvider } from '@/domain/case';
import { HandoverCard } from '@/domain/handover';
import { Conversation, OUTBOUND_CHIP, OutboundCard } from '@/domain/live';
import { Prose } from '@/domain/case';
import { Mascot } from '@/domain/mascot';
import { AssessmentPanel, AuditLogRow, DecisionPanel, PipelineStrip, RunTrace } from '@/domain/run';
import { Panes } from '@/layout';
import { api, useApi } from '@/lib/api';
import type { OutboundView, RunSummary } from '@/lib/api-types';
import { useLiveSignal } from '@/lib/live';
import { useRunStream } from '@/lib/sse';
import { Button, Eyebrow, Icon, RelativeTime, StatusChip, TabPanel, Tabs, toast, type ChipStatus } from '@/ui';

type Tab = 'review' | 'conversation' | 'actions';

/**
 * A case opened by a real call, email or portal report. Shows the conversation as it grows, every
 * agent run on it (newest first, each re-run kept), and the messages the outbound gate sent or held.
 */
export function LiveCaseWorkspace({ c: initial, vocabulary, list }: { c: Case; vocabulary: Vocabulary; list: React.ReactNode }) {
  const ref = initial.ref;
  const [tab, setTab] = useState<Tab>('conversation');
  // ?tab=review (from old approval links) opens the review straight away.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'review' || t === 'actions' || t === 'conversation') setTab(t);
  }, []);
  const caseApi = useApi<Case>(`/api/cases/${encodeURIComponent(ref)}`, { initial, live: true });
  const c = caseApi.data ?? initial;
  const runs = useApi<RunSummary[]>(`/api/runs?case=${encodeURIComponent(ref)}`, { live: true, poll: (d) => !!d?.some((r) => !r.done), intervalMs: 1500 });
  const outbound = useApi<OutboundView[]>(`/api/outbound?case=${encodeURIComponent(ref)}`, { live: true });
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Follow the newest run unless the operator picked an older one.
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const latest = runs.data?.[0]?.runId;
    if (latest && (!runId || !pinned)) setRunId(latest);
  }, [runs.data, runId, pinned]);
  useLiveSignal((s) => {
    if (s.caseRef === ref && s.kind === 'run.started' && !pinned) setRunId(s.runId);
  });

  const { view, status, error: streamError } = useRunStream(runId);
  useEffect(() => {
    if (status === 'ended') {
      void runs.reload();
      void outbound.reload();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = runs.data?.find((r) => r.runId === runId);
  const runStatus: ChipStatus | undefined = runId ? (view.status === 'running' ? 'running' : view.outcome) : undefined;
  const held = outbound.data?.filter((o) => o.status === 'awaiting_approval' || o.status === 'failed') ?? [];
  const crm = c.sources.filter((s) => s.kind === 'crm');
  // Open on the review when something is waiting for a person.
  const [autoReview, setAutoReview] = useState(true);
  useEffect(() => {
    if (autoReview && held.length) {
      setTab('review');
      setAutoReview(false);
    }
  }, [held.length, autoReview]);

  const rerun = useCallback(async () => {
    setStarting(true);
    try {
      const { runId: id } = await api<{ runId: string }>(`/api/live/cases/${encodeURIComponent(ref)}/run`, { method: 'POST' });
      setPinned(false);
      setRunId(id);
      setTab('actions');
      void runs.reload();
    } catch (e) {
      toast.error('Could not start the agent', { description: (e as Error).message });
    } finally {
      setStarting(false);
    }
  }, [ref, runs]);

  const detail = (
    <div className="grid content-start gap-5 p-4 sm:p-6">
      <Link href="/inbox" className="-mb-2 text-[13px] font-semibold text-accent min-[860px]:hidden">
        ← All {vocabulary.cases.toLowerCase()}
      </Link>
      <CaseHeader
        c={c}
        status={held.length ? 'escalated' : runStatus}
        statusLabel={held.length ? 'Needs approval' : undefined}
        actions={
          <Button size="sm" variant="primary" icon="decide" onClick={rerun} loading={starting} disabled={view.status === 'running' && !!runId}>
            Run agent again
          </Button>
        }
      />
      {c.customer.id && <p className="-mt-3 font-mono text-[12px] text-ink-2">{c.customer.id}</p>}
      <Tabs
        label={`${vocabulary.case} views`}
        value={tab}
        onChange={setTab}
        items={[
          { value: 'review', label: 'Review messages', count: held.length || undefined },
          { value: 'conversation', label: 'Conversation', count: c.sources.filter((s) => s.kind !== 'crm').length + (outbound.data?.filter((o) => o.status !== 'superseded').length ?? 0) },
          { value: 'actions', label: 'Agent actions', count: runs.data?.length || undefined },
        ]}
      >
        <TabPanel value="review" className="grid gap-5">
          {outbound.data?.length ? (
            <>
              {[...held, ...outbound.data.filter((o) => !held.includes(o))].map((o) => {
                const reasons = (o.why ?? '').split(/;\s*/).filter(Boolean);
                const waiting = held.includes(o);
                return (
                  <section key={`${o.id}:${o.status}`} aria-label={`Message to ${o.recipient}`} className="grid gap-3">
                    {waiting && reasons.length > 0 && (
                      <div className="grid gap-2 rounded-ui-lg border-(length:--bw) border-accent/35 bg-accent-soft p-3.5">
                        <Eyebrow as="h3">Why this needs you</Eyebrow>
                        <ul className="grid gap-1.5">
                          {reasons.map((r) => (
                            <li key={r} className="flex items-start gap-2 text-[13.5px]">
                              <Icon name="escalate" size={14} className="mt-0.5 shrink-0 text-ink-2" />
                              <span>{r[0]!.toUpperCase() + r.slice(1)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <OutboundCard o={o} rows={14} onChanged={() => void outbound.reload()} />
                    {waiting && (
                      <p className="text-[12.5px] text-ink-2">
                        Approve sends it {o.address ? `to ${o.address}` : `to ${o.recipient}`} by {o.channel}. Edits are saved with the message. Reject keeps it on the
                        record and sends nothing. The agent’s reasoning is in the panel on the right.
                      </p>
                    )}
                  </section>
                );
              })}
              {crm.length > 0 && (
                <section aria-label="Who is involved" className="grid gap-2">
                  <Eyebrow as="h3">Who is involved</Eyebrow>
                  {crm.map((s) => (
                    <div key={s.id} className="rounded-ui-lg border-(length:--bw) border-line bg-surface p-3">
                      <p className="mb-1.5 text-[13px] font-semibold">{s.title}</p>
                      <Prose text={s.body} />
                    </div>
                  ))}
                </section>
              )}
            </>
          ) : (
            <p className="text-[13.5px] text-ink-2">Nothing proposed yet. Messages the agent wants to send show here, sent or held for approval.</p>
          )}
        </TabPanel>
        <TabPanel value="conversation">
          <Conversation sources={c.sources} outbound={outbound.data ?? []} onReview={() => setTab('review')} />
        </TabPanel>
        <TabPanel value="actions" className="grid gap-4">
          {runs.data && runs.data.length > 0 && (
            <ol className="grid gap-1" aria-label="Runs on this case">
              {runs.data.map((r, i) => (
                <li key={r.runId}>
                  <button
                    type="button"
                    aria-pressed={r.runId === runId}
                    onClick={() => {
                      setRunId(r.runId);
                      setPinned(i !== 0);
                    }}
                    className="flex w-full cursor-pointer flex-wrap items-center gap-2 rounded-ui border-(length:--bw) border-transparent p-2 text-left text-[13px] hover:bg-surface-2 aria-pressed:border-accent/35 aria-pressed:bg-accent-soft"
                  >
                    <StatusChip status={!r.done ? 'running' : (r.outcome ?? 'failed')} size="sm" />
                    <span className="font-semibold">{i === 0 ? 'Latest run' : `Run ${runs.data!.length - i}`}</span>
                    <span className="min-w-0 truncate text-ink-2">{r.next ? `${r.next.action} → ${r.next.recipient}` : (r.lastStep?.title ?? '')}</span>
                    <RelativeTime at={r.startedAt} className="ml-auto font-mono text-[11px] text-ink-2" />
                  </button>
                </li>
              ))}
            </ol>
          )}
          {runId ? (
            <>
              <PipelineStrip view={view} />
              <RunTrace view={view} mode={status === 'open' && view.status === 'running' ? 'live' : 'replay'} />
              {selected?.decision && (
                <ul className="grid">
                  <AuditLogRow event={selected.decision} />
                </ul>
              )}
              {(streamError || selected?.error) && (
                <p role="alert" className="rounded-ui border border-dashed border-bad/60 p-3 text-[13px] text-bad">
                  {streamError ?? selected?.error}
                </p>
              )}
            </>
          ) : (
            <p className="text-[13.5px] text-ink-2">The agent hasn’t run on this case yet.</p>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );

  const aside = (
    <div className="grid content-start gap-5 p-4 sm:p-5">
      <section className="grid gap-2" aria-label="Outbound messages">
        <div className="flex items-center justify-between">
          <Eyebrow as="h2">Outbound</Eyebrow>
          {held.length > 0 && <span className="font-mono text-[11px] text-ink-2">{held.length} need a person</span>}
        </div>
        {outbound.data?.length ? (
          <ul className="grid gap-1">
            {outbound.data.map((o) => (
              <li key={`${o.id}:${o.status}`}>
                <button
                  type="button"
                  onClick={() => setTab('review')}
                  className="grid w-full cursor-pointer gap-1 rounded-ui border-(length:--bw) border-line bg-surface p-2 text-left hover:border-line-strong"
                >
                  <span className="flex items-center gap-2">
                    <StatusChip status={OUTBOUND_CHIP[o.status].status} label={OUTBOUND_CHIP[o.status].label} size="sm" />
                    <span className="text-[12.5px] font-semibold">To {o.recipient}</span>
                    <RelativeTime at={o.sentAt ?? o.createdAt} className="ml-auto font-mono text-[11px] text-ink-2" />
                  </span>
                  <span className="line-clamp-2 text-[12.5px] text-ink-2">{o.body}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-2">Nothing proposed yet.</p>
        )}
        {held.length > 0 && tab !== 'review' && (
          <Button size="sm" variant="primary" icon="propose" onClick={() => setTab('review')}>
            Review {held.length === 1 ? 'message' : `${held.length} messages`}
          </Button>
        )}
      </section>
      {runId ? (
        <>
          <DecisionPanel view={view} context="On the whole conversation so far" onOpenHandover={() => document.getElementById('handover')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} onViewTrace={() => setTab('actions')} />
          {view.handover && (
            <div id="handover" className="scroll-mt-16">
              <HandoverCard key={runId} handover={view.handover} caseRef={ref} caseTitle={c.title} runId={runId} decision={selected?.decision} onDecided={() => void runs.reload()} />
            </div>
          )}
          {view.assessment && (
            <details className="group grid gap-3 rounded-ui-lg border-(length:--bw) border-line bg-surface p-3">
              <summary className="cursor-pointer font-display text-[14px] font-bold">Rules assessment</summary>
              <div className="mt-3">
                <AssessmentPanel assessment={view.assessment} />
              </div>
            </details>
          )}
        </>
      ) : (
        <div className="grid justify-items-center gap-3 py-8 text-center">
          <Mascot state="idle" size={72} />
          <p className="text-[13.5px] text-ink-2">The agent’s decision appears here once it runs.</p>
        </div>
      )}
    </div>
  );

  return (
    <SourcesProvider sources={c.sources} open={() => setTab('conversation')}>
      <Panes list={list} listOnMobile={false} detail={detail} aside={aside} />
    </SourcesProvider>
  );
}
