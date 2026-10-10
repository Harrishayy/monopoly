import { cn } from '@/lib/cn';
import { Icon } from '@/ui';

export type RetryState = 'retrying' | 'recovered' | 'gave_up';

/** "Retry 2 of 3", "Recovered on attempt 2", "Gave up after 3". */
export function RetryBadge({ attempt, max = 3, state }: { attempt: number; max?: number; state: RetryState }) {
  const text = state === 'retrying' ? `Retry ${attempt} of ${max}` : state === 'recovered' ? `Recovered on attempt ${attempt}` : `Gave up after ${attempt}`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-ui border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold',
        state === 'retrying' && 's-escalated border-(--c)/40 text-(--c)',
        state === 'recovered' && 's-resolved border-(--c)/40 text-(--c)',
        state === 'gave_up' && 's-failed border-(--c)/40 bg-(--c)/10 text-(--c)',
      )}
    >
      <Icon name={state === 'gave_up' ? 'x' : 'retry'} size={12} />
      {text}
    </span>
  );
}
