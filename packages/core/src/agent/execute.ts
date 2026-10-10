import { randomUUID } from 'node:crypto';
import { renderAnswers } from '../answers/render';
import { runView, type RunView } from '../run/view';
import { RunEvent, type Autonomy, type Case, type Outcome } from '../schema';
import type { TrackPack } from '../track';
import { runCase, type EmitInput, type RunOptions } from './loop';

export type RunCaseFn = (c: Case, pack: TrackPack, opts: RunOptions) => Promise<Outcome>;

export interface ExecuteOptions {
  n: number;
  runId?: string;
  autonomy?: Autonomy;
  signal?: AbortSignal;
  runCaseImpl?: RunCaseFn;
  now?: () => Date;
}

export interface ExecuteResult {
  runId: string;
  events: RunEvent[];
  view: RunView;
  answer: string;
  reasoning: string;
  error?: string;
}

/** Execute one case, validate its trace and render answers while capturing runner errors. */
export async function executeCase(c: Case, pack: TrackPack, opts: ExecuteOptions): Promise<ExecuteResult> {
  const runId = opts.runId ?? randomUUID();
  const now = opts.now ?? (() => new Date());
  const events: RunEvent[] = [];
  let seq = 0;
  const emit = (e: EmitInput) => events.push(RunEvent.parse({ ...e, runId, seq: seq++, at: now().toISOString() }));
  let error: string | undefined;
  try {
    await (opts.runCaseImpl ?? runCase)(c, pack, { runId, autonomy: opts.autonomy ?? pack.autonomy, emit, signal: opts.signal });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const view = runView(events);
  const { answer, reasoning } = renderAnswers(view, c, opts.n);
  return { runId, events, view, answer: error ? `${answer}\n**Runner error**\n${error}\n` : answer, reasoning, error };
}
