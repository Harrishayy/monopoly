import type { TrackId, TrackPack } from '@casework/core';
import { pack as banking } from './banking';
import { pack as claims } from './claims';
import { pack as logistics } from './logistics';
import { pack as property } from './property';

/** Server-only registry. Client code imports '@casework/tracks/meta' instead. */
export const PACKS: Record<TrackId, TrackPack> = { claims, property, banking, logistics };

export function getPack(id: string): TrackPack {
  const pack = PACKS[id as TrackId];
  if (!pack) throw new Error(`Unknown track "${id}". Expected one of: ${Object.keys(PACKS).join(', ')}`);
  return pack;
}

export { TRACK_IDS, TRACK_META } from './meta';
