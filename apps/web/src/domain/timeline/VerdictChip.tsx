import type { Verdict } from '@/lib/api-types';
import { StatusChip } from '@/ui';

const MAP: Record<Verdict, { status: 'resolved' | 'failed' | 'escalated' | 'blocked'; label: string }> = {
  accepted: { status: 'resolved', label: 'Accepted' },
  prohibited: { status: 'failed', label: 'Prohibited' },
  missed: { status: 'escalated', label: 'Missed' },
  unlabelled: { status: 'blocked', label: 'Unlabelled' },
};

/** How the agent's choice compares with the labelled answer for that point in the history. */
export function VerdictChip({ verdict, size }: { verdict: Verdict; size?: 'sm' | 'md' }) {
  const m = MAP[verdict];
  return <StatusChip status={m.status} label={m.label} size={size} />;
}
