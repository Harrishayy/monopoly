import { describe, expect, it } from 'vitest';
import type { EvalSuite, EvalSuiteInput, SuiteName } from '../schema';
import { fixtureSuite } from '../testing/fixtures';
import { expandScenarios, loadSuite, rubricVersion, selectScenarios } from './index';

function fresh(): EvalSuite {
  return loadSuite(structuredClone(fixtureSuite));
}

const firstId = fixtureSuite.scenarios[0]!.id;
const secondId = fixtureSuite.scenarios[1]!.id;

describe('loadSuite', () => {
  it('parses authored input and fills defaults', () => {
    const suite = fresh();
    expect(suite.scenarios[1]!.attachments).toEqual({ include: [], exclude: [] });
    expect(suite.scenarios[1]!.expected.acceptable).toEqual([]);
    expect(suite.perturbations[0]!.rubric).toEqual([]);
    expect(suite.actionMap[1]!.textPaths).toEqual([]);
  });

  it('reports every zod issue with readable nested paths', () => {
    const input = structuredClone(fixtureSuite);
    input.scenarios[0]!.cutAfter = 'bad';
    input.scenarios[0]!.rubric[1]!.kind = 'invalid' as EvalSuiteInput['scenarios'][number]['rubric'][number]['kind'];
    let message = '';
    try { loadSuite(input); } catch (error) { message = (error as Error).message; }
    expect(message).toMatch(/scenarios\[0\]\.cutAfter: /);
    expect(message).toMatch(/scenarios\[0\]\.rubric\[1\]\.kind: Invalid option/);
    expect(message.split('\n')).toHaveLength(3);
  });
});

describe('expandScenarios', () => {
  it('merges overrides, drops, additions and unique tags in authored group order', () => {
    const suite = fresh();
    const base = suite.scenarios[0]!;
    base.faults = [{ tool: 'desk.message', kind: 'error', attempts: [1] }];
    const p = suite.perturbations[0]!;
    p.appliesTo = [secondId, firstId];
    p.expected = { summary: 'Wait for the approver to confirm the updated request.', decision: 'wait', acceptable: [] };
    p.dropRubric = ['cite-note'];
    p.rubric = [{ ...base.rubric[1]!, text: 'Explain the updated request using the newly supplied details.' }];
    p.hiddenFacts = [{ text: 'A later reply changes the job scope.', marker: 'later secret detail' }];
    p.faults = [{ tool: 'spend.approve', kind: 'timeout', attempts: [2] }];
    p.tags = ['scope', 'changed', 'perturbed', 'changed'];
    p.planted = 'A fictional instruction in the supplied document.';
    suite.perturbations.push({ ...structuredClone(p), id: 'second-update', appliesTo: [firstId], expected: undefined });
    suite.escalationTwins.push({ scenario: secondId });
    const before = structuredClone(suite);
    const all = expandScenarios(suite);
    expect(all.map(({ id }) => id)).toEqual([
      firstId, secondId, `${secondId}~scope-update`, `${firstId}~scope-update`,
      `${firstId}~second-update`, `${firstId}#esc`, `${secondId}#esc`,
    ]);
    expect(all[0]).toEqual({ id: firstId, baseId: firstId, variant: 'base', spec: base, edits: [] });
    const variant = all[3]!;
    expect(variant).toMatchObject({
      id: `${firstId}~scope-update`, baseId: firstId, variant: 'perturbed',
      perturbationId: p.id, edits: p.edits, planted: p.planted,
    });
    expect(variant.spec).toEqual({
      ...base, id: variant.id, title: `${base.title} · ${p.title}`, expected: p.expected,
      rubric: [base.rubric[0], base.rubric[2], base.rubric[3], p.rubric[0]],
      hiddenFacts: [...base.hiddenFacts, ...p.hiddenFacts], faults: [...base.faults, ...p.faults],
      tags: ['scope', 'changed', 'perturbed'],
    });
    expect(all[4]!.spec.expected).toEqual(base.expected);
    expect(all[5]).toMatchObject({
      id: `${firstId}#esc`, baseId: firstId, variant: 'escalation', edits: [],
      escalation: { context: suite.escalationTwins[0]!.context, question: suite.escalationTwins[0]!.question },
      spec: { question: suite.escalationTwins[0]!.question, tags: ['scope', 'escalation-format'] },
    });
    expect(all[6]!.spec.question).toBe(suite.scenarios[1]!.question);
    expect(suite).toEqual(before);
  });

  it('keeps the base question when a twin supplies no question and deduplicates its tags', () => {
    const suite = fresh();
    suite.escalationTwins[0] = { scenario: firstId };
    suite.scenarios[0]!.tags.push('escalation-format');
    const twin = expandScenarios(suite).at(-1)!;
    expect(twin.spec.question).toBe(suite.scenarios[0]!.question);
    expect(twin.spec.tags).toEqual(['scope', 'escalation-format']);
  });

  it.each(['retained base', 'within additions', 'within base'] as const)('names the scenario and colliding item (%s)', (kind) => {
    const suite = fresh();
    const item = suite.scenarios[0]!.rubric[0]!;
    if (kind === 'retained base') suite.perturbations[0]!.rubric = [item];
    if (kind === 'within additions') suite.perturbations[0]!.rubric = [{ ...item, id: 'extra' }, { ...item, id: 'extra' }];
    if (kind === 'within base') suite.scenarios[0]!.rubric.push(item);
    expect(() => expandScenarios(suite)).toThrow(new RegExp(`${firstId}.*${kind === 'within additions' ? 'extra' : item.id}`));
  });

  it.each(['perturbation', 'twin'] as const)('rejects unknown %s base references', (kind) => {
    const suite = fresh();
    if (kind === 'perturbation') suite.perturbations[0]!.appliesTo = ['FX-999@001'];
    else suite.escalationTwins[0]!.scenario = `${firstId}~scope-update`;
    expect(() => expandScenarios(suite)).toThrow(/unknown base scenario/);
  });
});

