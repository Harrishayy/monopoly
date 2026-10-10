import { describe, expect, it } from 'vitest';
import { guessRunKind } from './run-kind';

describe('guessRunKind', () => {
  it('reads the kind from existing run folder names', () => {
    expect(guessRunKind('eval-haiku-smoke')).toBe('smoke');
    expect(guessRunKind('smoke')).toBe('smoke');
    expect(guessRunKind('eval-debug')).toBe('smoke');
    expect(guessRunKind('holdout-haiku')).toBe('test');
    expect(guessRunKind('test-a-rules')).toBe('test');
    expect(guessRunKind('val-ab-2026-10-10-10-57')).toBe('val');
    expect(guessRunKind('dev-b')).toBe('train');
    expect(guessRunKind('eval-haiku2')).toBe('full');
    expect(guessRunKind('ANSWERS')).toBe('reality');
    expect(guessRunKind('practice')).toBe('practice');
    expect(guessRunKind('property-cuts')).toBe('adhoc');
  });
});
