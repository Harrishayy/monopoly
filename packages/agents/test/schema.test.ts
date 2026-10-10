import { describe, expect, it } from 'vitest';
import { outputFormat } from '../src/b/llm/client';
import { Critique, Decision, Situation } from '../src/b/types';
import { Judgement } from '../src/bench/judge';

describe('tool input schemas', () => {
  it.each([
    ['Decision', Decision],
    ['Situation', Situation],
    ['Critique', Critique],
    ['Judgement', Judgement],
  ] as const)('%s converts to a structured-output JSON schema', (_, schema) => {
    const f = outputFormat(schema);
    expect(f.type).toBe('json_schema');
    expect(f.schema.type).toBe('object');
    expect(f.schema.additionalProperties).toBe(false);
    expect((f.schema.required as string[]).length).toBeGreaterThan(2);
  });
  it('keeps handover optional on decisions', () => {
    const required = outputFormat(Decision).schema.required as string[];
    expect(required).not.toContain('handover');
    expect(required).toContain('boundaries');
  });
});
