import type { TrackPack } from '@casework/core';
import { TRACK_META } from '../meta';
import { loadCaseFolders } from '../shared/cases';
import { policy } from './policy';
import { systemPrompt } from './prompt';
import { tools } from './tools';

/** Where the organisers' cases for this track live: <dataDir>/Property Management/<nnn>/index.md */
export const cases = { track: 'property', folder: 'Property Management', refPrefix: 'PM' } as const;

export const pack: TrackPack = {
  ...TRACK_META.property,
  autonomy: 'ask_first',
  loadCases: (dataDir, opts) => loadCaseFolders(dataDir, cases, opts),
  tools,
  policy,
  systemPrompt,
};
