import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ConcreteScenario } from '../schema';
import { FIXTURE_DATA_DIR } from '../testing/fixtures';
import { auditLeak, materializeScenario, readRawCase, scenarioSlug, writeRawCase } from './index';
import { suite, visibleText } from './test-helpers';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'casework-scenario-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

function scenario(variant: ConcreteScenario['variant']): ConcreteScenario {
  const spec = structuredClone(suite.scenarios[0]!);
  const suffix = variant === 'base' ? '' : variant === 'perturbed' ? '~scope-update' : '#esc';
  return { id: spec.id + suffix, baseId: spec.id, variant, spec,
    edits: variant === 'perturbed' ? structuredClone(suite.perturbations[0]!.edits) : [],
    ...(variant === 'escalation' ? { escalation: { context: suite.escalationTwins[0]!.context, question: suite.escalationTwins[0]!.question } } : {}),
  };
}

describe('materializeScenario', () => {
  it.each(['base', 'perturbed', 'escalation'] as const)('writes and audits the %s fixture scenario', async (variant) => {
    const input = scenario(variant);
    const before = structuredClone(input);
    const result = await materializeScenario({ scenario: input, suite, dataDir: FIXTURE_DATA_DIR, outDir: root });
    expect(input).toEqual(before);
    expect(result.root).toBe(root);
    expect(result.caseDir).toBe(join(root, suite.trackFolder, '001'));
    expect(result.folder).toBe('001');
    const written = await readRawCase(join(root, suite.trackFolder), '001');
    expect(result.visibleText).toBe(visibleText(written));
    expect(result.visibleAttachments).toEqual(['note-01.txt']);
    expect(await readdir(join(result.caseDir, 'attachments'))).toEqual(['note-01.txt']);
    expect(result.hidden.scenarioId).toBe(input.id);
    expect(result.hidden.events.map((event) => event.number)).toEqual(['006', '007', '008']);
    expect(result.hidden.attachments.map((attachment) => attachment.fileName)).toEqual(['quote-02.txt']);
    expect(result.hidden.removedSections.map((section) => section.heading)).toEqual(['Overview', 'Outcome']);
    expect(result.hidden.removedDetails.map((detail) => detail.key)).toEqual(['Status', 'Updated', 'Completed']);
    expect(result.leak).toEqual({ ok: true, findings: [] });
    expect(result.visibleEvents).toEqual(variant === 'perturbed' ? ['001', '002', '003', '004', '005', '006'] : ['001', '002', '003', '004', '005']);
    expect(result.spec.cutAfter).toBe(variant === 'perturbed' ? '006' : '005');
    expect(written.history.preamble).toContain(`Total events: ${result.visibleEvents.length}`);
    expect(await readFile(join(result.caseDir, 'attachments/note-01.txt'))).toEqual(await readFile(join(FIXTURE_DATA_DIR, suite.trackFolder, '001/attachments/note-01.txt')));
    if (variant === 'perturbed') expect(written.history.events.at(-1)?.body).toBe(`Please include the second unit in the scope question for ${written.index.title}.`);
    if (variant === 'escalation') {
      expect(written.history.events.at(-1)?.fields[0]).toEqual({ key: 'Stage', value: 'Escalation' });
      expect(written.index.sections[0]).toEqual({ heading: 'Context', body: input.escalation!.context });
      expect(written.index.sections.find((section) => section.heading === 'Decision required')?.body).toBe(input.escalation!.question);
    }
  });

  it('cuts in original numbering before renumbering edit evidence and changing the folder', async () => {
    const input = scenario('perturbed');
    input.edits = [
      { op: 'remove_event', number: '004' },
      { op: 'insert_event', before: '002', event: { fields: [{ key: 'From', value: 'Operations desk' }], body: 'An inserted note', at: '2026-02-02 09:05:00 UTC' } },
      { op: 'append_event', event: { fields: [{ key: 'From', value: 'Customer {{folder}}' }], body: 'A new note for {{folder}}' } },
    ];
    const result = await materializeScenario({ scenario: input, suite, dataDir: FIXTURE_DATA_DIR, outDir: root, folderOverride: '099' });
    const written = await readRawCase(join(root, suite.trackFolder), '099');
    expect(result.caseDir).toBe(join(root, suite.trackFolder, '099'));
    expect(result.folder).toBe('099');
    expect(result.hidden.renumbering).toEqual({ '001': '001', '002': '003', '003': '004', '004': null, '005': '005' });
    expect(result.spec.cutAfter).toBe('006');
    expect(result.spec.rubric.find((item) => item.id === 'cite-note')?.evidence).toEqual(['note-01.txt']);
    expect(written.history.events.at(-1)?.body).toBe('A new note for 001');
    expect(written.history.events.at(-1)?.fields[0]?.value).toBe('Customer 001');
    expect(result.leak.ok).toBe(true);
  });

  it('accepts edit text that repeats details from hidden events, which an audit without it would report', async () => {
    const input = scenario('perturbed');
    input.edits = [
      { op: 'append_event', event: { fields: [{ key: 'From', value: 'Customer' }], body: 'Reminder for {{detail:Site}}: please include both units in the routine check.' } },
      { op: 'insert_event', before: '004', event: { fields: [{ key: 'From', value: 'Provider' }], body: 'Draft for {{detail:Site}}: the priced proposal for both units is attached.' } },
      { op: 'replace_text', in: 'event', number: '003', find: 'No new spend is authorized at this stage.', replace: 'Please obtain authorization before starting.' },
      { op: 'replace_text', in: 'initial_request', find: 'before work starts.', replace: 'before work starts. Confirmation was sent to the customer and the job was closed.' },
      { op: 'set_detail', key: 'Note', value: 'The approver authorized the proposal and the provider confirmed completion.' },
    ];
    const result = await materializeScenario({ scenario: input, suite, dataDir: FIXTURE_DATA_DIR, outDir: root });
    expect(result.leak).toEqual({ ok: true, findings: [] });
    const without = auditLeak({ visibleText: result.visibleText, visible: await readRawCase(join(root, suite.trackFolder), '001'),
      original: await readRawCase(join(FIXTURE_DATA_DIR, suite.trackFolder), '001'), hidden: result.hidden, spec: result.spec });
    expect(without.findings.map(({ kind, detail }) => `${kind}: ${detail.slice(0, 'Hidden event 000'.length)}`))
      .toEqual(['event_text: Hidden event 006', 'event_text: Hidden event 007', 'event_text: Hidden event 008']);
  });

  it('handles an escalation input with no attachments and retains hidden later stages', async () => {
    const spec = suite.scenarios[1]!;
    const result = await materializeScenario({ scenario: { id: spec.id + '#esc', baseId: spec.id, variant: 'escalation', spec, edits: [] },
      suite, dataDir: FIXTURE_DATA_DIR, outDir: root });
    expect(result.visibleAttachments).toEqual([]);
    expect(result.visibleEvents).toEqual(['001', '002']);
    expect(result.hidden.removedSections).toHaveLength(4);
    expect(result.leak).toEqual({ ok: true, findings: [] });
  });

  it('detects files left by a previous materialization in a reused output folder', async () => {
    const input = scenario('base');
    input.spec.attachments.include = ['quote-02.txt'];
    const first = await materializeScenario({ scenario: input, suite, dataDir: FIXTURE_DATA_DIR, outDir: root });
    expect(first.visibleAttachments).toContain('quote-02.txt');
    input.spec.attachments.include = [];
    const second = await materializeScenario({ scenario: input, suite, dataDir: FIXTURE_DATA_DIR, outDir: root });
    expect(second.leak.findings.some((finding) => finding.kind === 'attachment')).toBe(true);
  });

  it('renders an included image as no text and copies its bytes unchanged', async () => {
    const inputDir = join(root, 'input');
    const outputDir = join(root, 'output');
    const raw = await readRawCase(join(FIXTURE_DATA_DIR, suite.trackFolder), '001');
    const sourcePath = join(root, 'image.png');
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    await writeFile(sourcePath, bytes);
    raw.attachments.push({ fileName: 'image.png', sourcePath, text: null });
    await writeRawCase(raw, inputDir);
    const input = scenario('base');
    input.spec.attachments.include = ['image.png'];
    const result = await materializeScenario({ scenario: input, suite, dataDir: inputDir, outDir: outputDir });
    expect(result.visibleText).toContain('\n\n[attachment image.png]\n[no text]');
    expect(await readFile(join(result.caseDir, 'attachments/image.png'))).toEqual(bytes);
    expect(result.leak).toEqual({ ok: true, findings: [] });
  });

  it('uses the first noise seed with suite sender patterns in an edited scenario', async () => {
    const input = scenario('perturbed');
    input.edits = [{ op: 'pad_noise', count: 3, seed: 19 }];
    const first = await materializeScenario({ scenario: input, suite, dataDir: FIXTURE_DATA_DIR, outDir: join(root, 'first') });
    const second = await materializeScenario({ scenario: input, suite, dataDir: FIXTURE_DATA_DIR, outDir: join(root, 'second') });
    expect(first.visibleEvents).toHaveLength(8);
    expect(first.visibleText).toBe(second.visibleText);
    expect(first.hidden.renumbering).toEqual(second.hidden.renumbering);
    expect(first.spec.cutAfter).toBe('008');
    expect(first.leak).toEqual({ ok: true, findings: [] });
  });
});

describe('scenarioSlug', () => {
  it.each([
    ['FX-001@005', 'FX-001_005'], ['FX-001@005~noise', 'FX-001_005__noise'], ['FX-001@005#esc', 'FX-001_005--esc'],
    ['a/b c:é?d', 'a-b-c---d'], ['A_Z.3-4', 'A_Z.3-4'],
  ])('maps %s to %s', (id, slug) => { expect(scenarioSlug(id)).toBe(slug); });
});
