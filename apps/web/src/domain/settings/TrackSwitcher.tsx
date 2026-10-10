'use client';

import type { TrackId } from '@casework/core';
import { TRACK_IDS, TRACK_META } from '@casework/tracks/meta';
import { Tooltip } from '@/ui';

/**
 * Shows the active track. The server picks it from TRACK in .env, so this is read-only
 * unless `onChange` is passed (the design page uses that to swap vocabulary in samples).
 */
export function TrackSwitcher({ value, onChange }: { value: TrackId; onChange?: (t: TrackId) => void }) {
  if (!onChange)
    return (
      <Tooltip content="The server's active track. Change it with TRACK in .env.">
        <span tabIndex={0} className="hidden h-9 items-center rounded-ui border-(length:--bw) border-line px-2.5 text-[12.5px] font-semibold text-ink-2 md:inline-flex">
          {TRACK_META[value].label}
        </span>
      </Tooltip>
    );
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold">
      Track
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TrackId)}
        className="h-10 rounded-ui border-(length:--bw) border-line-strong bg-surface px-2 text-sm font-normal"
      >
        {TRACK_IDS.map((t) => (
          <option key={t} value={t}>
            {TRACK_META[t].label}
          </option>
        ))}
      </select>
    </label>
  );
}
