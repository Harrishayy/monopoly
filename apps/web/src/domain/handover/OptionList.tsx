'use client';

import type { HandoverOption } from '@casework/core';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Button, Dialog, Icon } from '@/ui';

const EFFECT: Record<HandoverOption['effect'], string> = { reversible: 'Reversible', irreversible: 'Cannot be undone', pauses: 'Pauses the job' };

/** Choices for the person, recommended first. Irreversible ones ask for confirmation, repeating the effect. */
export function OptionList({ options, onChoose, chosenId, disabled, busyId }: { options: HandoverOption[]; onChoose: (o: HandoverOption) => void; chosenId?: string; disabled?: boolean; busyId?: string }) {
  const [confirm, setConfirm] = useState<HandoverOption | null>(null);
  return (
    <>
      <div className="grid gap-2" role="group" aria-label="Your options">
        {options.map((o) => {
          const chosen = o.id === chosenId;
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled || !!chosenId}
              aria-pressed={chosenId ? chosen : undefined}
              onClick={() => (o.effect === 'irreversible' ? setConfirm(o) : onChoose(o))}
              className={cn(
                'option flex cursor-pointer items-center justify-between gap-3 rounded-ui border-(length:--bw) border-line-strong bg-surface px-3.5 py-3 text-left text-[14px] font-semibold transition-[background-color,transform] duration-150 hover:bg-accent-soft disabled:cursor-not-allowed disabled:hover:bg-surface',
                o.recommended && 'border-accent',
                chosen && 's-resolved border-(--c) bg-(--c)/10 disabled:hover:bg-(--c)/10',
                chosenId && !chosen && 'opacity-50',
              )}
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {o.label}
                <small className={cn('mt-0.5 block font-mono text-[10.5px] font-medium uppercase tracking-[.06em] text-ink-2', o.recommended && 'text-accent')}>
                  {chosen ? 'Chosen' : o.recommended ? `Recommended · ${EFFECT[o.effect]}` : EFFECT[o.effect]}
                </small>
              </span>
              {busyId === o.id ? (
                <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" aria-label="Saving" />
              ) : (
                <Icon name={chosen ? 'check' : 'arrow'} size={16} className="shrink-0 text-ink-2" />
              )}
            </button>
          );
        })}
      </div>
      <Dialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="This can't be undone"
        description={confirm ? `You're about to: ${confirm.label}.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Go back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (confirm) onChoose(confirm);
                setConfirm(null);
              }}
            >
              {confirm?.label}
            </Button>
          </>
        }
      />
    </>
  );
}
