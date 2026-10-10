import { describe, expect, it } from 'vitest';
import {
  ActionMapEntry, CaseEdit, EvalSuite, EventNumber, HiddenContinuation, JudgeVerdict,
  Perturbation, RubricItem, ScenarioResult, ScenarioSpec, TokenUsage, TraceCheck,
} from './index';
import { fixtureSuite } from '../testing/fixtures';

const scenarioInput = fixtureSuite.scenarios[0]!;
const verdictInput = {
  decision: { observed: 'ask', match: 'primary', explanation: 'The desk requested the missing scope confirmation.' },
  items: [
    { id: 'confirm-scope', status: 'met', evidence: 'Please confirm whether both units are included.', seq: 2, explanation: 'The question addresses the missing scope.' },
    { id: 'no-spend', status: 'not_violated', evidence: 'No spend action succeeded.', seq: null, explanation: 'No new spend was committed.' },
  ],
  clairvoyance: { found: false, details: 'No facts from the continuation were used.' },
  unsupportedClaims: [], usability: { score: 4, explanation: 'Clear next step with the pending authorization stated.' },
  topIssue: 'No material issue.', fixArea: 'output',
};
const resultInput = {
  runId: '20260202-100000-smoke-fixture', scenarioId: 'FX-001@005', baseId: 'FX-001@005',
  variant: 'base', repeat: 1, title: scenarioInput.title, tags: ['scope'], agent: 'fixture', expectedDecision: 'ask',
  ms: 120, agentError: null, agentUsage: { inputTokens: 200, outputTokens: 50 },
  checks: [{ id: 'completed', ok: true, severity: 'critical', tag: 'robustness', message: 'Run completed.' }],
  items: [{
    id: 'confirm-scope', kind: 'required', tag: 'scope', text: 'Ask the customer to confirm the requested job scope.',
    weight: 3, status: 'met', source: 'judge', evidence: 'Please confirm whether both units are included.',
    seq: 2, explanation: 'The missing scope was requested.', fix: 'prompt', uncertain: false,
  }],
  judge: { verdict: verdictInput, model: 'fixture-model', samples: 1, agreement: null, cached: false, usage: { inputTokens: 500, outputTokens: 100 }, costUsd: null, error: null },
  scores: { completed: true, critical: false, outcome: 1, judgement: 1, engineering: 1, usability: 1, decisionObserved: 'ask', decisionMatch: 'primary' },
  topIssue: null, fixArea: null, artifactsDir: 'agent/FX-001_005/r1',
};

