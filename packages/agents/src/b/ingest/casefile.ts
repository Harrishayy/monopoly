import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import type { Attachment, CaseEvent, CaseFile, Field, Section } from '../types';
import { readAttachment } from './attachments';
import { parseDate } from './dates';
import { parseHistory, parseStructuredHistory } from './history';
import { cleanBody, parseMarkdown, slug } from './markdown';

export interface LoadOptions {
  /**
   * 'outcomes' hides how an example case ended (answer sections, completion fields, events from the recorded
   * action onwards). 'none' loads the case as supplied; a snapshot stated in the case is still honoured.
   */
  withhold?: 'none' | 'outcomes';
  /** Keep only events numbered below this (evaluation cut points). */
  cutBefore?: number;
  /** Force a track instead of detecting it. */
  track?: string;
}

/** Sections that give away the answer in example cases. */
const ANSWER_SECTION = /^(overview|outcome|resolution|next action|boundaries|remaining work|expected|answer|ground truth|solution)/i;
/** Case fields that give away the ending. */
const ANSWER_FIELD = /^(status|updated|completed|closed|resolved|escalated|resolution|outcome)$/i;
/** Files read as the case record or history; everything else in the folder is an attachment. */
const RECORD_FILE = /^(index|case|ticket|summary|details|readme)\.(md|markdown|txt)$/i;
const HISTORY_FILE = /^(history|events|timeline|log|conversation|thread|messages|activity)\.(md|markdown|txt|json|csv|tsv)$/i;

