'use client';

import { RUN_KIND_META } from '@casework/core';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { AnswerViewer } from '@/domain/reality';
import { filterByKind, RunKindBadge, RunKindFilter, type RunKindFilterValue } from '@/domain/run';
import { PageHeader, SectionHeader } from '@/layout';
import { useApi } from '@/lib/api';
import type { AgentDecision, AgentInfo, AgentRunView, AgentsOverview } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { Button, EmptyState, ErrorState, Eyebrow, Mono, ProgressBar, RelativeTime, SegmentedControl, Select, Skeleton, StatusChip, Surface } from '@/ui';

const BY_LABEL = { rules: 'Rules', model: 'Model', mixed: 'Rules + model' } as const;

/**
 * Internal page: how each agent works and how each did on the same labelled moments.
 * Reads only what the agents wrote to disk (and evals started from the Reality page).
 */
export function AgentsView() {
  const { data, error, loading, reload } = useApi<AgentsOverview>('/api/agents', {
    poll: (d) => !!d?.runs.some((r) => !r.complete),
    intervalMs: 5000,
  });
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow="Internal · for the team"
        title="Agents"
        description="Two agents were built for the same cases. This page shows how each one decides, and puts their eval results side by side on the same labelled moments."
        actions={
          <Button size="sm" icon="retry" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />
      {error && !data && <ErrorState error={{ title: "Couldn't read the agents' results", detail: error }} onRetry={() => void reload()} />}
      {loading && !data && <Skeleton variant="block" className="h-64" />}
      {data && (
        <>
          <section className="grid gap-4" aria-labelledby="h-how">
            <SectionHeader id="h-how" title="How each agent works" description="Stages in order. Rules are deterministic code; Model stages call Claude." />
            <div className="grid gap-4 min-[860px]:grid-cols-2">
              {data.agents.map((a) => (
                <AgentCard key={a.id} agent={a} latest={data.runs.find((r) => r.agent === a.id)} />
              ))}
            </div>
          </section>
          <HeadToHead data={data} onOpenAnswer={setAnswer} />
          <RunsSection runs={data.runs} refs={data.refs} onOpenAnswer={setAnswer} />
        </>
      )}
      <AnswerViewer path={answer} onClose={() => setAnswer(null)} />
    </div>
  );
}

// ---------------------------------------------------------------- how it works

