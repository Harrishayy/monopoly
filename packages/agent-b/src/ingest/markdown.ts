/**
 * A markdown reader that assumes nothing about headings or field names.
 * Headings become sections; `- **Key:** value` and `- Key: value` lines become fields.
 */

export interface MdSection {
  heading: string;
  level: number;
  /** Raw text under the heading, up to the next heading of any level. */
  body: string;
  fields: { key: string; value: string }[];
}

export interface MdDoc {
  title: string;
  /** Text before the first heading. */
  preamble: MdSection;
  sections: MdSection[];
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const BOLD_FIELD = /^\s*(?:[-*+]\s+)?\*\*([^*\n]{1,60}?):?\*\*:?\s*(.*)$/;
const PLAIN_FIELD = /^\s*[-*+]\s+([A-Za-z][\w /&()'.-]{0,40}?):\s+(.+)$/;

export function parseFields(text: string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(BOLD_FIELD) ?? line.match(PLAIN_FIELD);
    if (m?.[1] && m[2] !== undefined) {
      const key = m[1].trim().replace(/:$/, '');
      const value = m[2].trim();
      if (key && value) out.push({ key, value });
    }
  }
  return out;
}

export function parseMarkdown(text: string): MdDoc {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const sections: MdSection[] = [];
  let title = '';
  let current: MdSection = { heading: '', level: 0, body: '', fields: [] };
  const preamble = current;
  let inFence = false;
  const flush = () => {
    current.body = current.body.trim();
    current.fields = parseFields(current.body);
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = inFence ? null : line.match(HEADING);
    if (h?.[1] && h[2]) {
      flush();
      const level = h[1].length;
      if (level === 1 && !title) {
        title = h[2].trim();
        // Text between the title and the first section belongs to the preamble.
        current = preamble;
        continue;
      }
      current = { heading: h[2].trim(), level, body: '', fields: [] };
      sections.push(current);
      continue;
    }
    current.body += line + '\n';
  }
  flush();
  return { title, preamble, sections };
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'section';

/** Strip HTML anchors and comments that carry no content. */
export const cleanBody = (s: string) =>
  s
    .replace(/<a\s+id="[^"]*"\s*><\/a>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
