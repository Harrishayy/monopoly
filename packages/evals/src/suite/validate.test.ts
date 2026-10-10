import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { EvalSuite } from '../schema';
import { FIXTURE_DATA_DIR, fixtureSuite } from '../testing/fixtures';
import { loadSuite, validateSuite } from './index';

function fresh(): EvalSuite {
  return loadSuite(structuredClone(fixtureSuite));
}

const firstId = fixtureSuite.scenarios[0]!.id;
const secondId = fixtureSuite.scenarios[1]!.id;
const temporaryDirs: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function temporaryData(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'casework-suite-'));
  temporaryDirs.push(dir);
  await cp(FIXTURE_DATA_DIR, dir, { recursive: true });
  return dir;
}

describe.skipIf(!existsSync(FIXTURE_DATA_DIR))('validateSuite', () => {
  it('passes the fixture suite, with authoring warnings kept separate from errors', async () => {
    const result = await validateSuite(fresh(), FIXTURE_DATA_DIR);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      `Scenario ${secondId} has a weak rubric: no prohibited/critical item or red_flag`,
      'Perturbation scope-update has no rubric items and no expected override',
    ]);
  });

  const errors: [string, (suite: EvalSuite) => void, RegExp][] = [
    ['duplicate scenario ids', (s) => { s.scenarios.push(structuredClone(s.scenarios[0]!)); }, /Duplicate scenario id: FX-001@005/],
    ['missing case folder', (s) => { s.scenarios[0]!.case = '999'; }, /Case folder missing: .*999/],
    ['missing cut event', (s) => { s.scenarios[0]!.cutAfter = '009'; }, /cutAfter 009 is not an existing event/],
    ['missing evidence event', (s) => { s.scenarios[0]!.rubric[0]!.evidence = ['event-009']; }, /evidence event-009 does not exist/],
    ['missing included attachment', (s) => { s.scenarios[0]!.attachments.include = ['absent.txt']; }, /attachments.include file absent.txt does not exist/],
    ['missing excluded attachment', (s) => { s.scenarios[0]!.attachments.exclude = ['absent.txt']; }, /attachments.exclude file absent.txt does not exist/],
    ['missing evidence attachment', (s) => { s.scenarios[0]!.rubric[0]!.evidence = ['absent.txt']; }, /evidence file absent.txt does not exist/],
    ['unknown perturbation target', (s) => { s.perturbations[0]!.appliesTo = ['FX-999@001']; }, /appliesTo references unknown base scenario FX-999@001/],
    ['variant perturbation target', (s) => { s.perturbations[0]!.appliesTo = [`${firstId}#esc`]; }, /appliesTo references unknown base scenario .*#esc/],
    ['unknown twin target', (s) => { s.escalationTwins[0]!.scenario = 'FX-999@001'; }, /Escalation twin references unknown base scenario/],
    ['unknown smoke split id', (s) => { s.splits.smoke = ['FX-999@001']; }, /Split smoke references unknown or non-base scenario/],
    ['non-base holdout split id', (s) => { s.splits.holdout = [`${firstId}~scope-update`]; }, /Split holdout references unknown or non-base scenario/],
    ['overlapping splits', (s) => { s.splits.holdout.push(firstId); }, /Smoke and holdout splits overlap: FX-001@005/],
    ['duplicate action tools', (s) => { s.actionMap.push(structuredClone(s.actionMap[0]!)); }, /Duplicate actionMap tool: desk.message/],
    ['expanded rubric collision', (s) => { s.perturbations[0]!.rubric = [structuredClone(s.scenarios[0]!.rubric[0]!)]; }, /Scenario FX-001@005~scope-update: rubric item id collision: confirm-scope/],
    ['duplicate base rubric items', (s) => { s.scenarios[0]!.rubric.push(structuredClone(s.scenarios[0]!.rubric[0]!)); }, /Scenario FX-001@005: rubric item id collision: confirm-scope/],
    ['duplicate twin ids', (s) => { s.escalationTwins.push(structuredClone(s.escalationTwins[0]!)); }, /Duplicate scenario id: FX-001@005#esc/],
    ['duplicate perturbed ids', (s) => { s.perturbations[0]!.appliesTo.push(firstId); }, /Duplicate scenario id: FX-001@005~scope-update/],
    ['perturbation evidence event', (s) => { s.perturbations[0]!.rubric = [{ ...s.scenarios[0]!.rubric[0]!, id: 'added-item', evidence: ['event-009'] }]; }, /Scenario FX-001@005~scope-update rubric item added-item: evidence event-009 does not exist/],
    ['perturbation evidence attachment', (s) => { s.perturbations[0]!.rubric = [{ ...s.scenarios[0]!.rubric[0]!, id: 'added-item', evidence: ['absent.txt'] }]; }, /Scenario FX-001@005~scope-update rubric item added-item: evidence file absent.txt does not exist/],
  ];
  it.each(errors)('reports %s', async (_, mutate, expected) => {
    const suite = fresh();
    mutate(suite);
    const result = await validateSuite(suite, FIXTURE_DATA_DIR);
    expect(result.ok).toBe(false);
    expect(result.errors.some((message) => expected.test(message))).toBe(true);
  });

  it.each(['insert_event', 'remove_event', 'replace_text'] as const)('rejects %s targets after the cut and missing targets before it', async (op) => {
    for (const number of ['006', '000']) {
      const suite = fresh();
      suite.perturbations[0]!.edits = [op === 'insert_event'
        ? { op, before: number, event: { fields: [{ key: 'From', value: 'Customer' }], body: 'Updated request.' } }
        : op === 'remove_event' ? { op, number }
        : { op, in: 'event', number, find: 'scope', replace: 'request' }];
      const result = await validateSuite(suite, FIXTURE_DATA_DIR);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain(number === '006'
        ? `Perturbation scope-update edit 0 for ${firstId}: event 006 is after cutAfter 005`
        : `Perturbation scope-update edit 0 for ${firstId}: event 000 does not exist in case 001`);
    }
  });

  it('checks each perturbation target against its own case and cut', async () => {
    const suite = fresh();
    suite.perturbations[0]!.appliesTo = [firstId, secondId];
    suite.perturbations[0]!.edits = [{ op: 'remove_event', number: '004' }];
    const result = await validateSuite(suite, FIXTURE_DATA_DIR);
    expect(result.errors).toEqual([`Perturbation scope-update edit 0 for ${secondId}: event 004 is after cutAfter 002`]);
  });

  it('accepts existing attachments, index refs and visible edits without event numbers', async () => {
    const suite = fresh();
    suite.scenarios[0]!.attachments = { include: ['note-01.txt'], exclude: ['quote-02.txt'] };
    suite.scenarios[0]!.rubric[0]!.evidence.push('index:initial-request', 'index:details');
    suite.perturbations[0]!.edits = [
      { op: 'insert_event', before: '005', event: { fields: [{ key: 'From', value: 'Customer' }], body: 'Updated request.' } },
      { op: 'remove_event', number: '001' },
      { op: 'replace_text', in: 'event', number: '003', find: 'scope', replace: 'request' },
      { op: 'replace_text', in: 'any', find: 'scope', replace: 'request' },
      { op: 'set_detail', key: 'Site', value: 'Unit 9' },
      { op: 'pad_noise', count: 1, seed: 1 },
    ];
    expect((await validateSuite(suite, FIXTURE_DATA_DIR)).errors).toEqual([]);
  });

  const warnings: [string, (suite: EvalSuite) => void, RegExp][] = [
    ['hidden evidence events', (s) => { s.scenarios[0]!.rubric[0]!.evidence = ['event-006']; }, /evidence event-006 is after cutAfter 005; use hiddenFacts instead/],
    ['visible event marker', (s) => { s.scenarios[0]!.hiddenFacts = [{ text: 'Hidden detail.', marker: 'PLEASE CONFIRM WHETHER' }]; }, /hiddenFacts marker .*PLEASE CONFIRM WHETHER.*would trip the leak audit/],
    ['index marker', (s) => { s.scenarios[0]!.hiddenFacts = [{ text: 'Hidden detail.', marker: 'EXAMPLE CENTRE' }]; }, /hiddenFacts marker .*EXAMPLE CENTRE.*would trip the leak audit/],
    ['weak rubric', (s) => { s.scenarios[0]!.rubric = s.scenarios[0]!.rubric.filter((item) => item.kind === 'required' || item.kind === 'positive'); }, /Scenario FX-001@005 has a weak rubric/],
    ['positive max_spend', (s) => { s.scenarios[0]!.rubric[1]!.check = { type: 'max_spend', pence: 100 }; }, /rubric item cite-note: max_spend check on a positive item/],
    ['empty perturbation rubric and expectation', () => {}, /Perturbation scope-update has no rubric items and no expected override/],
    ['perturbation hidden marker', (s) => { s.perturbations[0]!.hiddenFacts = [{ text: 'Hidden detail.', marker: 'EXAMPLE CENTRE' }]; }, /Scenario FX-001@005~scope-update: hiddenFacts marker/],
    ['perturbation hidden evidence', (s) => { s.perturbations[0]!.rubric = [{ ...s.scenarios[0]!.rubric[0]!, id: 'added-item', evidence: ['event-006'] }]; }, /Scenario FX-001@005~scope-update rubric item added-item: evidence event-006 is after/],
    ['perturbation weak rubric after drops', (s) => { s.perturbations[0]!.dropRubric = ['no-spend', 'no-hidden-quote']; }, /Scenario FX-001@005~scope-update has a weak rubric/],
  ];
  it.each(warnings)('warns about %s without failing validation', async (_, mutate, expected) => {
    const suite = fresh();
    mutate(suite);
    const result = await validateSuite(suite, FIXTURE_DATA_DIR);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((message) => expected.test(message))).toBe(true);
  });

  it.each(['prohibited', 'critical', 'red_flag'] as const)('accepts a rubric with a %s item as strong', async (kind) => {
    const suite = fresh();
    suite.scenarios[1]!.rubric[0]!.kind = kind;
    const result = await validateSuite(suite, FIXTURE_DATA_DIR);
    expect(result.warnings.some((message) => message.includes('weak rubric'))).toBe(false);
  });

  it('does not warn about markers found only in hidden events or facts without markers', async () => {
    const suite = fresh();
    suite.scenarios[0]!.hiddenFacts.push({ text: 'The scope will change later.', marker: 'Please include both units' }, { text: 'Another hidden fact.' });
    const result = await validateSuite(suite, FIXTURE_DATA_DIR);
    expect(result.warnings.some((message) => message.includes('hiddenFacts marker'))).toBe(false);
  });

  it('suppresses an empty perturbation warning when either rubric or expected is supplied', async () => {
    for (const field of ['rubric', 'expected'] as const) {
      const suite = fresh();
      if (field === 'rubric') suite.perturbations[0]!.rubric = [{ ...suite.scenarios[0]!.rubric[0]!, id: 'extra-item' }];
      else suite.perturbations[0]!.expected = structuredClone(suite.scenarios[0]!.expected);
      const result = await validateSuite(suite, FIXTURE_DATA_DIR);
      expect(result.warnings.some((message) => message.includes('no rubric items and no expected override'))).toBe(false);
    }
  });

  it('does not warn about unused case folders or an empty suite', async () => {
    const suite = fresh();
    suite.scenarios = [];
    suite.perturbations = [];
    suite.escalationTwins = [];
    suite.splits = { smoke: [], holdout: [] };
    expect(await validateSuite(suite, FIXTURE_DATA_DIR)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('returns multiple independent errors in one validation', async () => {
    const suite = fresh();
    suite.scenarios[0]!.cutAfter = '009';
    suite.scenarios[0]!.rubric[0]!.evidence = ['absent.txt'];
    suite.splits.smoke = ['FX-999@001'];
    suite.actionMap.push(structuredClone(suite.actionMap[0]!));
    const result = await validateSuite(suite, FIXTURE_DATA_DIR);
    expect(result.ok).toBe(false);
    expect(result.errors.some((message) => message.includes('cutAfter 009'))).toBe(true);
    expect(result.errors.some((message) => message.includes('evidence file absent.txt'))).toBe(true);
    expect(result.errors.some((message) => message.includes('Split smoke'))).toBe(true);
    expect(result.errors.some((message) => message.includes('Duplicate actionMap'))).toBe(true);
  });

  it('reports unreadable case files as errors instead of rejecting', async () => {
    const dir = await temporaryData();
    const suite = fresh();
    await rm(join(dir, suite.trackFolder, '001', 'history.md'));
    const result = await validateSuite(suite, dir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((message) => /Could not read case 001:/.test(message))).toBe(true);
  });

  it('does not treat event anchors as body text, and stops at the next heading', async () => {
    const dir = await temporaryData();
    const suite = fresh();
    suite.scenarios = [suite.scenarios[0]!];
    suite.perturbations = [];
    suite.escalationTwins = [];
    suite.splits = { smoke: [firstId], holdout: [] };
    const path = join(dir, suite.trackFolder, '001', 'history.md');
    let history = await readFile(path, 'utf8');
    history = history.replace('<a id="event-006"></a>', '## Supplemental notes\n\nA marker outside the event body.\n\n<a id="event-006"></a>');
    await writeFile(path, history);
    suite.scenarios[0]!.hiddenFacts = [
      { text: 'A hidden event follows.', marker: 'event-006' },
      { text: 'Supplemental detail.', marker: 'marker outside the event body' },
    ];
    expect((await validateSuite(suite, dir)).warnings).toEqual([]);
  });

  it('accepts CRLF event headings and trailing spaces', async () => {
    const dir = await temporaryData();
    const suite = fresh();
    const path = join(dir, suite.trackFolder, '001', 'history.md');
    const history = (await readFile(path, 'utf8')).replace(/(— event \d{3})/g, '$1  ').replace(/\n/g, '\r\n');
    await writeFile(path, history);
    expect((await validateSuite(suite, dir)).errors).toEqual([]);
  });

  it('allows case folders without an attachments directory', async () => {
    const dir = await temporaryData();
    const suite = fresh();
    await mkdir(join(dir, suite.trackFolder, '003'));
    // The second fixture already has no attachments directory.
    expect((await validateSuite(suite, dir)).errors).toEqual([]);
  });
});
