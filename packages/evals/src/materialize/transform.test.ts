import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CaseEdit, EventDraft, RawCase } from '../schema';
import { FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER } from '../testing/fixtures';
import { applyEdits, cutCase, readRawCase, remapSpec, renderTemplate, templateVars, toEscalationFormat } from './index';
import { hasPublicData, publicFolders, specAt, suite } from './test-helpers';

let original: RawCase;
let visible: RawCase;
const draft: EventDraft = {
  fields: [{ key: 'Channel', value: 'Email' }, { key: 'From', value: '{{detail:Source role}}' }, { key: 'To', value: 'Party {{folder}}' }],
  body: 'New request for {{title}} at {{lastAt}}. Keep {{unknown}}.',
};
beforeEach(async () => {
  original = await readRawCase(join(FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER), '001');
  visible = cutCase(original, suite.scenarios[0]!).visible;
});

describe('cutCase', () => {
  it('keeps only known events and files and records every removed item without mutation', () => {
    const before = structuredClone(original);
    const { visible: cut, hidden } = cutCase(original, suite.scenarios[0]!);
    expect(original).toEqual(before);
    expect(cut.history.events.map((event) => event.number)).toEqual(['001', '002', '003', '004', '005']);
    expect(cut.history.preamble).toBe('Total events: 5');
    expect(cut.attachments.map((attachment) => attachment.fileName)).toEqual(['note-01.txt']);
    expect(hidden.events.map((event) => event.number)).toEqual(['006', '007', '008']);
    expect(hidden.attachments).toEqual([{ fileName: 'quote-02.txt', text: original.attachments[1]!.text }]);
    expect(hidden.removedSections.map((section) => section.heading)).toEqual(['Overview', 'Outcome']);
    expect(hidden.removedDetails.map((detail) => detail.key)).toEqual(['Status', 'Updated', 'Completed']);
    expect(cut.index.sections.find((section) => section.heading === 'Attachments')?.body).toBe('- [note-01.txt](attachments/note-01.txt)');
    expect(cut.index.sections.find((section) => section.heading === 'History')).toEqual(original.index.sections.find((section) => section.heading === 'History'));
    const headings = cut.index.sections.map((section) => section.heading);
    expect(headings[headings.indexOf('Initial request') + 1]).toBe('Decision required');
    expect(cut.index.sections.find((section) => section.heading === 'Decision required')?.body).toBe(suite.scenarios[0]!.question);
  });

  it('uses include minus exclude, including plain filename mentions', () => {
    const spec = specAt('004');
    spec.attachments = { include: ['quote-02.txt', 'note-01.txt'], exclude: ['note-01.txt'] };
    expect(cutCase(original, spec).visible.attachments.map((attachment) => attachment.fileName)).toEqual(['quote-02.txt']);
    spec.attachments.include = [];
    expect(cutCase(original, spec).visible.index.sections.find((section) => section.heading === 'Attachments')?.body)
      .toBe('No attachments are required or available for this case.');
    original.history.events[0]!.body += ' See quote-02.txt for context.';
    expect(cutCase(original, specAt('001')).visible.attachments.map((attachment) => attachment.fileName)).toEqual(['quote-02.txt']);
  });

  it('removes all four section types and three detail types regardless of case', async () => {
    const raw = await readRawCase(join(FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER), '002');
    raw.index.sections.forEach((section) => { section.heading = section.heading.toUpperCase(); });
    raw.index.details.forEach((detail) => { detail.key = detail.key.toLowerCase(); });
    const { visible: cut, hidden } = cutCase(raw, specAt('002'));
    expect(hidden.removedSections.map((section) => section.heading)).toEqual(['OVERVIEW', 'NEXT ACTION AT ESCALATION', 'OUTCOME', 'BOUNDARIES AND REMAINING WORK']);
    expect(hidden.removedDetails.map((detail) => detail.key)).toEqual(['status', 'updated', 'completed']);
    expect(cut.history.preamble).toBe('All identities, records and communications are fictional. Total events: 2.');
    expect(cut.index.details.some((detail) => detail.key === 'escalated')).toBe(true);
  });

  it('replaces and relocates an existing decision section and adds a missing attachment section', () => {
    original.index.sections.unshift({ heading: 'decision REQUIRED', body: 'Old question' });
    original.index.sections = original.index.sections.filter((section) => section.heading !== 'Attachments');
    const { visible: cut } = cutCase(original, suite.scenarios[0]!);
    expect(cut.index.sections.filter((section) => section.heading.toLowerCase() === 'decision required')).toHaveLength(1);
    expect(cut.index.sections[1]?.heading).toBe('Decision required');
    expect(cut.index.sections.at(-1)?.heading).toBe('Attachments');
  });

  it('throws a clear error for an absent cut event', () => {
    expect(() => cutCase(original, specAt('999'))).toThrow('event 999 does not exist');
  });
});

