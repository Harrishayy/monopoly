'use client';

import type { CaseSummary } from '@casework/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RUN_KIND_META } from '@casework/core';
import { AnswerViewer, BatchRunControl, EvalScoreboard, RealityCaseRow, RealityMeter, type BatchStart } from '@/domain/reality';
import { filterByKind, RunKindBadge, RunKindFilter, RunTagFields, type RunKindFilterValue } from '@/domain/run';
import { PageHeader, SectionHeader } from '@/layout';
import { api, useApi } from '@/lib/api';
import type { BatchView, EvalView, RunMode, RunTag, ToolRegistry } from '@/lib/api-types';
import { Button, Dialog, EmptyState, ErrorState, Eyebrow, RelativeTime, Select, Skeleton, Surface, TabPanel, Tabs, toast } from '@/ui';

type Tab = 'eval' | 'reality';

/** Eval on the labelled examples, and Reality Test batches (run here or written by the CLI). */
export function RealityView() {
  const [tab, setTab] = useState<Tab>('eval');
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow="Testing and review"
        title="Reality Test"
        description="Score the agent on labelled points in the example histories, then run unseen cases unattended. Everything here reuses the same agent the CLI runs."
      />
      <Tabs
        label="Testing views"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'eval', label: 'Eval on examples' },
          { value: 'reality', label: 'Reality Test' },
        ]}
      >
        <TabPanel value="eval">
          <EvalPanel />
        </TabPanel>
        <TabPanel value="reality">
          <BatchPanel />
        </TabPanel>
      </Tabs>
    </div>
  );
}

function useRefPrefix() {
  const { data } = useApi<CaseSummary[]>('/api/cases');
  return data?.[0]?.ref.split('-').slice(0, -1).join('-') ?? '';
}

