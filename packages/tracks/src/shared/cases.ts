import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Case, type LoadCasesOptions, type Source, type SourceKind, type TrackId } from '@casework/core';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Loader for the organisers' case folders. Every track uses the same layout:
 *
 *   <root>/<Track Folder>/<nnn>/index.md      case details, initial request, (examples only) overview and outcome
 *   <root>/<Track Folder>/<nnn>/history.md    dated events: channel, from, to, body
 *   <root>/<Track Folder>/<nnn>/attachments/  pdf, png, csv, txt
 *
 * `root` may also be the track folder itself, so `--in` can point at either level.
 */

export interface CaseFolderSpec {
  track: TrackId;
  /** Folder name used by the organisers, e.g. the track's display name. */
  folder: string;
  /** Prefix for case refs, so numbers stay unique across tracks. */
  refPrefix: string;
}

/** Sections in example cases that describe what happened next. */
const OUTCOME_SECTIONS = ['overview', 'outcome', 'next action at escalation', 'boundaries and remaining work'];
/** Case details that give away the ending. */
const OUTCOME_DETAILS = ['status', 'updated', 'completed', 'escalated'];
/** Sections that only link to other files. */
const LINK_SECTIONS = ['history', 'attachments'];

export async function loadCaseFolders(root: string, spec: CaseFolderSpec, opts: LoadCasesOptions = {}): Promise<Case[]> {
  const dir = await resolveTrackDir(root, spec.folder);
  if (!dir) return [];
  const names = (await readdir(dir)).filter((n) => !n.startsWith('.')).sort();
  const cases: Case[] = [];
  for (const name of names) {
    if (!(await isFile(join(dir, name, 'index.md')))) continue;
    try {
      cases.push(await loadCaseFolder(join(dir, name), name, spec, opts));
    } catch (err) {
      console.warn(`[${spec.track}] skipped case ${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return cases;
}

async function resolveTrackDir(root: string, folder: string): Promise<string | undefined> {
  if (await isDir(join(root, folder))) return join(root, folder);
  // Pointed straight at a track folder: it holds <nnn>/index.md directly.
  const entries = await readdir(root).catch(() => [] as string[]);
  for (const e of entries) if (await isFile(join(root, e, 'index.md'))) return root;
  return undefined;
}

export async function loadCaseFolder(dir: string, name: string, spec: CaseFolderSpec, opts: LoadCasesOptions = {}): Promise<Case> {
  const withhold = opts.withhold ?? 'none';
  const index = parseIndex(await readFile(join(dir, 'index.md'), 'utf8'));
  const historyText = await readFile(join(dir, 'history.md'), 'utf8').catch(() => '');
  let events = parseHistory(historyText);

  if (withhold === 'outcomes') {
    // "Recorded action: [History event 003]" marks the escalation snapshot; keep only what came before it.
    const cut = index.sections.get('next action at escalation')?.match(/event[- ](\d+)/i)?.[1];
    if (cut) events = events.filter((e) => Number(e.number) < Number(cut));
  }

  const ref = `${spec.refPrefix}-${name}`;
  const created = toIso(index.details.get('created')) ?? events[0]?.at ?? new Date(0).toISOString();
  const sources: Source[] = [];

  const caseFile = [
    [...index.details]
      .filter(([k]) => !(withhold === 'outcomes' && OUTCOME_DETAILS.includes(k)))
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n'),
    ...[...index.sections]
      .filter(([k]) => !LINK_SECTIONS.includes(k) && !(withhold === 'outcomes' && OUTCOME_SECTIONS.includes(k)))
      .map(([k, v]) => `## ${index.headings.get(k) ?? k}\n\n${v}`),
  ]
    .filter(Boolean)
    .join('\n\n');
  sources.push({
    id: `${ref}:case`,
    kind: 'ticket',
    title: index.title || `Case ${name}`,
    receivedAt: created,
    body: caseFile,
    meta: { file: 'index.md' },
  });

  for (const e of events) {
    sources.push({
      id: `${ref}:event-${e.number}`,
      kind: channelKind(e.fields.get('channel')),
      title: `Event ${e.number} · ${e.fields.get('channel') ?? 'Unknown channel'} · ${e.fields.get('from') ?? 'Unknown sender'}`,
      receivedAt: e.at,
      body: e.body,
      meta: { file: 'history.md', anchor: `event-${e.number}`, ...Object.fromEntries(e.fields) },
    });
  }

  for (const file of await listAttachments(dir)) {
    sources.push({
      id: `${ref}:${file}`,
      kind: 'doc',
      title: file,
      receivedAt: created,
      body: await attachmentText(join(dir, 'attachments', file)),
      meta: { file: `attachments/${file}`, path: join(dir, 'attachments', file), ext: extname(file).slice(1).toLowerCase() },
    });
  }

  return Case.parse({
    ref,
    track: spec.track,
    title: index.title || `Case ${name}`,
    customer: { name: index.details.get('source role') ?? 'Unknown' },
    status: 'new',
    sources,
  });
}

// ---------------------------------------------------------------- parsing

interface ParsedIndex {
  title: string;
  /** Lower-cased "Case details" keys. */
  details: Map<string, string>;
  /** Lower-cased section heading → body. */
  sections: Map<string, string>;
  headings: Map<string, string>;
}

export function parseIndex(md: string): ParsedIndex {
  const title = md.match(/^#\s+(?:Case\s+\d+:\s*)?(.+)$/m)?.[1]?.trim() ?? '';
  const sections = new Map<string, string>();
  const headings = new Map<string, string>();
  for (const [heading, body] of splitSections(md, /^##\s+(.+)$/gm)) {
    const key = heading.toLowerCase();
    sections.set(key, body);
    headings.set(key, heading);
  }
  const details = new Map<string, string>();
  for (const m of (sections.get('case details') ?? '').matchAll(/^- \*\*([^*]+):\*\*\s*(.*)$/gm)) {
    details.set(m[1]!.trim().toLowerCase(), m[2]!.trim());
  }
  sections.delete('case details');
  return { title, details, sections, headings };
}

export interface HistoryEvent {
  number: string;
  at: string;
  /** Lower-cased field name → value, e.g. channel, from, to, stage. */
  fields: Map<string, string>;
  body: string;
}

export function parseHistory(md: string): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  for (const [heading, block] of splitSections(md, /^##\s+(.+)$/gm)) {
    const m = heading.match(/^(.+?)\s+—\s+event\s+(\d+)/i);
    if (!m) continue;
    const fields = new Map<string, string>();
    const lines = block.split('\n');
    let i = 0;
    for (; i < lines.length; i++) {
      const f = lines[i]!.match(/^- \*\*([^*]+):\*\*\s*(.*)$/);
      if (f) fields.set(f[1]!.trim().toLowerCase(), f[2]!.trim());
      else if (lines[i]!.trim() && fields.size) break;
    }
    const body = lines.slice(i).join('\n').replace(/<a id="[^"]*"><\/a>/g, '').trim();
    events.push({ number: m[2]!, at: toIso(m[1]) ?? new Date(0).toISOString(), fields, body });
  }
  return events;
}

function splitSections(md: string, re: RegExp): [string, string][] {
  const marks = [...md.matchAll(re)];
  return marks.map((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1]!.index! : md.length;
    return [m[1]!.trim(), md.slice(start, end).trim()];
  });
}

/** "2025-09-27 14:10:08 UTC" → ISO. */
function toIso(s: string | undefined): string | undefined {
  const m = s?.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
  if (!m) return undefined;
  const d = new Date(`${m[1]}T${m[2]!.length === 5 ? `${m[2]}:00` : m[2]}Z`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Channel names vary by track; keep the original in meta.channel. */
export function channelKind(channel: string | undefined): SourceKind {
  const c = (channel ?? '').toLowerCase();
  if (c.includes('email')) return 'email';
  if (c.includes('call')) return 'call';
  if (c.includes('sms') || c.includes('chat') || c.includes('message')) return 'sms';
  if (c.includes('portal') || c.includes('queue')) return 'ticket';
  if (c === 'update' || c === 'hold') return 'crm';
  return 'note';
}

// ---------------------------------------------------------------- attachments

async function listAttachments(dir: string): Promise<string[]> {
  const files = await readdir(join(dir, 'attachments')).catch(() => [] as string[]);
  return files.filter((f) => !f.startsWith('.')).sort();
}

const TEXT_EXT = new Set(['.txt', '.csv', '.md', '.json', '.eml']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

async function attachmentText(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();
  try {
    if (TEXT_EXT.has(ext)) return await readFile(path, 'utf8');
    if (ext === '.pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(await readFile(path)));
      const { text } = await extractText(pdf, { mergePages: true });
      return text.trim() || '[PDF has no extractable text. It may be a scan.]';
    }
    if (IMAGE_EXT.has(ext)) return '[Image attachment. View the file at meta.path.]';
    return `[${ext.slice(1) || 'unknown'} attachment: not read]`;
  } catch (err) {
    return `[Could not read attachment: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

async function isDir(p: string) {
  return (await stat(p).catch(() => undefined))?.isDirectory() ?? false;
}
async function isFile(p: string) {
  return (await stat(p).catch(() => undefined))?.isFile() ?? false;
}
