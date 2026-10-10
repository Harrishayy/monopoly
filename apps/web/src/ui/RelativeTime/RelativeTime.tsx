'use client';

import { ago } from '@/lib/format';
import { useNow } from '@/lib/clock';

const exact = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

/** "4m", "2h", "3d" with the exact time on hover. Pass `absolute` for historical data (case events). */
export function RelativeTime({ at, absolute, className }: { at: string; absolute?: boolean; className?: string }) {
  const now = useNow();
  const full = `${exact.format(new Date(at))} UTC`;
  return (
    <time dateTime={at} title={full} className={className}>
      {absolute || now === null ? full : ago(at, now)}
    </time>
  );
}
