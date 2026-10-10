import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { extractText, getDocumentProxy } from 'unpdf';
import type { KeyValue, RawCase, RawEvent, RawHistory, RawIndex } from '../schema';
import { rememberFolder } from './state';

const FIELD = /^- \*\*([^*]+):\*\*[ \t]*(.*)$/;
const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.md', '.json', '.eml']);

function parseFields(body: string): KeyValue[] {
  return body.split('\n').flatMap((line) => {
    const match = line.match(FIELD);
    return match ? [{ key: match[1]!.trim(), value: match[2]!.trim() }] : [];
  });
}

function parseIndex(markdown: string): RawIndex {
  const h1 = markdown.match(/^# (.+)$/m)?.[1]?.trim();
  if (!h1) throw new Error('index.md is missing its case heading');
  const marks = [...markdown.matchAll(/^## (.+)$/gm)];
  const sections = marks.map((mark, i) => ({
    heading: mark[1]!.trim(),
    body: markdown.slice(mark.index + mark[0].length, marks[i + 1]?.index ?? markdown.length).trim(),
  }));
  return {
    h1, title: h1.replace(/^Case\s+\d+:\s*/, ''),
    details: sections.filter((section) => section.heading.toLowerCase() === 'case details').flatMap((section) => parseFields(section.body)),
    sections: sections.filter((section) => section.heading.toLowerCase() !== 'case details'),
  };
}

function parseHistory(markdown: string): RawHistory {
  const h1 = markdown.match(/^# (.+)$/m);
  if (!h1) throw new Error('history.md is missing its case heading');
  const marks = [...markdown.matchAll(/^## (.+?) — event (\d+)[ \t]*$/gm)];
  const starts = marks.map((mark) => {
    const anchor = markdown.slice(0, mark.index).match(/<a id="event-\d+"><\/a>[ \t]*\n$/);
    return anchor ? mark.index - anchor[0].length : mark.index;
  });
  const events = marks.map((mark, i) => {
    const lines = markdown.slice(mark.index + mark[0].length, starts[i + 1] ?? markdown.length).trim().split('\n');
    const fields: KeyValue[] = [];
    let line = 0;
    while (line < lines.length) {
      const match = lines[line]!.match(FIELD);
      if (!match) break;
      fields.push({ key: match[1]!.trim(), value: match[2]!.trim() });
      line++;
    }
    return { number: mark[2]!, at: mark[1]!, fields, body: lines.slice(line).join('\n').trim() };
  });
  return { h1: h1[1]!.trim(),
    preamble: markdown.slice(h1.index! + h1[0].length, starts[0] ?? markdown.length).trim(), events,
  };
}

/** Read an organiser case folder without discarding its raw fields. */
export async function readRawCase(trackDir: string, folder: string): Promise<RawCase> {
  const caseDir = resolve(trackDir, folder);
  const [index, history, entries] = await Promise.all([
    readFile(join(caseDir, 'index.md'), 'utf8'), readFile(join(caseDir, 'history.md'), 'utf8'),
    readdir(join(caseDir, 'attachments'), { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    }),
  ]);
  const files = entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.')).map((entry) => entry.name).sort();
  const raw: RawCase = { trackFolder: basename(resolve(trackDir)), folder,
    index: parseIndex(index.replace(/\r\n/g, '\n')), history: parseHistory(history.replace(/\r\n/g, '\n')),
    attachments: await Promise.all(files.map(async (fileName) => {
      const sourcePath = join(caseDir, 'attachments', fileName);
      return { fileName, sourcePath, text: await extractAttachmentText(sourcePath) };
    })),
  };
  rememberFolder(raw, caseDir);
  return raw;
}

/** Write a raw case under the supplied root and return its case directory. */
export async function writeRawCase(raw: RawCase, rootDir: string): Promise<string> {
  const caseDir = resolve(rootDir, raw.trackFolder, raw.folder);
  const attachmentDir = join(caseDir, 'attachments');
  await mkdir(attachmentDir, { recursive: true });
  await Promise.all([
    writeFile(join(caseDir, 'index.md'), renderIndexMd(raw)),
    writeFile(join(caseDir, 'history.md'), renderHistoryMd(raw)),
    ...raw.attachments.map(async (attachment) => {
      if (basename(attachment.fileName) !== attachment.fileName) throw new Error(`Invalid attachment file name: ${attachment.fileName}`);
      const target = join(attachmentDir, attachment.fileName);
      if (resolve(attachment.sourcePath) !== target) await copyFile(attachment.sourcePath, target);
    }),
  ]);
  rememberFolder(raw, caseDir);
  return caseDir;
}

function renderFields(fields: KeyValue[]): string {
  return fields.map(({ key, value }) => `- **${key}:** ${value}`).join('\n');
}

/** Render the raw case index in organiser markdown format. */
export function renderIndexMd(raw: RawCase): string {
  return [`# ${raw.index.h1}`, `## Case details\n\n${renderFields(raw.index.details)}`,
    ...raw.index.sections.map(({ heading, body }) => `## ${heading}\n\n${body}`)].join('\n\n') + '\n';
}

/** Render one history event block (anchor, heading, fields and body) in organiser markdown format. */
export function renderEvent(event: RawEvent): string {
  return `<a id="event-${event.number}"></a>\n## ${event.at} — event ${event.number}\n\n${renderFields(event.fields)}\n\n${event.body}`;
}

/** Render the raw case history in organiser markdown format. */
export function renderHistoryMd(raw: RawCase): string {
  return [`# ${raw.history.h1}`, raw.history.preamble, ...raw.history.events.map(renderEvent)].filter(Boolean).join('\n\n') + '\n';
}

/** Extract readable attachment text, returning null when unavailable. */
export async function extractAttachmentText(path: string): Promise<string | null> {
  try {
    const extension = extname(path).toLowerCase();
    if (TEXT_EXTENSIONS.has(extension)) return await readFile(path, 'utf8');
    if (extension !== '.pdf') return null;
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(path)));
    try {
      const { text } = await extractText(pdf, { mergePages: true });
      return text.trim() || null;
    } finally {
      await pdf.loadingTask.destroy();
    }
  } catch {
    return null;
  }
}
