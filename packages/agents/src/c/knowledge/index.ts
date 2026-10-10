import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { systemPrompt } from '../../b/stages/prompts';

const here = dirname(fileURLToPath(import.meta.url));

/** Agent C's refinements to the track manual, if the track has any. AGENT_C_ADDENDUM=off drops them. */
export function addendum(track: string): string | undefined {
  if (process.env.AGENT_C_ADDENDUM === 'off') return undefined;
  const p = join(here, `${track}.md`);
  return existsSync(p) ? readFileSync(p, 'utf8').trim() : undefined;
}

/** B's system prompt plus C's addendum; shared by every C stage so it stays cached. */
export function systemPromptC(track: string): string {
  const extra = addendum(track);
  return extra ? `${systemPrompt(track)}\n\n=== REFINEMENTS TO THE DOMAIN MANUAL (these win where they differ) ===\n${extra}` : systemPrompt(track);
}
