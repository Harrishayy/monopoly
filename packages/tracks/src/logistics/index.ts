import type { TrackPack } from '@casework/core';
import { TRACK_META } from '../meta';
import { loadJsonCases } from '../shared/loader';
import { policy } from './policy';
import { systemPrompt } from './prompt';
import { tools } from './tools';

export const pack: TrackPack = {
  ...TRACK_META.logistics,
  autonomy: 'ask_first',
  loadCases: (dataDir) => loadJsonCases(dataDir, 'logistics'),
  tools,
  policy,
  systemPrompt,
};