function AgentCard({ agent, latest }: { agent: AgentInfo; latest?: AgentRunView }) {
  return (
    <Surface as="article" className="grid content-start gap-4">
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <AgentBadge id={agent.id} />
          <h3 className="text-lg font-bold">{agent.name}</h3>
        </div>
        <p className="text-[13.5px] text-ink-2">{agent.approach}</p>
      </div>
      <ol className="grid gap-0" aria-label={`${agent.name} stages`}>
        {agent.stages.map((s, i) => (
          <li key={s.name} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border-(length:--bw) font-mono text-[11px] font-semibold',
                  s.by === 'model' ? 'border-accent bg-accent text-accent-ink' : s.by === 'mixed' ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong bg-surface text-ink',
                )}
                aria-hidden
              >
                {i + 1}
              </span>
              {i < agent.stages.length - 1 && <span className="w-(--bw) flex-1 bg-line" aria-hidden />}
            </span>
            <div className="min-w-0 pb-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <b className="text-sm">{s.name}</b>
                <span className={cn('font-mono text-[10.5px] uppercase tracking-wider', s.by === 'rules' ? 'text-ink-2' : 'text-accent')}>{BY_LABEL[s.by]}</span>
              </div>
              <p className="text-[13px] text-ink-2">{s.does}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="grid gap-1 border-t-(length:--bw) border-dashed border-line pt-3 text-[12.5px] text-ink-2">
        <p>
          <b className="text-ink">Fallback.</b> {agent.fallback}
        </p>
        <p>
          <b className="text-ink">Code.</b> <Mono>{agent.code}</Mono>
        </p>
        <p>
          <b className="text-ink">Results from.</b> <Mono>{agent.outputs}</Mono>
        </p>
      </div>
      {latest ? (
        <div className="grid gap-2">
          <Eyebrow>
            Latest run · {RUN_KIND_META[latest.kind].label} · {latest.name ?? latest.label} · {latest.mode}
          </Eyebrow>
          <Metrics run={latest} />
        </div>
      ) : (
        <p className="text-[13px] text-ink-2">No results on disk yet.</p>
      )}
    </Surface>
  );
}

function AgentBadge({ id }: { id: AgentInfo['id'] }) {
  return (
    <span className={cn('grid size-6 shrink-0 place-items-center rounded-ui font-mono text-[12px] font-bold', id === 'a' ? 'bg-ink text-bg' : 'bg-accent text-accent-ink')} aria-label={`Agent ${id.toUpperCase()}`}>
      {id.toUpperCase()}
    </span>
  );
}

function Metrics({ run }: { run: AgentRunView }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {run.metrics.map((m) => (
        <div key={m.label} className="rounded-ui border-(length:--bw) border-line bg-surface-2/50 px-2.5 py-2" title={m.hint}>
          <dt className="text-[11.5px] text-ink-2">{m.label}</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">{m.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- head to head

type Filter = 'all' | 'disagree' | 'a_only' | 'b_only' | 'both_wrong';

/** Scored by the cut's accepted list when the run has one (shared bench), else by agent B's judge. */
const bRight = (d?: AgentDecision) => (d?.accepted !== undefined ? d.accepted : d?.judge ? d.judge.actionMatch === 'same' || d.judge.actionMatch === 'acceptable_alternative' : undefined);

function HeadToHead({ data, onOpenAnswer }: { data: AgentsOverview; onOpenAnswer: (p: string) => void }) {
  const aRuns = data.runs.filter((r) => r.agent === 'a' && r.set.endsWith('cuts') && r.decisions.length);
  const bRuns = data.runs.filter((r) => r.agent === 'b' && r.set.includes('cuts') && r.decisions.length);
  // Default to the largest model run of A, and the B run with the most decisions.
  const pickA = [...aRuns].sort((x, y) => Number(y.mode.startsWith('model')) - Number(x.mode.startsWith('model')) || y.decisions.length - x.decisions.length)[0];
  const pickB = [...bRuns].sort((x, y) => y.decisions.length - x.decisions.length)[0];
  const [aId, setA] = useState<string | undefined>();
  const [bId, setB] = useState<string | undefined>();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const a = aRuns.find((r) => r.id === aId) ?? pickA;
  const b = bRuns.find((r) => r.id === bId) ?? pickB;

  const rows = useMemo(() => {
    if (!a || !b) return [];
    const bByKey = new Map(b.decisions.map((d) => [d.key, d]));
    return a.decisions.filter((d) => bByKey.has(d.key)).map((d) => ({ key: d.key, a: d, b: bByKey.get(d.key)! }));
  }, [a, b]);

  const counts = useMemo(() => {
    const c = { both: 0, a_only: 0, b_only: 0, both_wrong: 0, unjudged: 0 };
    for (const r of rows) {
      const br = bRight(r.b);
      if (br === undefined) c.unjudged++;
      else if (r.a.accepted && br) c.both++;
      else if (r.a.accepted) c.a_only++;
      else if (br) c.b_only++;
      else c.both_wrong++;
    }
    return c;
  }, [rows]);

  const shown = rows.filter((r) => {
    const br = bRight(r.b);
    if (filter === 'all') return true;
    if (br === undefined) return false;
    if (filter === 'disagree') return !!r.a.accepted !== br;
    if (filter === 'a_only') return r.a.accepted && !br;
    if (filter === 'b_only') return !r.a.accepted && br;
    return !r.a.accepted && !br;
  });

  return (
    <section className="grid gap-4" aria-labelledby="h-h2h">
      <SectionHeader
        id="h-h2h"
        title="Head to head on labelled moments"
        description="The same cut points in the example histories. Agent A is right when its action is in the cut's accepted list. Agent B uses its own action words, so it is scored by its judge, which compares it with what the team actually did next."
      />
      {!aRuns.length || !bRuns.length ? (
        <EmptyState
          title="Need a cuts run from each agent"
          body={
            <>
              Agent A: <Mono>pnpm eval</Mono> or <b>Run eval</b> on the Reality page. Agent B: its eval with <Mono>--set property-cuts</Mono>. Runs appear here as they write results.
            </>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Agent A run" value={a!.id} onChange={setA} options={aRuns.map((r) => ({ value: r.id, label: `${RUN_KIND_META[r.kind].label} · ${r.name ?? r.label} · ${r.mode} · ${r.decisions.length} cuts` }))} />
            <Select label="Agent B run" value={b!.id} onChange={setB} options={bRuns.map((r) => ({ value: r.id, label: `${RUN_KIND_META[r.kind].label} · ${r.name ?? r.label} · ${r.mode} · ${r.decisions.length} cuts${r.complete ? '' : ' (running)'}` }))} />
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Agreement">
            {(
              [
                ['Both right', counts.both, 'ok'],
                ['Only A right', counts.a_only, 'info'],
                ['Only B right', counts.b_only, 'info'],
                ['Both wrong', counts.both_wrong, 'bad'],
                ['B not judged yet', counts.unjudged, 'neutral'],
              ] as const
            ).map(([label, n, tone]) => (
              <div key={label} className={cn('rounded-ui border-(length:--bw) border-line bg-surface px-3 py-2', `s-${tone === 'ok' ? 'resolved' : tone === 'bad' ? 'failed' : tone === 'info' ? 'needs_info' : 'blocked'}`)}>
                <dt className="flex items-center gap-1.5 text-[12px] text-ink-2">
                  <span className="size-2 rounded-full bg-(--c)" aria-hidden />
                  {label}
                </dt>
                <dd className="font-mono text-xl font-semibold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              label="Show"
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All ${rows.length}` },
                { value: 'disagree', label: 'Disagree' },
                { value: 'a_only', label: 'Only A' },
                { value: 'b_only', label: 'Only B' },
                { value: 'both_wrong', label: 'Both wrong' },
              ]}
            />
            <span className="text-[12.5px] text-ink-2">{shown.length} shown</span>
          </div>
          <div className="relative min-w-0 overflow-x-auto rounded-ui-lg border-(length:--bw) border-line bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead className="border-b-(length:--bw) border-line text-[11.5px] text-ink-2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Moment</th>
                  <th className="px-3 py-2 font-semibold">Accepted (labels)</th>
                  <th className="px-3 py-2 font-semibold">Agent A chose</th>
                  <th className="px-3 py-2 font-semibold">Agent B chose</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const isOpen = open === r.key;
                  return (
                    <Fragment key={r.key}>
                      <tr className="border-b-(length:--bw) border-line align-top last:border-b-0">
                        <td className="px-3 py-2">
                          <CutLink d={r.a} refs={data.refs} />
                          <div className="text-[11.5px] text-ink-2">{r.a.kind}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Mono muted className="text-[12px]">
                            {(r.a.accept ?? []).join(' · ') || '–'}
                          </Mono>
                        </td>
                        <td className="px-3 py-2">
                          <div className="grid gap-1">
                            <Mono className="text-[12px]">{r.a.action}</Mono>
                            <AVerdict d={r.a} />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="grid gap-1">
                            <span className="text-[12.5px]">
                              <Mono className="text-[12px]">{r.b.action}</Mono>
                              {r.b.recipient && <span className="text-ink-2"> → {r.b.recipient.split(/[(,]/)[0]!.trim()}</span>}
                            </span>
                            {r.b.accepted !== undefined ? <AVerdict d={r.b} /> : <BVerdict d={r.b} />}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="ghost" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.key)}>
                            {isOpen ? 'Hide' : 'Why'}
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b-(length:--bw) border-line bg-surface-2/40">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="grid gap-4 min-[860px]:grid-cols-2">
                              <Reasoning title="Agent A" d={r.a} onOpenAnswer={onOpenAnswer} />
                              <Reasoning title="Agent B" d={r.b} onOpenAnswer={onOpenAnswer} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CutLink({ d, refs }: { d: AgentDecision; refs: Record<string, string> }) {
  const ref = d.case ? refs[d.case] : undefined;
  if (!ref || d.cutBefore === undefined) return <Mono className="text-[12px]">{d.key}</Mono>;
  return (
    <Link href={`/cases/${encodeURIComponent(ref)}?cut=${d.cutBefore}`} className="font-mono text-[12px] font-semibold text-accent underline-offset-2 hover:underline">
      {ref} · before event {d.cutBefore}
    </Link>
  );
}

function AVerdict({ d }: { d: AgentDecision }) {
  if (d.accepted === undefined) return null;
  return d.prohibited ? (
    <StatusChip status="failed" size="sm" label="Prohibited" />
  ) : d.accepted ? (
    <StatusChip status="resolved" size="sm" label="Accepted" />
  ) : (
    <StatusChip status="blocked" size="sm" label="Missed" />
  );
}

function BVerdict({ d }: { d: AgentDecision }) {
  if (!d.judge) return <StatusChip status="new" size="sm" label="Not judged yet" />;
  const ok = bRight(d);
  const label = `${d.judge.actionMatch.replace(/_/g, ' ')} · ${d.judge.score.toFixed(2)}`;
  return <StatusChip status={d.judge.prohibited ? 'failed' : ok ? 'resolved' : 'blocked'} size="sm" label={d.judge.prohibited ? `Prohibited · ${d.judge.score.toFixed(2)}` : label} />;
}

function Reasoning({ title, d, onOpenAnswer }: { title: string; d: AgentDecision; onOpenAnswer: (p: string) => void }) {
  return (
    <div className="grid content-start gap-2 text-[13px]">
      <Eyebrow>{title}</Eyebrow>
      {d.actionLabel && <p className="font-semibold">{d.actionLabel}</p>}
      <p className="text-ink-2">
        {[d.recipient && `To ${d.recipient}`, d.channel, d.decidedBy && `decided by ${d.decidedBy}`, d.confidence !== undefined && `confidence ${d.confidence.toFixed(2)}`, d.ms !== undefined && `${Math.round(d.ms / 1000)}s`, d.modelCalls && `${d.modelCalls} model calls`]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {d.reason && <p className="whitespace-pre-line">{d.reason}</p>}
      {d.message && (
        <details className="rounded-ui border-(length:--bw) border-line bg-surface p-2">
          <summary className="cursor-pointer text-[12.5px] font-semibold">Drafted message</summary>
          <p className="mt-2 whitespace-pre-line text-[12.5px]">{d.message}</p>
        </details>
      )}
      {d.judge && (
        <p className="rounded-ui bg-accent-soft px-2 py-1.5 text-[12.5px]">
          <b>Judge:</b> {d.judge.note}
          {d.judge.missedEscalation && ' · missed an escalation'}
          {d.judge.unnecessaryEscalation && ' · escalated needlessly'}
        </p>
      )}
      {d.error && <p className="text-bad">{d.error}</p>}
      <div className="flex flex-wrap gap-2">
        {d.answerPath && (
          <>
            <Button size="sm" onClick={() => onOpenAnswer(`${d.answerPath}/ANSWER.md`)}>
              ANSWER.md
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenAnswer(`${d.answerPath}/REASONING.md`)}>
              REASONING.md
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- all runs

function RunsSection({ runs, refs, onOpenAnswer }: { runs: AgentRunView[]; refs: Record<string, string>; onOpenAnswer: (p: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [kind, setKind] = useState<RunKindFilterValue>('all');
  const shown = filterByKind(runs, kind);
  const run = shown.find((r) => r.id === selected);
  return (
    <section className="grid gap-4" aria-labelledby="h-runs">
      <SectionHeader id="h-runs" title="Every run on disk" description="Newest first, split by what each run was for. Give a run its type with --kind and --name. Runs still writing refresh every few seconds." />
      {runs.length > 0 && <RunKindFilter runs={runs} value={kind} onChange={setKind} />}
      {!runs.length ? (
        <EmptyState title="No eval runs yet" body="Run an eval for either agent; its results appear here as they are written." />
      ) : (
        <ul className="grid gap-2">
          {shown.map((r) => (
            <li key={r.id}>
              <Surface padded={false} selected={r.id === selected} className="grid gap-3 p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <AgentBadge id={r.agent} />
                  <RunKindBadge tag={r} />
                  <b className="font-mono text-[13px] [overflow-wrap:anywhere]">{r.label}</b>
                  <span className="text-[12.5px] text-ink-2">
                    {r.mode} · {r.set}
                  </span>
                  <StatusChip status={r.complete ? 'resolved' : 'running'} size="sm" label={r.complete ? 'Complete' : 'Writing'} />
                  {r.updatedAt && <RelativeTime at={r.updatedAt} className="text-[12px] text-ink-2" />}
                  <Button size="sm" variant={r.id === selected ? 'secondary' : 'ghost'} className="ml-auto" aria-expanded={r.id === selected} onClick={() => setSelected(r.id === selected ? null : r.id)}>
                    {r.id === selected ? 'Close' : `${r.decisions.length} decisions`}
                  </Button>
                </div>
                {!r.complete && r.total ? <ProgressBar value={r.decisions.length} max={r.total} label={`${r.label} progress`} /> : null}
                <Metrics run={r} />
              </Surface>
            </li>
          ))}
        </ul>
      )}
      {run && (
        <div className="relative min-w-0 overflow-x-auto rounded-ui-lg border-(length:--bw) border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <caption className="px-3 py-2 text-left text-[12.5px] text-ink-2">
              Decisions in {run.label}
            </caption>
            <thead className="border-b-(length:--bw) border-line text-[11.5px] text-ink-2">
              <tr>
                <th className="px-3 py-2 font-semibold">Case</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Decided by</th>
                <th className="px-3 py-2 font-semibold">Result</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {run.decisions.map((d) => (
                <Fragment key={d.key}>
                  <tr className="border-b-(length:--bw) border-line align-top">
                    <td className="px-3 py-2">
                      <CutLink d={d} refs={refs} />
                    </td>
                    <td className="px-3 py-2">
                      <Mono className="text-[12px]">{d.action}</Mono>
                      {d.recipient && <span className="text-[12.5px] text-ink-2"> → {d.recipient.split(/[(,]/)[0]!.trim()}</span>}
                    </td>
                    <td className="px-3 py-2 text-[12.5px] text-ink-2">{d.decidedBy ?? '–'}</td>
                    <td className="px-3 py-2">{d.accepted !== undefined ? <AVerdict d={d} /> : <BVerdict d={d} />}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" aria-expanded={open === d.key} onClick={() => setOpen(open === d.key ? null : d.key)}>
                        {open === d.key ? 'Hide' : 'Why'}
                      </Button>
                    </td>
                  </tr>
                  {open === d.key && (
                    <tr className="border-b-(length:--bw) border-line bg-surface-2/40">
                      <td colSpan={5} className="px-3 py-3">
                        <Reasoning title={run.agent === 'a' ? 'Agent A' : 'Agent B'} d={d} onOpenAnswer={onOpenAnswer} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
