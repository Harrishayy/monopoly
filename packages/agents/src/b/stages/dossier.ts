import { readFile } from 'node:fs/promises';
import type Anthropic from '@anthropic-ai/sdk';
import { renderLedger } from '../facts/ledger';
import type { CaseEvent, CaseFile, Ledger } from '../types';

/** Above this many characters the oldest events are summarised (see `compactEvents`). */
export const DOSSIER_CHAR_BUDGET = 360_000;
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 3_500_000;

export function renderEvent(e: CaseEvent): string {
  const meta = Object.entries(e.fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
  return `[${e.id}] ${e.at ?? e.atRaw ?? 'undated'}${meta ? ` | ${meta}` : ''}\n${e.body || '(no body)'}`;
}

/**
 * The case as the model sees it. Every item carries the citation id the model must use.
 * `eventDigest` replaces the oldest events when the case is too large.
 */
export function renderDossier(c: CaseFile, ledger: Ledger, eventDigest?: { upTo: string; text: string }): string {
  const out: string[] = [];
  out.push(`CASE ${c.name}: ${c.title}`);
  out.push(`Decision moment (as-of): ${c.asOf}. Anything after this moment is unknown.`);
  out.push('', '== CASE RECORD ==');
  for (const s of c.sections) out.push(`[${s.id}] ${s.heading}\n${s.body}`, '');
  out.push(`== HISTORY (${c.events.length} events, oldest first) ==`);
  if (eventDigest) {
    out.push(`[DIGEST of events up to ${eventDigest.upTo}; cite the event ids it names]\n${eventDigest.text}`, '');
    const cutIdx = c.events.findIndex((e) => e.id === eventDigest.upTo);
    for (const e of c.events.slice(cutIdx + 1)) out.push(renderEvent(e), '');
  } else {
    for (const e of c.events) out.push(renderEvent(e), '');
  }
  if (c.attachments.length) {
    out.push('== ATTACHMENTS ==');
    for (const a of c.attachments) {
      if (a.kind === 'image') out.push(`[${a.id}] ${a.name} (image, shown separately)`);
      else if (a.text) out.push(`[${a.id}] ${a.name} (${a.kind})\n${a.text}`);
      else out.push(`[${a.id}] ${a.name} (${a.kind}, content not readable)`);
      out.push('');
    }
  }
  out.push('== COMPUTED FACTS (from the records by code; trust these over your own arithmetic) ==', renderLedger(ledger));
  if (c.anomalies.length) out.push('', '== INGEST NOTES (things that did not parse cleanly) ==', ...c.anomalies.map((a) => `- ${a}`));
  return out.join('\n');
}

/** Image attachments as content blocks, within size limits. */
export async function imageBlocks(c: CaseFile): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const a of c.attachments.filter((x) => x.kind === 'image' && x.bytes <= MAX_IMAGE_BYTES).slice(0, MAX_IMAGES)) {
    try {
      const data = (await readFile(a.path)).toString('base64');
      blocks.push({ type: 'text', text: `[${a.id}] ${a.name}:` });
      blocks.push({ type: 'image', source: { type: 'base64', media_type: a.mediaType as 'image/png', data } });
    } catch {
      /* Unreadable images are already listed by name in the dossier. */
    }
  }
  return blocks;
}

/** Content blocks shared by every stage: the dossier (cached) and any images. */
export async function caseContent(dossier: string, c: CaseFile): Promise<Anthropic.ContentBlockParam[]> {
  return [...(await imageBlocks(c)), { type: 'text', text: dossier, cache_control: { type: 'ephemeral' } }];
}
