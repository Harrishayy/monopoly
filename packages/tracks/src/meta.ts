import type { TrackId, TrackMeta } from '@casework/core';

/**
 * Browser-safe track labels and vocabulary. Client components import this, never the packs.
 * Keep in sync with each pack's index.ts (the pack test checks this).
 */
export const TRACK_META: Record<TrackId, TrackMeta> = {
  claims: {
    id: 'claims',
    label: 'Insurance claims',
    vocabulary: { case: 'Claim', cases: 'Claims', customer: 'Policyholder', handler: 'Claims handler' },
  },
  property: {
    id: 'property',
    label: 'Property management',
    vocabulary: { case: 'Job', cases: 'Jobs', customer: 'Tenant', handler: 'Property manager' },
  },
  banking: {
    id: 'banking',
    label: 'Banking',
    vocabulary: { case: 'Case', cases: 'Cases', customer: 'Customer', handler: 'Case handler' },
  },
  logistics: {
    id: 'logistics',
    label: 'Delivery & logistics',
    vocabulary: { case: 'Delivery issue', cases: 'Delivery issues', customer: 'Recipient', handler: 'Support lead' },
  },
};

export const TRACK_IDS = Object.keys(TRACK_META) as TrackId[];