describe('templates', () => {
  it('supplies all case values, leaves unknown names alone and preserves literal replacement values', () => {
    const vars = templateVars(visible);
    expect(vars).toEqual({
      title: visible.index.title, folder: '001', lastAt: '2026-02-02 10:00:00 UTC',
      'detail:Source role': 'Operations desk', 'detail:Created': '2026-02-02 09:00:00 UTC', 'detail:Site': 'Unit 8, Example Centre',
    });
    expect(renderTemplate('{{title}} / {{folder}} / {{unknown}} / {{toString}}', { title: '$&', folder: '002' })).toBe('$& / 002 / {{unknown}} / {{toString}}');
    expect(templateVars({ ...visible, history: { ...visible.history, events: [] } }).lastAt).toBe('');
  });
});

describe('applyEdits and remapSpec', () => {
  it('appends with a 45 minute default and templates both bodies and field values', () => {
    const before = structuredClone(visible);
    const edited = applyEdits(visible, [{ op: 'append_event', event: draft }]);
    expect(visible).toEqual(before);
    expect(edited.raw.history.events.at(-1)).toEqual({ number: '006', at: '2026-02-02 10:45:00 UTC',
      fields: [{ key: 'Channel', value: 'Email' }, { key: 'From', value: 'Operations desk' }, { key: 'To', value: 'Party 001' }],
      body: `New request for ${visible.index.title} at 2026-02-02 10:00:00 UTC. Keep {{unknown}}.`,
    });
    expect(edited.renumbering).toEqual({ '001': '001', '002': '002', '003': '003', '004': '004', '005': '005' });
    expect(edited.raw.history.preamble).toBe('Total events: 6');
    expect(remapSpec(suite.scenarios[0]!, edited.renumbering).cutAfter).toBe('006');
  });

  it('honours explicit times, combines inserts and removals, and maps only original events', () => {
    const edits: CaseEdit[] = [
      { op: 'insert_event', before: '003', event: { ...draft, at: '2026-02-02 09:20:00 UTC' } },
      { op: 'remove_event', number: '005' },
      { op: 'append_event', event: { ...draft, at: '2026-02-02 11:00:00 UTC' } },
    ];
    const edited = applyEdits(visible, edits);
    expect(edited.raw.history.events.map((event) => event.number)).toEqual(['001', '002', '003', '004', '005', '006']);
    expect(edited.raw.history.events[2]?.at).toBe('2026-02-02 09:20:00 UTC');
    expect(edited.renumbering).toEqual({ '001': '001', '002': '002', '003': '004', '004': null, '005': '005' });
    const spec = structuredClone(suite.scenarios[0]!);
    spec.rubric[0]!.evidence = ['event-003', 'history.md#event-004', 'FX-001:event-005', 'note-01.txt', 'event-999'];
    spec.rubric[0]!.check = { type: 'cites_any', refs: ['event-003', 'event-004', 'index:initial-request'] };
    const before = structuredClone(spec);
    const remapped = remapSpec(spec, edited.renumbering);
    expect(spec).toEqual(before);
    expect(remapped.cutAfter).toBe('006');
    expect(remapped.rubric[0]!.evidence).toEqual(['event-004', 'FX-001:event-005', 'note-01.txt', 'event-999']);
    expect(remapped.rubric[0]!.check).toEqual({ type: 'cites_any', refs: ['event-004', 'index:initial-request'] });
  });

  it('remaps every reference occurrence and handles a plain original-number map', () => {
    const spec = specAt('005');
    spec.rubric[0]!.evidence = ['event-002 and event-003', 'event-001 and event-004', 'event-0012'];
    const numbers = { '001': '002', '002': '003', '003': '004', '004': null, '005': '005' };
    const before = structuredClone(numbers);
    expect(remapSpec(spec, numbers).rubric[0]!.evidence).toEqual(['event-003 and event-004', 'event-0012']);
    expect(numbers).toEqual(before);
    expect(remapSpec(spec, numbers).cutAfter).toBe('005');
  });

  it('replaces literal text in one event, Initial request, and all section and event bodies', () => {
    visible.history.events[0]!.body = 'token token';
    visible.index.sections[0]!.body = 'token token';
    const one = applyEdits(visible, [{ op: 'replace_text', in: 'event', number: '001', find: 'token', replace: 'changed' }]).raw;
    expect(one.history.events[0]?.body).toBe('changed changed');
    expect(one.index.sections[0]?.body).toBe('token token');
    const initial = applyEdits(visible, [{ op: 'replace_text', in: 'initial_request', find: 'token', replace: '{{folder}}' }]).raw;
    expect(initial.index.sections[0]?.body).toBe('001 001');
    expect(initial.history.events[0]?.body).toBe('token token');
    visible.index.sections.push({ heading: 'Other', body: 'token' });
    const all = applyEdits(visible, [{ op: 'replace_text', in: 'any', find: 'token', replace: 'changed' }]).raw;
    expect(all.index.sections[0]?.body).toBe('changed changed');
    expect(all.index.sections.at(-1)?.body).toBe('changed');
    expect(all.history.events[0]?.body).toBe('changed changed');
  });

  it('sets or appends details with a case-insensitive key match', () => {
    const { raw } = applyEdits(visible, [{ op: 'set_detail', key: 'site', value: 'Job {{folder}}' }, { op: 'set_detail', key: 'New key', value: 'New value' }]);
    expect(raw.index.details.filter((detail) => detail.key.toLowerCase() === 'site')).toEqual([{ key: 'Site', value: 'Job 001' }]);
    expect(raw.index.details.at(-1)).toEqual({ key: 'New key', value: 'New value' });
  });

  it('rejects missing visible edit targets and a missing event replacement number', () => {
    expect(() => applyEdits(visible, [{ op: 'insert_event', before: '999', event: draft }])).toThrow('visible event 999 does not exist');
    expect(() => applyEdits(visible, [{ op: 'remove_event', number: '999' }])).toThrow('visible event 999 does not exist');
    expect(() => applyEdits(visible, [{ op: 'replace_text', in: 'event', find: 'a', replace: 'b' }])).toThrow('requires an event number');
    expect(() => applyEdits(visible, [{ op: 'replace_text', in: 'event', number: '999', find: 'a', replace: 'b' }])).toThrow('visible event 999 does not exist');
  });

  it('supports insertion before the first event, removing all events and appending afterwards', () => {
    const inserted = applyEdits(visible, [{ op: 'insert_event', before: '001', event: { ...draft, at: '2026-02-02 08:45:00 UTC' } }]);
    expect(inserted.renumbering['001']).toBe('002');
    expect(applyEdits(visible, [{ op: 'insert_event', before: '001', event: draft }]).raw.history.events[0]?.at).toBe('2026-02-02 08:15:00 UTC');
    expect(applyEdits(visible, [{ op: 'insert_event', before: '003', event: draft }]).raw.history.events[2]?.at).toBe('2026-02-02 10:00:00 UTC');
    const one = { ...visible, history: { ...visible.history, events: [visible.history.events[0]!] } };
    const empty = applyEdits(one, [{ op: 'remove_event', number: '001' }]);
    expect(empty.renumbering).toEqual({ '001': null });
    expect(remapSpec(specAt('001'), empty.renumbering).cutAfter).toBe('000');
    const appended = applyEdits(one, [{ op: 'remove_event', number: '001' }, { op: 'append_event', event: { ...draft, at: '2026-02-02 10:00:00 UTC' } }]);
    expect(appended.raw.history.events[0]?.number).toBe('001');
    expect(appended.renumbering).toEqual({ '001': null });
    expect(remapSpec(specAt('001'), appended.renumbering).cutAfter).toBe('001');
  });

  it('pads only short matching sender events reproducibly, with timestamps between neighbours', () => {
    const edit: CaseEdit = { op: 'pad_noise', count: 10, seed: 42 };
    const opts = { agentSenders: ['^OPERATIONS DESK$'] };
    visible.history.events[0]!.body = 'x'.repeat(301);
    const result = applyEdits(visible, [edit], opts);
    expect(applyEdits(visible, [edit], opts)).toEqual(result);
    expect(result.raw.history.events).toHaveLength(15);
    expect(new Set(result.raw.history.events.map((event) => event.number)).size).toBe(15);
    const originalNumbers = new Set(Object.values(result.renumbering));
    const added = result.raw.history.events.filter((event) => !originalNumbers.has(event.number));
    expect(added).toHaveLength(10);
    expect(added.every((event) => event.body === visible.history.events[3]!.body)).toBe(true);
    const times = result.raw.history.events.map((event) => event.at);
    expect(times).toEqual([...times].sort());
    expect(result.raw.history.preamble).toBe('Total events: 15');
    expect(applyEdits(visible, [{ ...edit, seed: 43 }], opts).raw).not.toEqual(result.raw);
    expect(applyEdits(visible, [edit], { ...opts, seed: 7 })).toEqual(applyEdits(visible, [{ ...edit, seed: 7 }], opts));
  });

  it('makes noise a no-op when there are no sender candidates or count is zero', () => {
    expect(applyEdits(visible, [{ op: 'pad_noise', count: 5, seed: 1 }]).raw).toEqual(visible);
    expect(applyEdits(visible, [{ op: 'pad_noise', count: 0, seed: 1 }], { agentSenders: ['desk'] }).raw).toEqual(visible);
    expect(applyEdits(visible, [{ op: 'pad_noise', count: 5, seed: 1 }], { agentSenders: ['^Nobody$'] }).raw).toEqual(visible);
  });

  it('keeps dollar sequences literal in text replacements and honours explicit template vars', () => {
    visible.history.events[0]!.body = 'token token';
    const result = applyEdits(visible, [{ op: 'replace_text', in: 'event', number: '001', find: 'token', replace: '$& {{name}}' }], { vars: { name: '$1' } });
    expect(result.raw.history.events[0]?.body).toBe('$& $1 $& $1');
  });

  it('does not parse an earlier timestamp when an explicit draft time is supplied', () => {
    visible.history.events.at(-1)!.at = 'An unparsed timestamp';
    expect(applyEdits(visible, [{ op: 'append_event', event: { ...draft, at: '2026-02-02 10:45:00 UTC' } }]).raw.history.events.at(-1)?.at)
      .toBe('2026-02-02 10:45:00 UTC');
  });

  it('keeps numbering metadata out of the original-event record and serialised continuation', () => {
    const result = applyEdits(visible, [{ op: 'append_event', event: draft }]);
    expect(Object.keys(result.renumbering)).toEqual(['001', '002', '003', '004', '005']);
    expect(JSON.parse(JSON.stringify(result.renumbering))).toEqual({ '001': '001', '002': '002', '003': '003', '004': '004', '005': '005' });
    expect(remapSpec(suite.scenarios[0]!, result.renumbering)).toEqual(remapSpec(suite.scenarios[0]!, result.renumbering));
  });
});

