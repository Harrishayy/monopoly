import 'server-only';
import { randomUUID } from 'node:crypto';
import { RunEvent, type Autonomy, type Case, type TrackPack } from '@casework/core';
import { runCase, type EmitInput } from '@casework/core/agent';

export type RunSignal = { kind: 'event'; event: RunEvent } | { kind: 'end'; error?: string };

interface RunRecord {
  events: RunEvent[];
  listeners: Set<(s: RunSignal) => void>;
  done: boolean;
  error?: string;
}

// In-memory for now; swap for the SQLite event store (src/server/db.ts) so runs survive restarts.
const g = globalThis as unknown as { __caseworkRuns?: Map<string, RunRecord> };
const runs: Map<string, RunRecord> = (g.__caseworkRuns ??= new Map<string, RunRecord>());

export function startRun(c: Case, pack: TrackPack, autonomy: Autonomy): string {
  const runId = randomUUID();
  const rec: RunRecord = { events: [], listeners: new Set(), done: false };
  runs.set(runId, rec);
  let seq = 0;
  const emit = (e: EmitInput) => {
    const event = RunEvent.parse({ ...e, runId, seq: seq++, at: new Date().toISOString() });
    rec.events.push(event);
    rec.listeners.forEach((l) => l({ kind: 'event', event }));
  };
  runCase(c, pack, { runId, autonomy, emit })
    .catch((err: unknown) => {
      rec.error = err instanceof Error ? err.message : String(err);
    })
    .finally(() => {
      rec.done = true;
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
