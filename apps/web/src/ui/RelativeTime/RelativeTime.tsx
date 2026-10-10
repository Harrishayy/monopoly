'use client';

import { ago, utcStamp } from '@/lib/format';
import { useNow } from '@/lib/clock';

/** "4m", "2h", "3d" with the exact time on hover. Pass `absolute` for historical data (case events). */
export function RelativeTime({ at, absolute, className }: { at: string; absolute?: boolean; className?: string }) {
  const now = useNow();
  const full = utcStamp(at);
  return (
    <time dateTime={at} title={full} className={className}>
      {absolute || now === null ? full : ago(at, now)}
    </time>
  );
}
