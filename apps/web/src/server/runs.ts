import 'server-only';
import { randomUUID } from 'node:crypto';
import { RunEvent, runView, type Autonomy, type Case, type HumanDecision, type RunView, type TrackPack } from '@casework/core';
import { runCase, type EmitInput } from '@casework/core/agent';
import type { RunCut, RunMode, RunSummary } from '@/lib/api-types';

export type RunSignal = { kind: 'event'; event: RunEvent } | { kind: 'end'; error?: string };

export interface RunMeta {
  runId: string;
  caseRef: string;
  caseTitle: string;
  track: string;
  autonomy: Autonomy;
  mode: RunMode;
  cut?: RunCut;
  groupId?: string;
  startedAt: string;
}

interface RunRecord {
  meta: RunMeta;
  events: RunEvent[];
  view: RunView;
  listeners: Set<(s: RunSignal) => void>;
  done: Promise<void>;
  finished: boolean;
  error?: string;
  decision?: HumanDecision;
}

// In-memory for now; swap for the SQLite event store (src/server/db.ts) so runs survive restarts.
const g = globalThis as unknown as { __caseworkRuns?: Map<string, RunRecord> };
const runs: Map<string, RunRecord> = (g.__caseworkRuns ??= new Map<string, RunRecord>());

export interface StartRunOptions {
  autonomy: Autonomy;
  mode: RunMode;
  cut?: RunCut;
  groupId?: string;
  signal?: AbortSignal;
}

export function startRun(c: Case, pack: TrackPack, opts: StartRunOptions): string {
  const runId = randomUUID();
  const meta: RunMeta = {
    runId,
    caseRef: c.ref,
    caseTitle: c.title,
    track: pack.id,
    autonomy: opts.autonomy,
    mode: opts.mode,
    cut: opts.cut,
    groupId: opts.groupId,
    startedAt: new Date().toISOString(),
  };
  const rec = { meta, events: [], view: runView([]), listeners: new Set(), finished: false } as unknown as RunRecord;
  runs.set(runId, rec);
  let seq = 0;
  const emit = (e: EmitInput) => {
    const event = RunEvent.parse({ ...e, runId, seq: seq++, at: new Date().toISOString() });
    rec.events.push(event);
    rec.view = runView(rec.events);
    rec.listeners.forEach((l) => l({ kind: 'event', event }));
  };
  rec.done = runCase(c, pack, {
    runId,
    autonomy: opts.autonomy,
    emit,
    asOf: opts.cut?.asOf,
    signal: opts.signal,
    ...(opts.mode === 'rules' ? { model: null } : {}),
  })
    .then(() => undefined)
    .catch((err: unknown) => {
      rec.error = err instanceof Error ? err.message : String(err);
    })
    .finally(() => {
      rec.finished = true;
      rec.listeners.forEach((l) => l({ kind: 'end', error: rec.error }));
    });
  return runId;
}

export const getRun = (runId: string) => runs.get(runId);

export function subscribe(runId: string, fn: (s: RunSignal) => void) {
  const rec = runs.get(runId);
  rec?.listeners.add(fn);
  return () => rec?.listeners.delete(fn);
}

export function summariseRun(rec: RunRecord): RunSummary {
  const v = rec.view;
  const last = v.steps.at(-1);
  return {
    ...rec.meta,
    done: rec.finished,
    error: rec.error ?? null,
    status: v.status,
    outcome: v.outcome,
    mascot: v.mascot,
    steps: v.steps.length,
    lastStep: last ? { kind: last.kind, title: last.title } : undefined,
    next: v.next ? { action: v.next.action, recipient: v.next.recipient, confidence: v.next.confidence, decidedBy: v.next.decidedBy } : undefined,
    handover: v.handover,
    decision: rec.decision,
  };
}

/** Newest first. Filter by case, group, or only runs not part of a batch. */
export function listRuns(filter: { caseRef?: string; groupId?: string; standalone?: boolean } = {}): RunSummary[] {
  return [...runs.values()]
    .filter((r) => (!filter.caseRef || r.meta.caseRef === filter.caseRef) && (!filter.groupId || r.meta.groupId === filter.groupId) && (!filter.standalone || !r.meta.groupId))
    .sort((a, b) => b.meta.startedAt.localeCompare(a.meta.startedAt))
    .map(summariseRun);
}

export function allRunRecords() {
  return [...runs.values()];
}

/** Records the person's choice on a run's handover. Returns an error string when it can't. */
export function recordDecision(d: Omit<HumanDecision, 'at'>): HumanDecision | string {
  const rec = runs.get(d.runId);
  if (!rec) return `No run ${d.runId}`;
  if (rec.meta.caseRef !== d.caseRef) return `Run ${d.runId} is not for ${d.caseRef}`;
  const handover = rec.view.handover;
  if (!handover) return 'This run has no handover to decide on';
  if (!handover.options.some((o) => o.id === d.optionId)) return `Unknown option ${d.optionId}`;
  if (rec.decision) return 'Already decided';
  rec.decision = { ...d, at: new Date().toISOString() };
  return rec.decision;
}

/** Runs `fn` over items with at most `limit` in flight. Stops starting new work once `signal` aborts. */
export async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>, signal?: AbortSignal) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
      while (next < items.length && !signal?.aborted) {
        const i = next++;
        await fn(items[i]!, i);
      }
    }),
  );
}