export async function loadCase(dir: string, opts: LoadOptions = {}): Promise<CaseFile> {
  const withhold = opts.withhold ?? 'none';
  const anomalies: string[] = [];
  const withheld: string[] = [];
  const files = (await readdir(dir, { withFileTypes: true })).filter((f) => !f.name.startsWith('.'));
  const fileNames = files.filter((f) => f.isFile()).map((f) => f.name).sort();

  const recordName = fileNames.find((n) => RECORD_FILE.test(n)) ?? fileNames.find((n) => /\.(md|markdown)$/i.test(n) && !HISTORY_FILE.test(n));
  const historyName = fileNames.find((n) => HISTORY_FILE.test(n));
  if (!recordName) anomalies.push('No case record file (index.md) found.');
  if (!historyName) anomalies.push('No history file found.');

  /* Case record ------------------------------------------------------ */
  const recordText = recordName ? await readFile(join(dir, recordName), 'utf8') : '';
  const doc = parseMarkdown(recordText);
  const fields: Field[] = [];
  const sections: Section[] = [];
  const usedIds = new Set<string>();
  const allSections = [doc.preamble, ...doc.sections].filter((s) => s.body || s.heading);
  for (const s of allSections) {
    const heading = s.heading || 'Case record';
    if (withhold === 'outcomes' && ANSWER_SECTION.test(heading)) {
      withheld.push(`Section "${heading}" (outcome of the example case)`);
      continue;
    }
    // Sections that only link to other files add nothing.
    if (/^(history|attachments)$/i.test(heading) && s.body.length < 400 && !s.fields.length) continue;
    let body = cleanBody(s.body);
    for (const f of s.fields) {
      if (withhold === 'outcomes' && ANSWER_FIELD.test(f.key)) {
        withheld.push(`Field "${f.key}"`);
        body = body
          .split('\n')
          .filter((l) => !l.toLowerCase().includes(`${f.key.toLowerCase()}:`))
          .join('\n');
        continue;
      }
      fields.push({ key: f.key, value: f.value, section: heading });
    }
    let id = `S:${slug(heading)}`;
    for (let k = 2; usedIds.has(id); k++) id = `S:${slug(heading)}-${k}`;
    usedIds.add(id);
    sections.push({ id, heading, body });
  }

  /* History ------------------------------------------------------------ */
  let events: CaseEvent[] = [];
  if (historyName) {
    const text = await readFile(join(dir, historyName), 'utf8');
    const ext = historyName.split('.').pop()!.toLowerCase();
    let parsed;
    try {
      parsed = ['json', 'csv', 'tsv'].includes(ext) ? parseStructuredHistory(text, ext) : parseHistory(text);
    } catch (e) {
      anomalies.push(`${historyName} could not be parsed as ${ext} (${e instanceof Error ? e.message : String(e)}); read as text.`);
      parsed = parseHistory(text);
    }
    events = parsed.events;
    anomalies.push(...parsed.anomalies);
  } else {
    // No history file: a dated log inside the record (e.g. "## Log", "## Timeline") is the history.
    const log = sections.find((s) => /log|timeline|history|activity|events|updates|notes/i.test(s.heading) && /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s.body));
    if (log) {
      const parsed = parseHistory(log.body);
      if (parsed.events.some((e) => e.at)) {
        events = parsed.events;
        anomalies.push(`History taken from the "${log.heading}" section of the case record (${events.length} entries).`);
      }
    }
  }
  if (!historyName && !recordName) anomalies.push('Case folder has neither record nor history; only attachments are available.');

  /* Snapshot ----------------------------------------------------------- */
  const caseText = recordText;
  const stated = statedSnapshot(caseText);
  const recorded = caseText.match(/recorded action:?\**\s*\[?[^\n\]]*?event[\s#-]*(\d+)/i)?.[1];
  let cut: number | undefined;
  let why = '';
  if (stated) {
    cut = stated + 1;
    why = `the case states the snapshot ends at event ${stated}`;
  } else if (recorded) {
    cut = Number(recorded);
    why = `the case records the next action as event ${recorded}`;
  }
  if (opts.cutBefore !== undefined && (cut === undefined || opts.cutBefore < cut)) {
    cut = opts.cutBefore;
    why = 'evaluation cut point';
  }
  // An attachment arrives with the first event that mentions it; remember that before cutting.
  const allEvents = events;
  const arrival = (file: string) => {
    const stem = basename(file).replace(/\.[^.]+$/, '').toLowerCase();
    return allEvents.find((e) => `${e.body}\n${Object.values(e.fields).join('\n')}`.toLowerCase().includes(stem))?.n ?? undefined;
  };
  if (cut !== undefined) {
    const before = events.length;
    events = events.filter((e) => e.n === null || e.n < cut!);
    if (events.length < before) withheld.push(`Events from ${cut} onwards (${before - events.length}), because ${why}`);
  }

  /* Attachments -------------------------------------------------------- */
  const attachments: Attachment[] = [];
  const attachmentPaths: { path: string; name: string }[] = [];
  for (const f of files) {
    if (f.isDirectory()) {
      for (const p of await walk(join(dir, f.name), 3)) attachmentPaths.push({ path: p, name: relative(dir, p) });
    } else if (f.name !== recordName && f.name !== historyName) {
      attachmentPaths.push({ path: join(dir, f.name), name: f.name });
    }
  }
  attachmentPaths.sort((a, b) => a.name.localeCompare(b.name));
  const visible = attachmentPaths.filter((a) => {
    const n = cut !== undefined ? arrival(a.name) : undefined;
    if (n !== undefined && n !== null && n >= cut!) {
      withheld.push(`Attachment ${a.name} (arrives with event ${n}, after the decision moment)`);
      return false;
    }
    return true;
  });
  for (const [i, a] of visible.entries()) {
    const { attachment, anomaly } = await readAttachment(a.path, a.name, `A${i + 1}`);
    attachments.push(attachment);
    if (anomaly) anomalies.push(anomaly);
  }

  /* Identity ----------------------------------------------------------- */
  const name = basename(dir);
  const created =
    parseDate(fields.find((f) => /^(created|opened|logged|raised|reported|received|submitted|date)/i.test(f.key) && parseDate(f.value))?.value) ??
    parseDate(fields.find((f) => parseDate(f.value))?.value);
  const lastAt = [...events].reverse().find((e) => e.at)?.at;
  const asOf = lastAt ?? created ?? new Date(0).toISOString();
  if (!lastAt && !created) anomalies.push('No dates anywhere in the case; elapsed-time facts are unavailable.');

  return {
    dir,
    name,
    track: opts.track ?? detectTrack(dir, recordText + '\n' + events.map((e) => e.body).join('\n')),
    title: doc.title || sections[0]?.heading || `Case ${name}`,
    fields,
    sections,
    events,
    attachments,
    anomalies,
    withheld,
    asOf,
  };
}

/** "The escalation snapshot comprises history events 001–002" → 2. */
function statedSnapshot(text: string): number | undefined {
  const m = text.match(/snapshot[^.\n]{0,40}?events?\s*(\d+)\s*(?:[–—-]|to|through|and)\s*(\d+)/i) ?? text.match(/snapshot[^.\n]{0,40}?(?:up to|until|through)\s*event\s*(\d+)/i);
  if (!m) return undefined;
  return Number(m[2] ?? m[1]);
}

async function walk(dir: string, depth: number): Promise<string[]> {
  if (depth < 0) return [];
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, depth - 1)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

const TRACK_HINTS: [string, RegExp, RegExp][] = [
  ['property', /property|letting|tenan|landlord|estate/i, /\b(tenant|landlord|letting|lettings|contractor|tenancy|check[- ]?out|inventory)\b/gi],
  ['insurance', /insur|claim/i, /\b(claim|policy|insurer|underwrit|excess|loss adjuster|broker|premium)\b/gi],
  ['banking', /bank|financ|payment/i, /\b(account|payment|transfer|card|bank|statement|direct debit|overdraft)\b/gi],
  ['logistics', /logist|deliver|parcel|shipping|courier/i, /\b(parcel|delivery|courier|shipment|tracking|depot|consignment|pickup)\b/gi],
];

/** Track from the folder path first, then from the words in the case. */
export function detectTrack(dir: string, text: string): string {
  for (const [track, pathRe] of TRACK_HINTS) if (pathRe.test(dir.split(/[\\/]/).slice(-2).join('/'))) return track;
  let best = '_default';
  let bestScore = 2;
  for (const [track, , wordRe] of TRACK_HINTS) {
    const score = text.match(wordRe)?.length ?? 0;
    if (score > bestScore) {
      best = track;
      bestScore = score;
    }
  }
  return best;
}

/** Folders under `root` that look like cases: they hold a record or history file, or files but no case subfolders. */
export async function findCaseDirs(root: string, depth = 4): Promise<string[]> {
  const st = await stat(root).catch(() => undefined);
  if (!st?.isDirectory()) return [];
  const entries = (await readdir(root, { withFileTypes: true })).filter((e) => !e.name.startsWith('.'));
  const names = entries.filter((e) => e.isFile()).map((e) => e.name);
  if (names.some((n) => RECORD_FILE.test(n) && !/^readme/i.test(n)) || names.some((n) => HISTORY_FILE.test(n))) return [root];
  if (depth === 0) return [];
  const out: string[] = [];
  for (const e of entries) {
    // Follow symlinked folders too (Dirent.isDirectory is false for a link).
    const isDir = e.isDirectory() || (e.isSymbolicLink() && (await stat(join(root, e.name)).catch(() => undefined))?.isDirectory());
    if (isDir && !/^attachments?$/i.test(e.name)) out.push(...(await findCaseDirs(join(root, e.name), depth - 1)));
  }
  // A leaf folder of loose files (no recognised names) is still a case, unless it only holds a README.
  if (!out.length && names.filter((n) => !/^readme/i.test(n)).length && depth < 4) return [root];
  return out.sort();
}
