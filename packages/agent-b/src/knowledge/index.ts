import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const TRACK_LABELS: Record<string, string> = {
  property: 'property management (residential lettings maintenance)',
  insurance: 'insurance claims processing',
  banking: 'banking and financial services',
  logistics: 'delivery and logistics',
  _default: 'business operations',
};

const read = (track: string) => {
  const p = join(here, track, 'manual.md');
  return existsSync(p) ? readFileSync(p, 'utf8').trim() : undefined;
};

/**
 * The domain manual for the track (if one exists) plus the generic manual, which always applies.
 * AGENT_B_MANUALS=off drops both, to measure the agent on examples the manuals were learned from.
 */
export function manuals(track: string): { domain?: string; generic?: string } {
  if (process.env.AGENT_B_MANUALS === 'off') return {};
  return {
    domain: track === '_default' ? undefined : read(track),
    generic: read('_default'),
  };
}
