'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button';

export interface AppError {
  /** What failed, e.g. "Couldn't load the jobs". */
  title: string;
  /** What to do about it. */
  detail?: string;
}

/** Says what failed and what to do. No apologies, no bare codes. */
export function ErrorState({ error, onRetry, retrying }: { error: AppError; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="s-failed grid justify-items-center gap-2 rounded-ui-lg border-(length:--bw) border-dashed border-(--c)/50 px-6 py-10 text-center">
      <AlertTriangle size={20} className="text-(--c)" aria-hidden />
      <h2 className="text-base font-bold">{error.title}</h2>
      {error.detail && <p className="max-w-prose text-[13.5px] text-ink-2">{error.detail}</p>}
      {onRetry && (
        <Button size="sm" onClick={onRetry} loading={retrying}>
          Try again
        </Button>
      )}
    </div>
  );
}
