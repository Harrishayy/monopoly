'use client';

import { DIRECTIONS, useUi } from '@/state/ui';
import { SegmentedControl } from '@/ui';

/** Docket, Switchboard or Relay. Sets data-dir on <html> through the UI store. */
export function DirectionSwitcher() {
  const { direction, setDirection } = useUi();
  return (
    <SegmentedControl
      label="Design direction"
      value={direction}
      onChange={setDirection}
      options={DIRECTIONS.map((d) => ({
        value: d.id,
        label: (
          <>
            <span className="mr-1.5 font-mono text-[11px] opacity-70">{d.key}</span>
            {d.name}
          </>
        ),
      }))}
    />
  );
}
