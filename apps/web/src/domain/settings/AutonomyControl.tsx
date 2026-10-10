'use client';

import type { Autonomy } from '@casework/core';
import { SegmentedControl } from '@/ui';
import { AUTONOMY } from './autonomy';


/** Suggest, Ask first or Autonomous, with one sentence on what the selected level means. */
export function AutonomyControl({ value, onChange, size }: { value: Autonomy; onChange: (a: Autonomy) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="grid gap-1.5">
      <SegmentedControl
        label="Autonomy"
        size={size}
        value={value}
        onChange={onChange}
        options={(Object.keys(AUTONOMY) as Autonomy[]).map((a) => ({ value: a, label: AUTONOMY[a].label }))}
      />
      <p className="text-[12.5px] text-ink-2" aria-live="polite">
        {AUTONOMY[value].explain}
      </p>
    </div>
  );
}
