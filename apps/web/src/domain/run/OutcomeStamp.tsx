'use client';

import type { Outcome } from '@casework/core';
import { cn } from '@/lib/cn';

export const OUTCOME_LABEL: Record<Outcome, string> = {
  resolved: 'Step taken',
  escalated: 'Escalated',
  needs_info: 'Needs info',
  failed: 'Failed',
  declined: 'Declined',
};

/**
 * The final outcome of a run. Skinned per direction in stamp.css (Docket lands, Switchboard blinks, Relay pops).
 * `animateIn` only on the live running→completed transition, never on reload.
 */
export function OutcomeStamp({ outcome, animateIn, className }: { outcome?: Outcome; animateIn?: boolean; className?: string }) {
  if (!outcome)
    return (
      <span className="font-mono text-[12px] text-ink-2" aria-live="polite">
        Deciding…
      </span>
    );
  return (
    <span role="status" className={cn('stamp', `s-${outcome === 'declined' ? 'blocked' : outcome}`, animateIn && 'reveal', className)}>
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}
