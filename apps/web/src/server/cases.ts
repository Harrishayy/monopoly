import 'server-only';
import type { Case, CaseSummary } from '@casework/core';
import { getPack } from '@casework/tracks';
import { ACTIVE_TRACK, DATA_DIR } from './config';

export async function listCases(track = ACTIVE_TRACK): Promise<Case[]> {
  return getPack(track).loadCases(DATA_DIR);
}

export async function getCase(ref: string, track = ACTIVE_TRACK): Promise<Case | undefined> {
  return (await listCases(track)).find((c) => c.ref === ref);
}

export function summarise(c: Case): CaseSummary {
  const { sources, ...rest } = c;
  const latest = [...sources].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  return { ...rest, channel: latest?.kind ?? 'note', updatedAt: latest?.receivedAt ?? new Date(0).toISOString() };
}