describe('toEscalationFormat', () => {
  it('sets Stage first, preserves other fields and positions Context and Decision required', async () => {
    const raw = cutCase(await readRawCase(join(FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER), '002'), specAt('002')).visible;
    const before = structuredClone(raw);
    const result = toEscalationFormat(raw, { context: 'New context', question: 'New question', agentSenders: suite.agentSenders });
    expect(raw).toEqual(before);
    expect(result.history.events.map((event) => event.fields[0])).toEqual([{ key: 'Stage', value: 'Context' }, { key: 'Stage', value: 'Escalation' }]);
    result.history.events.forEach((event, index) => expect(event.fields.slice(1)).toEqual(raw.history.events[index]!.fields.filter((field) => field.key !== 'Stage')));
    expect(result.history.preamble).toBe('All identities, records and communications are fictional. Total events: 2.');
    expect(result.index.details.filter((detail) => detail.key === 'Escalated')).toEqual([{ key: 'Escalated', value: '2026-02-04 09:10:00 UTC' }]);
    expect(result.index.sections.slice(0, 3)).toEqual([
      { heading: 'Context', body: 'New context' }, raw.index.sections.find((section) => section.heading === 'Initial request'),
      { heading: 'Decision required', body: 'New question' },
    ]);
    expect(toEscalationFormat(result, { context: 'New context', question: 'New question', agentSenders: [] })).toEqual(result);
  });

  it('adds Escalated and leaves existing sections in place when optional content is absent', () => {
    const result = toEscalationFormat(visible, { agentSenders: [] });
    expect(result.index.sections).toEqual(visible.index.sections);
    expect(result.index.details.at(-1)).toEqual({ key: 'Escalated', value: '2026-02-02 10:00:00 UTC' });
  });
});

