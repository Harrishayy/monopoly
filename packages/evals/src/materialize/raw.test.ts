import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER } from '../testing/fixtures';
import { extractAttachmentText, readRawCase, renderHistoryMd, renderIndexMd, writeRawCase } from './index';
import { hasPublicData, publicFolders, rawContent } from './test-helpers';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'casework-materialize-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('organiser markdown', () => {
  it.each(['001', '002'])('preserves headings, ordered fields, anchors and bodies for fixture %s', async (folder) => {
    const trackDir = join(FIXTURE_DATA_DIR, FIXTURE_TRACK_FOLDER);
    const raw = await readRawCase(trackDir, folder);
    expect(renderIndexMd(raw)).toBe(await readFile(join(trackDir, folder, 'index.md'), 'utf8'));
    expect(renderHistoryMd(raw)).toBe(await readFile(join(trackDir, folder, 'history.md'), 'utf8'));
    expect(raw.history.preamble).toContain(`Total events: ${raw.history.events.length}`);
    expect(raw.history.events.every((event) => !event.body.includes('<a id='))).toBe(true);
    const directory = await writeRawCase(raw, root);
    const again = await readRawCase(join(root, raw.trackFolder), folder);
    expect(rawContent(again)).toEqual(rawContent(raw));
    for (const attachment of raw.attachments) {
      expect(await readFile(join(directory, 'attachments', attachment.fileName))).toEqual(await readFile(attachment.sourcePath));
    }
  });

  it('keeps H2 markdown, quotes, links and field-like bullets inside an event body', async () => {
    const trackDir = join(root, 'Fixture Track');
    const dir = join(trackDir, '001');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.md'), '# Case 001: Neutral case\n\n## Case details\n\n- **Created:** today\n\n## Context\n\nA context.\n\n## Initial request\n\nA request.\n');
    const body = '## A body heading\n\n> A quote\n\n- **Body key:** Keep this\n\n[file](attachments/note.txt)';
    await writeFile(join(dir, 'history.md'), `# Case 001 history — Neutral case\n\nTotal events: 1\n\n<a id="event-001"></a>\n## 2026-02-02 09:00:00 UTC — event 001\n\n- **From:** Party\n\n${body}\n`);
    const raw = await readRawCase(trackDir, '001');
    expect(raw.history.events[0]?.body).toBe(body);
    expect(raw.index.sections.map((section) => section.heading)).toEqual(['Context', 'Initial request']);
    await writeRawCase(raw, join(root, 'copy'));
    expect(rawContent(await readRawCase(join(root, 'copy', raw.trackFolder), '001'))).toEqual(rawContent(raw));
  });
});

describe('attachment extraction', () => {
  it.each(['txt', 'csv', 'md', 'json', 'eml', 'TXT'])('reads %s as UTF-8 without trimming', async (extension) => {
    const path = join(root, `note.${extension}`);
    const text = '  Unicode café\nA second line.\n';
    await writeFile(path, text);
    expect(await extractAttachmentText(path)).toBe(text);
  });

  it('returns null for images, unknown formats, unreadable files and malformed PDFs', async () => {
    for (const name of ['image.png', 'unknown.bin', 'invalid.pdf']) {
      const path = join(root, name);
      await writeFile(path, Buffer.from([0, 1, 255, 32]));
      expect(await extractAttachmentText(path)).toBeNull();
    }
    expect(await extractAttachmentText(join(root, 'missing.txt'))).toBeNull();
  });

  it('extracts readable PDF text using the shared loader settings', async () => {
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    const stream = 'BT /F1 12 Tf 20 200 Td (Neutral PDF text) Tj ET\n';
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`);
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const path = join(root, 'note.pdf');
    await writeFile(path, pdf);
    expect(await extractAttachmentText(path)).toBe('Neutral PDF text');
  });
});

describe.skipIf(!hasPublicData)('all public organiser folders', () => {
  it('round-trips every discovered case and copies all attachment bytes', async () => {
    const folders = await publicFolders();
    expect(folders.length).toBeGreaterThan(0);
    for (const { trackDir, folder } of folders) {
      const raw = await readRawCase(trackDir, folder);
      const history = await readFile(join(trackDir, folder, 'history.md'), 'utf8');
      expect(raw.history.events.length, `${trackDir}/${folder}`).toBe([...history.matchAll(/^## .+ — event \d+$/gm)].length);
      const directory = await writeRawCase(raw, root);
      const again = await readRawCase(join(root, raw.trackFolder), folder);
      expect(rawContent(again), `${trackDir}/${folder}`).toEqual(rawContent(raw));
      for (const attachment of raw.attachments) {
        expect(await readFile(join(directory, 'attachments', attachment.fileName))).toEqual(await readFile(attachment.sourcePath));
      }
    }
  }, 120_000);
});
