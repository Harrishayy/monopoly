import type { CaseEvent } from '../types';
import { parseDate } from './dates';
import { cleanBody } from './markdown';

const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const EVENT_NO = /\bevent\s*#?\s*(\d{1,5})\b/i;
/** A line that starts with a timestamp, for histories written without headings. */
const DATED_LINE = /^\s*(?:[-*]\s+)?\**\[?(\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}[ ,]+\d{1,2}:\d{2})/;
/** Bold keys anywhere, plain keys only in a bullet list or when they are usual message headers. */
const FIELD = /^\s*(?:[-*+]\s+)?\*\*([^*\n]{1,40}?):?\*\*:?\s+(.*)$|^\s*[-*+]\s+([A-Za-z][\w /&-]{0,30}?):\s+(.*)$|^\s*(from|to|cc|channel|date|time|sent|subject|stage|type|via|sender|recipient)s?:\s+(.*)$/i;

const pick = (fields: Record<string, string>, re: RegExp) => {
  for (const [k, v] of Object.entries(fields)) if (re.test(k)) return v;
  return undefined;
};

export interface ParsedHistory {
  events: CaseEvent[];
  anomalies: string[];
}

/** Split a history document into events. Tolerates missing headings, numbers, dates and fields. */
export function parseHistory(text: string): ParsedHistory {
  const anomalies: string[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');

  const isEventHeading = (l: string) => {
    const h = l.match(HEADING);
    if (!h?.[1] || /^#\s/.test(l)) return false;
    return EVENT_NO.test(h[1]) || !!parseDate(h[1]);
  };
  let starts = lines.flatMap((l, i) => (isEventHeading(l) ? [i] : []));
  let headed = true;
  if (starts.length === 0) {
    starts = lines.flatMap((l, i) => (DATED_LINE.test(l) ? [i] : []));
    headed = false;
    if (starts.length) anomalies.push('History has no event headings; split on lines that start with a timestamp.');
  }
  if (starts.length === 0) {
    const body = cleanBody(lines.filter((l) => !/^#\s/.test(l)).join('\n'));
    if (!body) return { events: [], anomalies };
    anomalies.push('History could not be split into events; kept as one block.');
    return { events: [{ id: 'E001', n: 1, fields: {}, body }], anomalies };
  }

  const events: CaseEvent[] = [];
  starts.forEach((start, idx) => {
    const end = starts[idx + 1] ?? lines.length;
    const head = headed ? (lines[start]!.match(HEADING)?.[1] ?? '') : lines[start]!;
    const block = lines.slice(headed ? start + 1 : start, end);
    const fields: Record<string, string> = {};
    let i = 0;
    if (!headed) {
      // "2025-01-02 10:00 From: X To: Y" style: pull inline sender and recipient, keep the rest as body.
      let first = block[0]!.replace(DATED_LINE, '').replace(/^[\]*\s—–:-]+/, '');
      const ft = first.match(/^from:\s*(.+?)\s+to:\s*(.+?)\s*$/i);
      if (ft) {
        fields.from = ft[1]!.trim();
        fields.to = ft[2]!.trim();
        first = '';
      }
      block[0] = first;
    }
    // Leading `Key: value` lines are fields; the rest is the body.
    for (; i < block.length; i++) {
      const l = block[i]!;
      if (!l.trim() || /^<a\s+id=/i.test(l.trim())) continue;
      const m = l.match(FIELD);
      if (!m) break;
      const key = (m[1] ?? m[3] ?? m[5] ?? '').trim().toLowerCase();
      if (!key || key.length > 40) break;
      fields[key] = (m[2] ?? m[4] ?? m[6] ?? '').trim();
    }
    const body = cleanBody(block.slice(i).join('\n'));
    const nMatch = head.match(EVENT_NO);
    const n = nMatch ? Number(nMatch[1]) : null;
    const atRaw = headed ? head : lines[start]!.match(DATED_LINE)?.[1];
    const at = parseDate(atRaw) ?? parseDate(pick(fields, /^(date|time|timestamp|sent|received|at|when)$/));
    events.push({
      id: '',
      n,
      at,
      atRaw: atRaw?.trim(),
      fields,
      channel: pick(fields, /^(channel|medium|via|type|source)$/),
      from: pick(fields, /^(from|sender|author|by|caller)$/),
      to: pick(fields, /^(to|recipient|recipients)$/),
      body,
    });
  });

  // Stable citation ids: the event's own number when every event has a unique one, else position.
  const nums = events.map((e) => e.n);
  const unique = nums.every((n) => n !== null) && new Set(nums).size === nums.length;
  events.forEach((e, i) => {
    const n = unique ? e.n! : i + 1;
    if (!unique) e.n = e.n ?? i + 1;
    e.id = `E${String(n).padStart(3, '0')}`;
  });
  if (!unique) anomalies.push('Event numbers missing or repeated; events numbered by position.');
  const undated = events.filter((e) => !e.at).length;
  if (undated) anomalies.push(`${undated} event(s) have no parsable date.`);
  // Out-of-order timestamps are kept in document order but reported.
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1]!.at;
    const b = events[i]!.at;
    if (a && b && Date.parse(b) < Date.parse(a)) {
      anomalies.push(`Events out of time order at ${events[i]!.id}.`);
      break;
    }
  }
  return { events, anomalies };
}
