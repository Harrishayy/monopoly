'use client';

import type { Autonomy, TrackId } from '@casework/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Direction = 'docket' | 'switchboard' | 'relay';
export const DIRECTIONS: { id: Direction; name: string; key: string }[] = [
  { id: 'docket', name: 'Docket', key: 'A' },
  { id: 'switchboard', name: 'Switchboard', key: 'B' },
  { id: 'relay', name: 'Relay', key: 'C' },
];

export type InboxFilter = 'all' | 'open' | 'approval' | 'escalated' | 'resolved';

interface UiState {
  direction: Direction;
  /** Inbox filter, kept while moving between cases. */
  inboxFilter: InboxFilter;
  setInboxFilter: (f: InboxFilter) => void;
  track: TrackId;
  autonomy: Autonomy;
  setDirection: (d: Direction) => void;
  setTrack: (t: TrackId) => void;
  setAutonomy: (a: Autonomy) => void;
}

/** UI-only state. Server state (cases, runs) belongs in route handlers / React Query, not here. */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      direction: 'docket',
      inboxFilter: 'all',
      setInboxFilter: (inboxFilter) => set({ inboxFilter }),
      track: 'property',
      autonomy: 'ask_first',
      setDirection: (direction) => set({ direction }),
      setTrack: (track) => set({ track }),
      setAutonomy: (autonomy) => set({ autonomy }),
    }),
    {
      name: 'casework-ui',
      // localStorage can throw in private windows; fall back to memory.
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem('__t', '1');
          localStorage.removeItem('__t');
          return localStorage;
        } catch {
          const m = new Map<string, string>();
          return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
        }
      }),
    },
  ),
);
