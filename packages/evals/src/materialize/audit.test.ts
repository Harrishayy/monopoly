import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HiddenContinuation, LeakFinding, RawCase } from '../schema';
import { FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER } from '../testing/fixtures';
import { applyEdits, auditLeak, cutCase, readRawCase, writeRawCase } from './index';
import { continuation, hasPublicData, publicFolders, specAt, suite, visibleText } from './test-helpers';

let root: string;
let original: RawCase;
let visible: RawCase;
let hidden: HiddenContinuation;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'casework-audit-'));
  original = await readRawCase(join(FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER), '001');
  const cut = cutCase(original, suite.scenarios[0]!);
  visible = cut.visible;
  hidden = continuation(visible, cut.hidden);
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

function audit(text = visibleText(visible)) {
  return auditLeak({ visibleText: text, visible, original, hidden, spec: suite.scenarios[0]! });
}

describe('auditLeak', () => {
  it('accepts an accurate cut and retains audit input unchanged', () => {
    const before = structuredClone({ visible, original, hidden });
    expect(audit()).toEqual({ ok: true, findings: [] });
    expect({ visible, original, hidden }).toEqual(before);
  });

  const leaks: { kind: LeakFinding['kind']; modify: () => void }[] = [
    { kind: 'event_text', modify: () => { visible.history.events[0]!.body += '\n' + hidden.events.at(-1)!.body; } },
    { kind: 'attachment', modify: () => { visible.index.sections.find((section) => section.heading === 'Attachments')!.body += '\n- [quote-02.txt](attachments/quote-02.txt)'; } },
    { kind: 'section', modify: () => { visible.index.sections.push({ heading: 'oUtCoMe', body: 'Later information.' }); } },
    { kind: 'detail', modify: () => { visible.index.details.push({ key: 'uPdAtEd', value: 'Later time' }); } },
    { kind: 'event_count', modify: () => { visible.history.preamble = 'Total events: 8'; } },
    { kind: 'hidden_fact', modify: () => { visible.history.events[0]!.body += '\n24000 PENCE'; } },
  ];
  it.each(leaks)('catches $kind', ({ kind, modify }) => {
    modify();
    const result = audit();
    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.kind)).toContain(kind);
  });

  it('catches a later event heading independently of hidden text or the stated count', () => {
    expect(audit(visibleText(visible) + '\n## 2026-02-03 11:00:00 UTC — event 008\n').findings)
      .toContainEqual({ kind: 'event_count', detail: 'Event heading 008 is outside the visible event set' });
  });

  it('detects model events beyond the scenario cut even if the preamble was adjusted', () => {
    visible.history.events.push({ ...hidden.events[0]!, body: 'A short body.' });
    visible.history.preamble = 'Total events: 6';
    expect(audit().findings).toContainEqual({ kind: 'event_count', detail: 'Visible event 006 exceeds cutAfter 005' });
  });

  it('catches attachment lists, section headings and detail keys leaked only into supplied index text', () => {
    const text = visibleText(visible);
    for (const [kind, insertion] of [
      ['attachment', '## Attachments\n\n- [quote-02.txt](attachments/quote-02.txt)'],
      ['section', '## Outcome\n\nAn ending.'],
      ['detail', '- **Updated:** Later time'],
    ] as const) {
      const leaked = text.replace(`# ${visible.history.h1}`, `${insertion}\n\n# ${visible.history.h1}`);
      expect(audit(leaked).findings.some((finding) => finding.kind === kind)).toBe(true);
    }
  });

  it('exempts windows spanning original event metadata and bodies', () => {
    original.history.events[0]!.fields = [{ key: 'To', value: 'Party' }];
    original.history.events[0]!.body = 'A known request with a long description from the original case.';
    visible.history.events[0] = structuredClone(original.history.events[0]!);
    hidden.events = [{ ...hidden.events[0]!, body: 'Later reply mentioning y A known request with a long description.' }];
    expect(audit().findings.some((finding) => finding.kind === 'event_text')).toBe(false);
  });

  it('checks both supplied text and the case preamble for count mismatches or missing counts', () => {
    expect(audit(visibleText(visible).replace('Total events: 5', 'Total events: 99')).findings.some((finding) => finding.kind === 'event_count')).toBe(true);
    visible.history.preamble = 'No count';
    expect(audit().findings.some((finding) => finding.kind === 'event_count')).toBe(true);
  });

  it('catches attachment objects and files written into the visible folder', async () => {
    visible.attachments.push(original.attachments.find((attachment) => attachment.fileName === 'quote-02.txt')!);
    expect(audit().findings.some((finding) => finding.kind === 'attachment')).toBe(true);
    visible.attachments.pop();
    const directory = await writeRawCase(visible, root);
    await writeFile(join(directory, 'attachments/quote-02.txt'), 'Later proposal');
    expect(audit().findings.some((finding) => finding.kind === 'attachment')).toBe(true);
  });

  it('audits the written folder even when no visible attachment provides a path', async () => {
    const cut = cutCase(original, specAt('001'));
    visible = cut.visible;
    hidden = continuation(visible, cut.hidden);
    expect(visible.attachments).toHaveLength(0);
    const directory = await writeRawCase(visible, root);
    await writeFile(join(directory, 'attachments/quote-02.txt'), 'Later proposal');
    expect(audit().findings.some((finding) => finding.kind === 'attachment')).toBe(true);
  });

  it('normalises case and whitespace and finds partial text with sliding windows', () => {
    const fragment = hidden.events.at(-1)!.body.slice(19, 79).toUpperCase().replaceAll(' ', '\n   ');
    expect(audit(visibleText(visible) + '\n' + fragment).findings.some((finding) => finding.kind === 'event_text')).toBe(true);
  });

  it('detects exactly 40 normalised characters at every window offset and ignores shorter fragments', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    hidden.events = [{ ...hidden.events[0]!, body: text }];
    expect(audit(visibleText(visible) + '\n' + text.slice(7, 47)).findings.some((finding) => finding.kind === 'event_text')).toBe(true);
    expect(audit(visibleText(visible) + '\n' + text.slice(7, 46)).findings.some((finding) => finding.kind === 'event_text')).toBe(false);
  });

  it('exempts shared templates from all original visible sources, including sources changed by edits', () => {
    const common = 'This long template was already available at the original decision point.';
    original.history.events[0]!.body = common;
    hidden.events = [{ ...hidden.events[0]!, body: common + ' This hidden suffix must remain unavailable.' }];
    visible = applyEdits(visible, [{ op: 'replace_text', in: 'event', number: '001', find: 'Request description:', replace: 'Changed request:' }]).raw;
    expect(audit(visibleText(visible) + '\n' + common).findings.some((finding) => finding.kind === 'event_text')).toBe(false);
    original.history.events[0]!.body = 'A different body';
    original.index.sections.find((section) => section.heading === 'Initial request')!.body = common;
    expect(audit(visibleText(visible) + '\n' + common).findings.some((finding) => finding.kind === 'event_text')).toBe(false);
    original.index.sections.find((section) => section.heading === 'Initial request')!.body = 'A different request';
    original.attachments.find((attachment) => attachment.fileName === 'note-01.txt')!.text = common;
    expect(audit(visibleText(visible) + '\n' + common).findings.some((finding) => finding.kind === 'event_text')).toBe(false);
  });

  it('does not exempt text from removed sections or hidden attachment texts', () => {
    const common = 'This long private continuation states a distinctive result learned much later.';
    hidden.events = [{ ...hidden.events[0]!, body: common }];
    original.index.sections.find((section) => section.heading === 'Outcome')!.body = common;
    original.attachments.find((attachment) => attachment.fileName === 'quote-02.txt')!.text = common;
    expect(audit(visibleText(visible) + '\n' + common).findings.some((finding) => finding.kind === 'event_text')).toBe(true);
  });

  it('checks section headings and detail markup rather than ordinary mentions', () => {
    visible.history.events[0]!.body += '\nOutcome and Updated are ordinary words here. quote-02.txt is unavailable.';
    expect(audit()).toEqual({ ok: true, findings: [] });
  });
});

describe.skipIf(!hasPublicData)('public midpoint leak regression', () => {
  it('accepts a correct midpoint cut of every discovered public history', async () => {
    const folders = await publicFolders();
    expect(folders.length).toBeGreaterThan(0);
    for (const { trackDir, folder } of folders) {
      const raw = await readRawCase(trackDir, folder);
      const event = raw.history.events[Math.max(0, Math.floor(raw.history.events.length / 2) - 1)]!;
      const spec = specAt(event.number);
      const cut = cutCase(raw, spec);
      expect(auditLeak({ visibleText: visibleText(cut.visible), visible: cut.visible, original: raw,
        hidden: continuation(cut.visible, cut.hidden), spec }), `${trackDir}/${folder}`).toEqual({ ok: true, findings: [] });
    }
  }, 120_000);
});
