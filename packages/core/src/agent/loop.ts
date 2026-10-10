import type { Autonomy, Case, Outcome, RunEvent } from '../schema';
import type { TrackPack } from '../track';

/** Events without the fields the emitter fills in. */
export type EmitInput = RunEvent extends infer E
  ? E extends RunEvent
    ? Omit<E, 'runId' | 'seq' | 'at'>
    : never
  : never;

export interface RunOptions {
  runId: string;
  autonomy: Autonomy;
  emit: (event: EmitInput) => void;
  signal?: AbortSignal;
  maxTurns?: number;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet. See docs/plan/03-architecture.md`);
  }
}

/**
 * Runs one case end to end. Contract:
 * 1. emit run.started
 * 2. triage sources with MODEL_FAST → step.read
 * 3. tool-use loop with MODEL_DECIDE (max `maxTurns`, default 12). Every call goes through
 *    guard() then withRetry(); errors are returned to the model as tool_result with is_error.
 * 4. decide → decision.made; if escalating, buildHandover → escalation.created
 * 5. emit run.completed. Never throws: unexpected errors end in an escalation with context.
 *
 * Use the claude-api skill when implementing. Prompt order for caching:
 * system → tool definitions → track policy → case sources.
 */
export async function runCase(_c: Case, _pack: TrackPack, _opts: RunOptions): Promise<Outcome> {
  throw new NotImplementedError('runCase');
}
