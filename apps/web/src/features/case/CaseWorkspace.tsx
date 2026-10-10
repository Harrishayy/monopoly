'use client';

import type { Case, RunEvent, Vocabulary } from '@casework/core';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaseHeader, SourceChip, SourcesProvider, SourceViewer } from '@/domain/case';
import { HandoverCard } from '@/domain/handover';
import { Mascot } from '@/domain/mascot';
import { AssessmentPanel, AuditLogRow, DecisionPanel, PipelineStrip, RunTrace } from '@/domain/run';
import { CutComparison, EndingReveal, HistoryTimeline, Scorecard, verdictFor } from '@/domain/timeline';
import { Panes } from '@/layout';
import { api, useApi } from '@/lib/api';
import type { AgentId, CaseTimeline, RunSummary, ToolRegistry } from '@/lib/api-types';
import { useRunStream } from '@/lib/sse';
import { useUi } from '@/state/ui';
import { Button, Eyebrow, SegmentedControl, Skeleton, ErrorState, Switch, TabPanel, Tabs, toast, type ChipStatus } from '@/ui';

type Tab = 'step' | 'sources' | 'trace';

const AGENTS: { value: AgentId; label: string; hint: string }[] = [
  { value: 'a', label: 'Agent A', hint: 'Rules read the case, then the model picks one action; a policy guard can refuse it.' },
  { value: 'b', label: 'Agent B', hint: 'Fixed pipeline: fact ledger, three sampled decisions, a critic, then a gate.' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The case workspace: step through the history and see what the agent decides at each point,
 * read the sources, and inspect the run. Detail and decision panes share one selected run.
 */
export function CaseWorkspace({ c, vocabulary, list, initialRun, initialCut }: { c: Case; vocabulary: Vocabulary; list: React.ReactNode; initialRun?: string; initialCut?: number }) {
  const ref = c.ref;
  const [tab, setTab] = useState<Tab>('step');
  const [activeSource, setActiveSource] = useState<string>(c.sources[0]?.id ?? '');
  const [runId, setRunId] = useState<string | null>(null);
  const [selectedCut, setSelectedCut] = useState<number | null | undefined>(undefined);
  const [starting, setStarting] = useState(false);
  const [walking, setWalking] = useState(false);
  const stopWalk = useRef(false);
  const startedHere = useRef(new Set<string>());
  const [animated, setAnimated] = useState(new Set<string>());
  const [agent, setAgent] = useState<AgentId>('a');
  const [anywhere, setAnywhere] = useState(false);
  const { autonomy } = useUi();

  const { data: registry } = useApi<ToolRegistry>('/api/tools');
  const modelAvailable = !!registry?.model.configured;
  // Both agents use the model when a key is set; without one they fall back (A: playbook, B: fallback).
  const mode = modelAvailable ? 'model' : 'rules';

  const timeline = useApi<CaseTimeline>(`/api/cases/${encodeURIComponent(ref)}/timeline`);
  const allRuns = useApi<RunSummary[]>(`/api/runs?case=${encodeURIComponent(ref)}`, {
    poll: (d) => walking || !!d?.some((r) => !r.done),
    intervalMs: 1200,
  });
  // Points, scorecard and verdicts show the chosen agent's runs only.
  const runs = { ...allRuns, data: allRuns.data?.filter((r) => r.agent === agent) };

  const onEvent = useCallback(
    (e: RunEvent) => {
      if (!startedHere.current.has(e.runId) || walking) return;
      toast.event(e, ref);
    },
    [ref, walking],
  );
  const { view, status, error: streamError } = useRunStream(runId, onEvent);

  // Reopen the latest run for this case when the page loads.
  const autoPicked = useRef(false);
  useEffect(() => {
    if (autoPicked.current || runId || !runs.data) return;
    autoPicked.current = true;
    // Deep links: ?run=<id> opens that run; ?cut=<n> opens that point (and its latest run, if any).
    const linked = initialRun ? allRuns.data?.find((r) => r.runId === initialRun) : undefined;
    if (linked && linked.agent !== agent) setAgent(linked.agent);
    if (initialCut !== undefined && !linked) {
      const atCut = runs.data.find((r) => r.cut?.cutBefore === initialCut);
      setSelectedCut(initialCut);
      if (atCut) setRunId(atCut.runId);
      return;
    }
    const latest = linked ?? runs.data[0];
    if (latest) {
      setRunId(latest.runId);
      setSelectedCut(latest.cut?.cutBefore ?? null);
    }
  }, [runs.data, runId, initialRun, initialCut]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the run list whenever the selected run finishes.
  useEffect(() => {
    if (status === 'ended' || status === 'error') void runs.reload();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // The stamp animates once, only for a run started here that we watched finish.
  const animateIn = !!runId && startedHere.current.has(runId) && view.status === 'completed' && !animated.has(runId);
  useEffect(() => {
    if (animateIn && runId) {
      const t = setTimeout(() => setAnimated((s) => new Set(s).add(runId)), 900);
      return () => clearTimeout(t);
    }
  }, [animateIn, runId]);

  const start = useCallback(
    async (cutBefore: number | null) => {
      setStarting(true);
      try {
        const { runId: id } = await api<{ runId: string }>('/api/runs', { method: 'POST', json: { caseRef: ref, cutBefore: cutBefore ?? undefined, mode, agent, autonomy } });
        startedHere.current.add(id);
        setRunId(id);
        setSelectedCut(cutBefore);
        void runs.reload();
        return id;
      } catch (e) {
        toast.error('Could not start the run', { description: (e as Error).message });
        return null;
      } finally {
        setStarting(false);
      }
    },
    [ref, mode, agent, autonomy, runs],
  );

  async function walkAll() {
    const labels = [...(timeline.data?.labels ?? [])].sort((a, b) => a.cutBefore - b.cutBefore);
    if (!labels.length) return;
    stopWalk.current = false;
    setWalking(true);
    setTab('step');
    for (const l of labels) {
      if (stopWalk.current) break;
      const id = await start(l.cutBefore);
      if (!id) break;
      for (;;) {
        await sleep(600);
        const r = await api<{ run: RunSummary }>(`/api/runs/${id}`).catch(() => null);
        if (!r || r.run.done || stopWalk.current) break;
      }
      await sleep(400);
    }
    setWalking(false);
    void runs.reload();
    toast.success('Step-through finished', { description: `${labels.length} decision points decided by ${agent === 'a' ? 'Agent A' : 'Agent B'}` });
  }

  // Latest run per cut point for this case.
  const runsByCut = useMemo(() => {
    const m = new Map<number, RunSummary>();
    for (const r of runs.data ?? []) if (r.cut && !m.has(r.cut.cutBefore)) m.set(r.cut.cutBefore, r);
    return m;
  }, [runs.data]);
  const selectedRun = allRuns.data?.find((r) => r.runId === runId);
  const cut = selectedCut === undefined ? (selectedRun?.cut?.cutBefore ?? null) : selectedCut;
  const label = cut !== null ? timeline.data?.labels.find((l) => l.cutBefore === cut) : undefined;
  const happened = cut !== null ? timeline.data?.events.find((e) => e.n === cut) : undefined;
  const next = view.next ?? undefined;
  const verdict = runId && cut !== null && view.status === 'completed' ? verdictFor(label, next?.action) : undefined;
  const labelled = timeline.data?.labels ?? [];
  const runStatus: ChipStatus | undefined = runId ? (view.status === 'running' ? 'running' : view.outcome) : undefined;

  const openSource = useCallback((id: string) => {
    setActiveSource(id);
    setTab('sources');
    requestAnimationFrame(() => document.getElementById('case-tabs')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }, []);

  const selectRun = (id: string, cutBefore: number | null) => {
    setRunId(id);
    setSelectedCut(cutBefore);
  };

  const controls = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <SegmentedControl
        label="Agent"
        size="sm"
        value={agent}
        onChange={(v) => {
          setAgent(v);
          setRunId(null);
          autoPicked.current = false;
        }}
        options={AGENTS.map(({ value, label }) => ({ value, label }))}
      />
      <span className="min-w-0 flex-1 text-[12px] text-ink-2">
        {AGENTS.find((a) => a.value === agent)?.hint}
        {!modelAvailable && ' No model key is set, so it runs without the model.'}
      </span>
      <div className="flex flex-wrap gap-2">
        {walking ? (
          <Button size="sm" variant="danger" onClick={() => (stopWalk.current = true)}>
            Stop
          </Button>
        ) : (
          labelled.length > 0 && (
            <Button size="sm" icon="play" onClick={walkAll} disabled={starting}>
              Run all {labelled.length} decision points
            </Button>
          )
        )}
        <Button size="sm" variant="primary" icon="decide" onClick={() => start(null)} loading={starting && !walking} disabled={walking}>
          Decide now
        </Button>
      </div>
    </div>
  );

  const detail = (
    <div className="grid content-start gap-5 p-4 sm:p-6">
      <Link href="/inbox" className="-mb-2 text-[13px] font-semibold text-accent min-[860px]:hidden">
        ← All {vocabulary.cases.toLowerCase()}
      </Link>
      <CaseHeader c={c} status={runStatus} />
      {controls}
      <div id="case-tabs" className="scroll-mt-16">
        <Tabs
          label={`${vocabulary.case} views`}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'step', label: 'Decision points', count: labelled.length || undefined },
            { value: 'sources', label: 'Sources', count: c.sources.length },
            { value: 'trace', label: 'Run trace', count: view.steps.length || undefined },
          ]}
        >
          <TabPanel value="step" className="grid gap-5">
            {timeline.error ? (
              <ErrorState error={{ title: 'Couldn’t load the history', detail: timeline.error }} onRetry={timeline.reload} />
            ) : !timeline.data ? (
              <Skeleton lines={8} />
            ) : (
              <>
                <Scorecard
                  rows={[...labelled].sort((a, b) => a.cutBefore - b.cutBefore).map((l) => ({ label: l, run: runsByCut.get(l.cutBefore) }))}
                  selectedCut={cut}
                  busy={starting || walking}
                  onPick={(n) => {
                    const existing = runsByCut.get(n);
                    if (existing && existing.mode === mode) selectRun(existing.runId, n);
                    else void start(n);
                  }}
                />
                {runId && <CutComparison cutBefore={cut} asOf={selectedRun?.cut?.asOf ?? view.assessment?.asOf} next={next} running={view.status === 'running'} happened={happened} label={label} verdict={verdict} />}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-[15px] font-bold">History</h2>
                  <Switch label="Decide at any event" checked={anywhere} onCheckedChange={setAnywhere} />
                </div>
                <HistoryTimeline
                  events={timeline.data.events}
                  labels={labelled}
                  cutBefore={cut}
                  runsByCut={runsByCut}
                  busy={starting || walking}
                  anywhere={anywhere}
                  onDecide={(n) => {
                    const existing = runsByCut.get(n);
                    if (existing && existing.mode === mode) selectRun(existing.runId, n);
                    else void start(n);
                  }}
                />
                {timeline.data.ending && <EndingReveal ending={timeline.data.ending} />}
              </>
            )}
          </TabPanel>
          <TabPanel value="sources" className="grid gap-3">
            <ul className="flex flex-wrap gap-2" aria-label="Sources">
              {c.sources.map((s) => (
                <li key={s.id} className="min-w-0 max-w-full">
                  <SourceChip source={s} onOpen={setActiveSource} active={s.id === activeSource} cited={view.next?.citations.includes(s.id)} />
                </li>
              ))}
            </ul>
            <SourceViewer sources={c.sources} activeId={activeSource} highlight={view.next?.citations.includes(activeSource) ? { sourceId: activeSource } : undefined} />
          </TabPanel>
          <TabPanel value="trace" className="grid gap-4">
            {runId ? (
              <>
                <PipelineStrip view={view} />
                <RunTrace view={view} mode={status === 'open' && view.status === 'running' ? 'live' : 'replay'} />
                {selectedRun?.decision && (
                  <ul className="grid">
                    <AuditLogRow event={selectedRun.decision} />
                  </ul>
                )}
                {streamError && (
                  <p role="alert" className="rounded-ui border border-dashed border-bad/60 p-3 text-[13px] text-bad">
                    {streamError}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13.5px] text-ink-2">No run selected. Decide at a point in the history, or press Decide now.</p>
            )}
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );

  const aside = (
    <div className="grid content-start gap-5 p-4 sm:p-5">
      {runId ? (
        <>
          <DecisionPanel
            view={view}
            context={`${selectedRun?.agent === 'b' ? 'Agent B' : 'Agent A'} · ${cut === null ? 'on the full history so far' : `as of just before event ${cut}`}${selectedRun?.mode === 'rules' ? ' · without the model' : ''}`}
            onOpenHandover={() => document.getElementById('handover')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            onViewTrace={() => setTab('trace')}
          />
          {view.handover && (
            <div id="handover" className="scroll-mt-16">
              <HandoverCard key={runId} handover={view.handover} caseRef={ref} caseTitle={c.title} runId={runId} decision={selectedRun?.decision} onDecided={() => void runs.reload()} />
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
          <Eyebrow as="h2">Agent decision</Eyebrow>
          <p className="text-[13.5px] text-ink-2">The next step, why, what it doesn’t settle and anything refused appear here once the agent decides.</p>
        </div>
      )}
    </div>
  );

  return (
    <SourcesProvider sources={c.sources} open={openSource}>
      <Panes list={list} listOnMobile={false} detail={detail} aside={aside} />
    </SourcesProvider>
  );
}