function EvalPanel() {
  const refPrefix = useRefPrefix();
  const { data: tools } = useApi<ToolRegistry>('/api/tools');
  const { data: evals, error, loading, reload } = useApi<EvalView[]>('/api/eval', { poll: (d) => !!d?.some((e) => !e.done), intervalMs: 1000 });
  const [selected, setSelected] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tag, setTag] = useState<RunTag>({ kind: 'full' });
  const [kind, setKind] = useState<RunKindFilterValue>('all');
  const listed = filterByKind(evals ?? [], kind);
  const view = listed.find((e) => e.id === selected) ?? listed[0];

  async function start(mode: RunMode) {
    setStarting(true);
    try {
      const { evalId } = await api<{ evalId: string }>('/api/eval', { method: 'POST', json: { mode, tag } });
      setSelected(evalId);
      await reload();
    } catch (e) {
      toast.error('Could not start the eval', { description: (e as Error).message });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Surface className="grid gap-3">
        <SectionHeader
          level={3}
          title="How the eval works"
          description="Each labelled cut hides every event from a point in an example history onwards and asks the agent what to do next. Its action is compared with what the agency accepted there, and with actions that would have been wrong."
          actions={
            <>
              <Button variant="primary" icon="play" loading={starting} onClick={() => start('rules')}>
                Run eval · rules only
              </Button>
              <Button onClick={() => setConfirm(true)} disabled={!tools?.model.configured}>
                Run with the model…
              </Button>
            </>
          }
        />
        <RunTagFields value={tag} onChange={setTag} kinds={['smoke', 'full', 'train', 'val', 'test', 'adhoc']} />
        {evals && evals.length > 1 && <RunKindFilter runs={evals} value={kind} onChange={setKind} />}
        {listed.length > 1 && (
          <Select
            label="Result set"
            className="max-w-md"
            value={view?.id ?? ''}
            onChange={setSelected}
            options={listed.map((e) => ({
              value: e.id,
              label: `${RUN_KIND_META[e.kind].label}${e.name ? ` · ${e.name}` : ''} · ${e.source === 'cli' ? 'pnpm eval' : 'This session'} · ${e.mode}${e.done ? '' : ' · running'}${e.startedAt ? ` · ${new Date(e.startedAt).toLocaleString('en-GB')}` : ''}`,
            }))}
          />
        )}
      </Surface>
      {loading && <Skeleton variant="block" />}
      {error && <ErrorState error={{ title: 'Couldn’t load eval results', detail: error }} onRetry={reload} />}
      {evals && !view && (
        <EmptyState
          title="No eval results yet"
          body={<>Run the rules-only eval above (free, takes seconds), or run <code className="font-mono">pnpm eval</code> in the terminal.</>}
        />
      )}
      {view && (
        <div className="grid gap-2">
          <RunKindBadge tag={view} />
          <Eyebrow>
            {view.source === 'cli' ? 'Last pnpm eval' : 'Started here'} · {view.mode}
            {view.startedAt && (
              <>
                {' · '}
                <RelativeTime at={view.startedAt} />
              </>
            )}
            {!view.done && ` · ${view.rows.length}/${view.total} scored`}
          </Eyebrow>
          <EvalScoreboard view={view} refPrefix={refPrefix} />
        </div>
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Run the eval with the model?"
        description={`This makes model calls for every labelled cut (${view?.total ?? 'about 250'} cuts). It costs money and takes several minutes.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirm(false);
                void start('model');
              }}
            >
              Run every cut with the model
            </Button>
          </>
        }
      />
    </div>
  );
}

function BatchPanel() {
  const router = useRouter();
  const { data: tools } = useApi<ToolRegistry>('/api/tools');
  const { data, error, loading, reload } = useApi<{ batches: BatchView[]; inputs: string[] }>('/api/reality', {
    poll: (d) => !!d?.batches.some((b) => b.state !== 'done'),
    intervalMs: 1000,
  });
  const [starting, setStarting] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [kind, setKind] = useState<RunKindFilterValue>('all');
  const live = data?.batches.find((b) => b.source === 'ui');
  const batches = filterByKind(data?.batches ?? [], kind);

  async function start(b: BatchStart) {
    setStarting(true);
    try {
      await api('/api/reality', { method: 'POST', json: b });
      await reload();
    } catch (e) {
      toast.error('Could not start the batch', { description: (e as Error).message });
    } finally {
      setStarting(false);
    }
  }
  async function cancel() {
    if (!live) return;
    await api(`/api/reality/${live.id}`, { method: 'DELETE' }).catch((e: Error) => toast.error('Could not cancel', { description: e.message }));
    await reload();
  }

  if (loading) return <Skeleton variant="block" />;
  if (error) return <ErrorState error={{ title: 'Couldn’t load batches', detail: error }} onRetry={reload} />;
  return (
    <div className="grid gap-5">
      <Surface className="grid gap-4">
        <SectionHeader level={3} title="Run a folder of cases" description="Every case runs unattended, the way the Reality Test is judged. Escalating can be the right answer." />
        <BatchRunControl batch={live} inputs={data?.inputs ?? []} onStart={start} onCancel={cancel} starting={starting} modelConfigured={tools?.model.configured} />
      </Surface>
      {data?.batches.length === 0 && (
        <EmptyState
          title="No batches yet"
          body={<>Run one above, or run <code className="font-mono">pnpm reality</code> and its ANSWERS/ folder appears here.</>}
        />
      )}
      {!!data?.batches.length && <RunKindFilter runs={data.batches} value={kind} onChange={setKind} />}
      {batches.map((b) => (
        <Surface key={b.id} as="section" className="grid gap-4" aria-label={`Batch ${b.dir}`}>
          <RunKindBadge tag={b} />
          <SectionHeader
            level={3}
            title={b.source === 'cli' ? `${b.dir}/ (written by the CLI)` : `${b.dir} · ${b.mode}`}
            description={b.source === 'cli' ? 'Generated files, never hand-edited. Open each answer, its reasoning and its trace.' : b.startedAt ? `Started ${new Date(b.startedAt).toLocaleTimeString('en-GB')} · ${b.state}` : undefined}
          />
          <RealityMeter
            cases={b.cases}
            label={`Results for ${b.dir}`}
            onOpen={(c) => (c.answerPath ? setViewing(`${c.answerPath}/ANSWER.md`) : router.push(`/cases/${encodeURIComponent(c.ref)}${c.runId ? `?run=${c.runId}` : ''}`))}
          />
          <details>
            <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">Every case ({b.cases.length})</summary>
            <ul className="mt-2">
              {b.cases.map((c) => (
                <RealityCaseRow key={`${c.ref}-${c.n}`} result={c} onView={setViewing} />
              ))}
            </ul>
          </details>
        </Surface>
      ))}
      <AnswerViewer path={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
