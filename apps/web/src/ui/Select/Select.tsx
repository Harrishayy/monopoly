'use client';

import * as S from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import { fieldClass } from '../Input';

export interface SelectProps<V extends string> {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
}

/** Pick one from a short list. Typeahead and arrow keys come from Radix. */
export function Select<V extends string>({ label, options, value, onChange, disabled, hideLabel, className }: SelectProps<V>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label id={id} className={cn('text-[13px] font-semibold', hideLabel && 'sr-only')}>
        {label}
      </label>
      <S.Root value={value} onValueChange={(v) => onChange(v as V)} disabled={disabled}>
        <S.Trigger aria-labelledby={id} className={cn(fieldClass, 'justify-between text-left focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50')}>
          <S.Value />
          <S.Icon>
            <ChevronDown size={16} className="text-ink-2" aria-hidden />
          </S.Icon>
        </S.Trigger>
        <S.Portal>
          <S.Content position="popper" sideOffset={4} className="z-(--z-dialog) min-w-(--radix-select-trigger-width) overflow-hidden rounded-ui border-(length:--bw) border-line-strong bg-surface p-1 shadow-ui">
            <S.Viewport>
              {options.map((o) => (
                <S.Item
                  key={o.value}
                  value={o.value}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-ui px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent-soft"
                >
                  <S.ItemText>{o.label}</S.ItemText>
                  <S.ItemIndicator>
                    <Check size={14} aria-hidden />
                  </S.ItemIndicator>
                </S.Item>
              ))}
            </S.Viewport>
          </S.Content>
        </S.Portal>
      </S.Root>
    </div>
  );
}
