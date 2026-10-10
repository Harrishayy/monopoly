import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import type { Attachment } from '../types';

const TEXT_EXT = new Set(['txt', 'md', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'eml', 'log', 'yaml', 'yml', 'ics']);
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
/** Per-attachment cap on text kept for the model. */
export const ATTACHMENT_TEXT_CAP = 20_000;

export async function readAttachment(path: string, name: string, id: string): Promise<{ attachment: Attachment; anomaly?: string }> {
  const ext = extname(name).slice(1).toLowerCase();
  const bytes = (await stat(path)).size;
  try {
    if (TEXT_EXT.has(ext)) {
      const text = (await readFile(path, 'utf8')).replace(/<script[\s\S]*?<\/script>/gi, '');
      return { attachment: { id, name, kind: 'text', path, text: cap(text), bytes } };
    }
    if (ext === 'pdf') {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(await readFile(path)));
      const { text } = await extractText(pdf, { mergePages: true });
      const t = (Array.isArray(text) ? text.join('\n') : text).trim();
      return {
        attachment: { id, name, kind: 'pdf', path, text: cap(t), bytes },
        anomaly: t ? undefined : `${name}: PDF has no extractable text (scanned?).`,
      };
    }
    if (IMAGE_TYPES[ext]) {
      return { attachment: { id, name, kind: 'image', path, mediaType: IMAGE_TYPES[ext], bytes } };
    }
    // Unknown binary: try it as text if it looks like text, else record it by name only.
    const buf = await readFile(path);
    const sample = buf.subarray(0, 2000);
    const printable = sample.filter((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128).length;
    if (sample.length && printable / sample.length > 0.95) {
      return { attachment: { id, name, kind: 'text', path, text: cap(buf.toString('utf8')), bytes } };
    }
    return { attachment: { id, name, kind: 'other', path, bytes }, anomaly: `${name}: unsupported file type, recorded by name only.` };
  } catch (err) {
    return {
      attachment: { id, name, kind: 'other', path, bytes },
      anomaly: `${name}: could not be read (${err instanceof Error ? err.message : String(err)}).`,
    };
  }
}

const cap = (t: string) => (t.length > ATTACHMENT_TEXT_CAP ? `${t.slice(0, ATTACHMENT_TEXT_CAP)}\n[… truncated, ${t.length - ATTACHMENT_TEXT_CAP} more characters]` : t);
