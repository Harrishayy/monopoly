'use client';

import * as S from '@radix-ui/react-switch';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/** On or off setting. The whole row is clickable. */
export function Switch({ label, description, checked, onCheckedChange, disabled }: { label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-center justify-between gap-4 py-1', disabled && 'cursor-not-allowed opacity-50')}>
      <span className="grid">
        <span className="text-sm font-semibold">{label}</span>
        {description && <span className="text-[12.5px] text-ink-2">{description}</span>}
      </span>
      <S.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-6 w-10 shrink-0 rounded-full border-(length:--bw) border-line-strong bg-surface-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <S.Thumb className="block size-4 translate-x-1 rounded-full bg-ink transition-transform duration-300 ease-(--spring) data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-ink" />
      </S.Root>
    </label>
  );
}