describe.skipIf(!hasPublicData)('public attachment timing regression', () => {
  it('hides the unmentioned estimate and later invoice at event 038, unless explicitly included', async () => {
    const folders = (await publicFolders()).filter(({ folder }) => folder === '008');
    let target: typeof folders[number] | undefined;
    for (const candidate of folders) {
      const files = await readdir(join(candidate.trackDir, candidate.folder, 'attachments')).catch(() => [] as string[]);
      if (files.includes('attachment-02-estimate.pdf') && files.includes('attachment-04-invoice.pdf')) target = candidate;
    }
    expect(target).toBeDefined();
    const raw = await readRawCase(target!.trackDir, target!.folder);
    const spec = specAt('038');
    const { visible: cut, hidden } = cutCase(raw, spec);
    expect(cut.history.events).toHaveLength(38);
    expect(cut.history.preamble).toBe('Total events: 38');
    expect(cut.attachments.map((attachment) => attachment.fileName)).not.toContain('attachment-02-estimate.pdf');
    expect(cut.attachments.map((attachment) => attachment.fileName)).not.toContain('attachment-04-invoice.pdf');
    expect(hidden.attachments.map((attachment) => attachment.fileName)).toEqual(['attachment-02-estimate.pdf', 'attachment-04-invoice.pdf']);
    expect(cut.index.sections.map((section) => section.heading)).not.toContain('Overview');
    expect(cut.index.sections.map((section) => section.heading)).not.toContain('Outcome');
    expect(cut.index.details.map((detail) => detail.key)).not.toContain('Status');
    expect(cut.index.details.map((detail) => detail.key)).not.toContain('Updated');
    expect(cut.index.details.map((detail) => detail.key)).not.toContain('Completed');
    spec.attachments.include = ['attachment-02-estimate.pdf'];
    expect(cutCase(raw, spec).visible.attachments.map((attachment) => attachment.fileName)).toContain('attachment-02-estimate.pdf');
  });
});
