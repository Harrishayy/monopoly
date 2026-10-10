import type { EvalSuiteInput } from '@casework/evals';
import type { TrackId } from '@casework/core';
import { suite as property } from './property/evals';

export const EVAL_SUITES: Partial<Record<TrackId, EvalSuiteInput>> = { property };

/** Return a track's authored evaluation suite, or list the available suites in an error. */
export function getEvalSuite(track: string): EvalSuiteInput {
  const suite = Object.hasOwn(EVAL_SUITES, track) ? EVAL_SUITES[track as TrackId] : undefined;
  if (!suite) throw new Error(`No evaluation suite for track "${track}". Tracks with suites: ${Object.keys(EVAL_SUITES).join(', ')}`);
  return suite;
}