describe('shared schema contracts', () => {
  it('parses a realistic scenario and fills all authored defaults', () => {
    const scenario = ScenarioSpec.parse(scenarioInput);
    expect(scenario.attachments).toEqual({ include: [], exclude: [] });
    expect(scenario.faults).toEqual([]);
    expect(scenario.rubric[1]?.evidence).toEqual(['note-01.txt', 'event-004']);
    const minimal = ScenarioSpec.parse({
      id: 'FX-003@001', case: '003', cutAfter: '001', title: 'Wait for confirmation',
      expected: { decision: 'wait', summary: 'Wait for the requested scope confirmation before proceeding.' },
      rubric: [{ id: 'hold', kind: 'required', text: 'Hold until the requested scope is confirmed.', tag: 'scope' }],
    });
    expect(minimal).toMatchObject({ attachments: { include: [], exclude: [] }, hiddenFacts: [], faults: [], tags: [] });
    expect(minimal.expected.acceptable).toEqual([]);
    expect(minimal.rubric[0]?.evidence).toEqual([]);
  });

  it('fills the nested attachment defaults for a partial object', () => {
    expect(ScenarioSpec.parse({ ...scenarioInput, attachments: { include: ['note-01.txt'] } }).attachments)
      .toEqual({ include: ['note-01.txt'], exclude: [] });
  });

  it('parses a realistic perturbation and fills its defaults', () => {
    const perturbation = Perturbation.parse(fixtureSuite.perturbations![0]);
    expect(perturbation.edits[0]?.op).toBe('append_event');
    expect(perturbation).toMatchObject({ rubric: [], dropRubric: [], hiddenFacts: [], faults: [], tags: [] });
    expect(Perturbation.parse({ id: 'noise', title: 'Noise', description: 'Add a routine note.', appliesTo: ['FX-001@005'] }).edits).toEqual([]);
    expect(CaseEdit.parse({ op: 'pad_noise', count: 2 })).toEqual({ op: 'pad_noise', count: 2, seed: 1 });
  });

  it('parses a realistic suite and fills action-map and suite defaults', () => {
    const suite = EvalSuite.parse(fixtureSuite);
    expect(suite.roles.internal).toBe('Operations desk');
    expect(suite.actionMap[1]?.textPaths).toEqual([]);
    const { perturbations, escalationTwins, actionMap, ...minimal } = fixtureSuite;
    expect(EvalSuite.parse(minimal)).toMatchObject({ perturbations: [], escalationTwins: [], actionMap: [] });
    expect(ActionMapEntry.parse({ tool: 'desk.message', kind: 'message' }).textPaths).toEqual([]);
  });

  it('parses a realistic verdict and persisted scenario result', () => {
    const verdict = JudgeVerdict.parse(verdictInput);
    expect(verdict.usability.score).toBe(4);
    const result = ScenarioResult.parse(resultInput);
    expect(result.judge?.verdict).toEqual(verdict);
    expect(result.agentUsage).toEqual({ inputTokens: 200, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(ScenarioResult.parse(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });

  it('parses a persisted continuation with raw timestamps and removed numbers', () => {
    const hidden = HiddenContinuation.parse({
      scenarioId: 'FX-001@005', events: [{
        number: '006', at: '2026-02-02 10:45:00 UTC',
        fields: [{ key: 'Channel', value: 'Email' }, { key: 'From', value: 'Customer' }],
        body: 'Please include both units.',
      }],
      attachments: [{ fileName: 'quote-02.txt', text: 'A priced proposal.' }],
      removedSections: [{ heading: 'Outcome', body: 'The job was completed.' }],
      removedDetails: [{ key: 'Status', value: 'Completed' }], renumbering: { '001': '001', '002': null },
    });
    expect(hidden.events[0]?.at).toBe('2026-02-02 10:45:00 UTC');
    expect(hidden.renumbering['002']).toBeNull();
    expect(HiddenContinuation.parse(JSON.parse(JSON.stringify(hidden)))).toEqual(hidden);
  });

  it.each(['PM-008@038', 'PM-008@038~gas-smell', 'PM-008@038#esc'])('accepts base and variant scenario id %s', (id) => {
    expect(ScenarioSpec.parse({ ...scenarioInput, id, case: '008', cutAfter: '038' }).id).toBe(id);
  });

  it.each([
    'FX-001', 'FX-01@005', 'FX-001@5', '../FX-001@005',
    'PM-008@038~Bad', 'PM-008@038#x', 'PM-8@038',
    'PM-008@038~gas-smell#esc', 'PM-008@038#esc~gas-smell', 'PM-008@038~',
  ])('rejects bad scenario id %s', (id) => {
    expect(ScenarioSpec.safeParse({ ...scenarioInput, id }).success).toBe(false);
  });

  it.each(['01', '0001', 'abc', ' 001'])('rejects bad event number %s', (number) => {
    expect(EventNumber.safeParse(number).success).toBe(false);
    expect(ScenarioSpec.safeParse({ ...scenarioInput, cutAfter: number }).success).toBe(false);
    expect(ScenarioSpec.safeParse({ ...scenarioInput, case: number }).success).toBe(false);
    expect(CaseEdit.safeParse({ op: 'remove_event', number }).success).toBe(false);
  });

  it('rejects invalid ids and unknown discriminants or kinds', () => {
    expect(RubricItem.safeParse({ ...scenarioInput.rubric[0], id: 'Bad_ID' }).success).toBe(false);
    expect(RubricItem.safeParse({ ...scenarioInput.rubric[0], kind: 'unknown' }).success).toBe(false);
    expect(Perturbation.safeParse({ ...fixtureSuite.perturbations![0], id: 'Bad_ID' }).success).toBe(false);
    expect(TraceCheck.safeParse({ type: 'unknown' }).success).toBe(false);
    expect(TraceCheck.safeParse({ type: 'no_action', kinds: ['unknown'] }).success).toBe(false);
    expect(CaseEdit.safeParse({ op: 'unknown' }).success).toBe(false);
  });

  it('requires every role label and a nonempty sender list', () => {
    const { unknown, ...roles } = fixtureSuite.roles;
    expect(EvalSuite.safeParse({ ...fixtureSuite, roles }).success).toBe(false);
    expect(EvalSuite.safeParse({ ...fixtureSuite, agentSenders: [] }).success).toBe(false);
  });

  it('enforces minimum rubric and expected-summary lengths', () => {
    expect(ScenarioSpec.safeParse({ ...scenarioInput, rubric: [] }).success).toBe(false);
    expect(RubricItem.safeParse({ ...scenarioInput.rubric[0], text: 'Short' }).success).toBe(false);
    expect(ScenarioSpec.safeParse({ ...scenarioInput, expected: { summary: 'Too short', decision: 'ask' } }).success).toBe(false);
  });

  it('requires rubric item ids to be unique within a scenario', () => {
    const item = scenarioInput.rubric[0]!;
    expect(ScenarioSpec.safeParse({ ...scenarioInput, rubric: [item, item] }).success).toBe(false);
  });

  it.each([-1, 1.5, 5])('rejects invalid usability score %s', (score) => {
    expect(JudgeVerdict.safeParse({ ...verdictInput, usability: { score, explanation: '' } }).success).toBe(false);
  });

  it('requires nonnegative integer token usage and defaults both cache counters', () => {
    expect(TokenUsage.parse({ inputTokens: 0, outputTokens: 0 })).toEqual({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
    for (const key of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']) {
      for (const value of [-1, 0.5]) expect(TokenUsage.safeParse({ inputTokens: 0, outputTokens: 0, [key]: value }).success).toBe(false);
    }
  });

  it('rejects invalid result scores and unknown variants', () => {
    expect(ScenarioResult.safeParse({ ...resultInput, scores: { ...resultInput.scores, outcome: 1.1 } }).success).toBe(false);
    expect(ScenarioResult.safeParse({ ...resultInput, variant: 'unknown' }).success).toBe(false);
    expect(ScenarioResult.safeParse({ ...resultInput, items: [{ ...resultInput.items[0], kind: 'unknown' }] }).success).toBe(false);
  });
});
