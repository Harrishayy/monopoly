import type { MascotState } from '@casework/core';
import { Mascot } from '@/domain/mascot';

interface EmptyStateProps {
  title: string;
  body: React.ReactNode;
  mascot?: MascotState;
  action?: React.ReactNode;
}

/** Says what will appear here and how to make it appear. */
export function EmptyState({ title, body, mascot = 'idle', action }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-16 text-center">
      <Mascot state={mascot} size={88} decorative />
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="max-w-prose text-sm text-ink-2">{body}</div>
      {action}
    </div>
  );
}
