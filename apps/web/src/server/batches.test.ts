import { describe, expect, it } from 'vitest';
import type { EvalRow } from '@/lib/api-types';
import { readAnswerFile, score } from './batches';

const row = (kind: EvalRow['kind'], pass: boolean, prohibited = false): EvalRow => ({
  case: '001', cutBefore: 4, kind, action: 'x', decidedBy: 'playbook', pass, prohibited, accept: [], blocked: [], reason: '',
});

describe('score', () => {
  it('splits accepted and prohibited by cut kind', () => {
    const s = score([row('determined', true), row('determined', false, true), row('judgement', false)]);
    expect(s.all).toEqual({ n: 3, accepted: 1, prohibited: 1 });
    expect(s.determined).toEqual({ n: 2, accepted: 1, prohibited: 1 });
    expect(s.judgement).toEqual({ n: 1, accepted: 0, prohibited: 0 });
  });
});

describe('readAnswerFile', () => {
  it.each(['../.env', 'ANSWERS/1/../../.env', 'ANSWERS/x/ANSWER.md', 'data/public/README.md', '/etc/passwd'])('refuses %s', async (p) => {
    expect(await readAnswerFile(p)).toBeUndefined();
  });
});
