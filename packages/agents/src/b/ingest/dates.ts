/** Lenient date parsing for case records. Returns ISO strings in UTC, or undefined. */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const ISO_LIKE = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*(UTC|GMT|Z|[+-]\d{2}:?\d{2})?/i;
const DMY = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const D_MONTH_Y = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})(?:,?\s+(?:at\s+)?(\d{1,2}):(\d{2}))?/i;
const MONTH_D_Y = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i;

function iso(y: number, mo: number, d: number, h = 0, mi = 0, s = 0, tz?: string): string | undefined {
  if (mo < 0 || mo > 11 || d < 1 || d > 31 || h > 23 || mi > 59) return undefined;
  let t = Date.UTC(y, mo, d, h, mi, s);
  if (tz && /^[+-]/.test(tz)) {
    const sign = tz.startsWith('-') ? -1 : 1;
    const digits = tz.replace(/[^\d]/g, '');
    t -= sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || 0)) * 60_000;
  }
  const date = new Date(t);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** First full date (with optional time) found in the text. */
export function parseDate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  let m = text.match(ISO_LIKE);
  if (m) return iso(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0), m[7]?.toUpperCase());
  m = text.match(D_MONTH_Y);
  if (m) return iso(+m[3]!, MONTHS[m[2]!.toLowerCase().slice(0, 3)]!, +m[1]!, +(m[4] ?? 0), +(m[5] ?? 0));
  m = text.match(MONTH_D_Y);
  if (m) return iso(+m[3]!, MONTHS[m[1]!.toLowerCase().slice(0, 3)]!, +m[2]!);
  m = text.match(DMY);
  if (m) {
    // UK order (day first); two-digit years are 20xx.
    const y = m[3]!.length === 2 ? 2000 + +m[3]! : +m[3]!;
    return iso(y, +m[2]! - 1, +m[1]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  }
  return undefined;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export interface FoundDate {
  text: string;
  iso: string;
}

/**
 * Dates mentioned in free text, resolved against the time the text was written.
 * Covers full dates, "tomorrow", "next week" and weekday names ("on Monday").
 */
export function findDates(text: string, writtenAt?: string): FoundDate[] {
  const out: FoundDate[] = [];
  const seen = new Set<string>();
  const push = (t: string, i: string | undefined) => {
    if (i && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push({ text: t.trim(), iso: i });
    }
  };
  for (const re of [new RegExp(ISO_LIKE.source, 'gi'), new RegExp(D_MONTH_Y.source, 'gi'), new RegExp(MONTH_D_Y.source, 'gi'), new RegExp(DMY.source, 'g')]) {
    for (const m of text.matchAll(re)) push(m[0], parseDate(m[0]));
  }
  if (!writtenAt) return out;
  const base = new Date(writtenAt);
  const day = (n: number) => {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + n));
    return d.toISOString();
  };
  for (const m of text.matchAll(/\b(tomorrow|next week|end of (?:the )?week|end of (?:the )?day|today)\b/gi)) {
    const w = m[1]!.toLowerCase();
    const n = w === 'tomorrow' ? 1 : w === 'next week' ? 7 : w.startsWith('end of') && w.endsWith('week') ? (5 - base.getUTCDay() + 7) % 7 || 7 : 0;
    push(m[0], day(n));
  }
  for (const m of text.matchAll(/\b(?:on|by|until|till|from|next|this|after)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi)) {
    const target = WEEKDAYS.indexOf(m[1]!.toLowerCase());
    let n = (target - base.getUTCDay() + 7) % 7;
    if (n === 0 || /^next/i.test(m[0])) n += n === 0 ? 7 : 0;
    push(m[0], day(n));
  }
  return out;
}

export const DAY_MS = 86_400_000;
export const daysBetween = (a: string, b: string) => Math.round(((Date.parse(b) - Date.parse(a)) / DAY_MS) * 10) / 10;
