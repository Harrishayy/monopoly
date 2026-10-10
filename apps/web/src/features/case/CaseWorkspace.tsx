'use client';

import type { Autonomy, Case, RunEvent, Vocabulary } from '@casework/core';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaseHeader, SourceChip, SourcesProvider, SourceViewer } from '@/domain/case';
import { HandoverCard } from '@/domain/handover';
import { Mascot } from '@/domain/mascot';
import { AssessmentPanel, AuditLogRow, DecisionPanel, PipelineStrip, RunTrace } from '@/domain/run';
import { CutComparison, EndingReveal, HistoryTimeline, Scorecard, verdictFor } from '@/domain/timeline';
import { Panes } from '@/layout';
import { api, useApi } from '@/lib/api';
import type { CaseTimeline, RunMode, RunSummary, ToolRegistry } from '@/lib/api-types';
import { useRunStream } from '@/lib/sse';
import { useUi } from '@/state/ui';
import { Button, Eyebrow, SegmentedControl, Skeleton, ErrorState, TabPanel, Tabs, toast, type ChipStatus } from '@/ui';

type Tab = 'step' | 'sources' | 'trace';

const AUTONOMY: { value: Autonomy; label: string; hint: string }[] = [
  { value: 'suggest', label: 'Suggest', hint: 'The agent only proposes; every action waits for a person.' },
  { value: 'ask_first', label: 'Ask first', hint: 'Safe, reversible steps go ahead; anything else asks first.' },
  { value: 'autonomous', label: 'Autonomous', hint: 'Acts within policy limits; the guard still refuses barred actions.' },
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
  const [modeChoice, setMode] = useState<RunMode | null>(null);
  const { autonomy, setAutonomy } = useUi();

  const { data: registry } = useApi<ToolRegistry>('/api/tools');
  const modelAvailable = !!registry?.model.configured;
  const mode: RunMode = modelChoiceOr(modeChoice, modelAvailable);

  const timeline = useApi<CaseTimeline>(`/api/cases/${encodeURIComponent(ref)}/timeline`);
  const runs = useApi<RunSummary[]>(`/api/runs?case=${encodeURIComponent(ref)}`, {
    poll: (d) => walking || !!d?.some((r) => !r.done),
    intervalMs: 1200,
  });

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
    const linked = initialRun ? runs.data.find((r) => r.runId === initialRun) : undefined;
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
  }, [runs.data, runId, initialRun, initialCut]);

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
        const { runId: id } = await api<{ runId: string }>('/api/runs', { method: 'POST', json: { caseRef: ref, cutBefore: cutBefore ?? undefined, mode, autonomy } });
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
    [ref, mode, autonomy, runs],
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
    toast.success('Step-through finished', { description: `${labels.length} labelled points decided` });
  }

  // Latest run per cut point for this case.
  const runsByCut = useMemo(() => {
    const m = new Map<number, RunSummary>();
    for (const r of runs.data ?? []) if (r.cut && !m.has(r.cut.cutBefore)) m.set(r.cut.cutBefore, r);
    return m;
  }, [runs.data]);
  const selectedRun = runs.data?.find((r) => r.runId === runId);
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
    <div className="grid gap-3 rounded-ui-lg border-(length:--bw) border-line bg-surface-2/40 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Eyebrow>Decide with</Eyebrow>
          <SegmentedControl
            label="Decide with"
            size="sm"
            value={mode}
            onChange={setMode}
            options={modelAvailable ? [{ value: 'model', label: 'Model' }, { value: 'rules', label: 'Rules only' }] : [{ value: 'rules', label: 'Rules only' }]}
          />
        </div>
        <div className="grid gap-1">
          <Eyebrow>Autonomy</Eyebrow>
          <SegmentedControl label="Autonomy" size="sm" value={autonomy} onChange={setAutonomy} options={AUTONOMY.map(({ value, label }) => ({ value, label }))} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {walking ? (
            <Button size="sm" variant="danger" onClick={() => (stopWalk.current = true)}>
              Stop step-through
            </Button>
          ) : (
            labelled.length > 0 && (
              <Button size="sm" icon="play" onClick={walkAll} disabled={starting}>
                Step through {labelled.length} labelled points
              </Button>
            )
          )}
          <Button size="sm" variant="primary" icon="decide" onClick={() => start(null)} loading={starting && !walking} disabled={walking}>
            Decide now
          </Button>
        </div>
      </div>
      <p className="text-[12px] text-ink-2">
        {AUTONOMY.find((a) => a.value === autonomy)?.hint}{' '}
        {mode === 'rules' ? 'Rules only runs the pack’s deterministic playbook: instant and free.' : `The model decides (${registry?.model.decide}); the playbook takes over if it fails.`}
      </p>
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
            { value: 'step', label: 'Step through', count: labelled.length || undefined },
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
                {runId ? (
                  <CutComparison cutBefore={cut} asOf={selectedRun?.cut?.asOf ?? view.assessment?.asOf} next={next} running={view.status === 'running'} happened={happened} label={label} verdict={verdict} />
                ) : (
                  <div className="grid justify-items-start gap-2 rounded-ui-lg border-(length:--bw) border-dashed border-line p-4 text-[13.5px] text-ink-2">
                    <b className="text-ink">Pick a point in the history</b>
                    Choose “Decide here” between any two events. The agent sees only what came before, decides the next step, and you see it next to what really happened.
                  </div>
                )}
                {labelled.length > 0 && <Scorecard rows={[...labelled].sort((a, b) => a.cutBefore - b.cutBefore).map((l) => ({ label: l, run: runsByCut.get(l.cutBefore) }))} selectedRunId={runId} onSelect={selectRun} />}
                <HistoryTimeline
                  events={timeline.data.events}
                  labels={labelled}
                  cutBefore={cut}
                  runsByCut={runsByCut}
                  busy={starting || walking}
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
            animateIn={animateIn}
            context={cut === null ? 'On the full history so far' : `As of just before event ${cut}${selectedRun ? ` · ${selectedRun.mode === 'rules' ? 'rules only' : 'model'}` : ''}`}
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

function modelChoiceOr(choice: RunMode | null, modelAvailable: boolean): RunMode {
  if (choice === 'model' && !modelAvailable) return 'rules';
  return choice ?? (modelAvailable ? 'model' : 'rules');
}