describe('selectScenarios', () => {
  it.each<[SuiteName, string[]]>([
    ['smoke', [firstId]], ['holdout', [secondId]], ['dev', [firstId]],
    ['robustness', [`${firstId}~scope-update`]], ['escalation', [`${firstId}#esc`]],
    ['all', [firstId, secondId, `${firstId}~scope-update`, `${firstId}#esc`]],
  ])('selects %s', (name, ids) => {
    const suite = fresh();
    expect(selectScenarios(expandScenarios(suite), suite, { suite: name }).map(({ id }) => id)).toEqual(ids);
  });

  it('preserves authored base order for splits and excludes variants from dev', () => {
    const suite = fresh();
    suite.splits.smoke = [secondId, firstId];
    suite.splits.holdout = [];
    const all = expandScenarios(suite);
    expect(selectScenarios(all, suite, { suite: 'smoke' }).map(({ id }) => id)).toEqual([firstId, secondId]);
    expect(selectScenarios(all, suite, { suite: 'dev' }).map(({ id }) => id)).toEqual([firstId, secondId]);
  });

  it('explicit ids override splits, preserve duplicates and support an empty selection', () => {
    const suite = fresh();
    const all = expandScenarios(suite);
    const ids = [`${firstId}#esc`, secondId, `${firstId}~scope-update`, firstId, secondId];
    expect(selectScenarios(all, suite, { suite: 'smoke', ids }).map(({ id }) => id)).toEqual(ids);
    expect(selectScenarios(all, suite, { suite: 'all', ids: [] })).toEqual([]);
  });

  it('lists all unknown ids with close matches', () => {
    const suite = fresh();
    expect(() => selectScenarios(expandScenarios(suite), suite, {
      suite: 'all', ids: [firstId, 'FX-001@006', 'FX-002@003'],
    })).toThrow(/FX-001@006 \(close matches: FX-001@005.*FX-002@003 \(close matches: FX-002@002/);
  });
});

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reverseKeys(entry)]));
  }
  return value;
}

describe('rubricVersion', () => {
  it('is twelve hexadecimal characters and stable across recursively reordered keys', () => {
    const suite = fresh();
    expect(rubricVersion(suite)).toMatch(/^[a-f0-9]{12}$/);
    expect(rubricVersion(reverseKeys(suite) as EvalSuite)).toBe(rubricVersion(suite));
  });

  it.each(['scenarios', 'perturbations', 'escalationTwins', 'actionMap', 'splits', 'domainNotes', 'agentSenders'] as const)(
    'changes when %s changes', (field) => {
      const suite = fresh();
      const before = rubricVersion(suite);
      switch (field) {
        case 'scenarios': suite.scenarios[0]!.rubric[0]!.text += ' Updated.'; break;
        case 'perturbations': suite.perturbations[0]!.title += ' Updated.'; break;
        case 'escalationTwins': suite.escalationTwins[0]!.context += ' Updated.'; break;
        case 'actionMap': suite.actionMap[0]!.textPaths.push('message'); break;
        case 'splits': suite.splits.smoke = []; break;
        case 'domainNotes': suite.domainNotes += ' Updated.'; break;
        case 'agentSenders': suite.agentSenders.push('^desk'); break;
      }
      expect(rubricVersion(suite)).not.toBe(before);
    },
  );

  it('preserves array order and ignores fields outside the version contract', () => {
    const suite = fresh();
    const before = rubricVersion(suite);
    suite.roles.internal = 'Desk';
    suite.trackFolder = 'Other Fixture Folder';
    suite.refPrefix = 'OTHER';
    expect(rubricVersion(suite)).toBe(before);
    suite.scenarios.reverse();
    expect(rubricVersion(suite)).not.toBe(before);
  });
});
