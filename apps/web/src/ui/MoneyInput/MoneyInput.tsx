'use client';

import { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import { Input } from '../Input';

/** "420", "£420", "420.00", "1,249.5" → integer pence, or null if it isn't money. */
export function parsePence(text: string): number | null {
  const t = text.replace(/[£,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Money entry. Stores integer pence and formats on blur. */
export function MoneyInput({ label, valuePence, onChange, hint, disabled }: { label: string; valuePence: number; onChange: (pence: number) => void; hint?: string; disabled?: boolean }) {
  const [text, setText] = useState(() => money(valuePence));
  const [error, setError] = useState<string>();
  useEffect(() => setText(money(valuePence)), [valuePence]);
  return (
    <Input
      label={label}
      hint={hint}
      error={error}
      disabled={disabled}
      inputMode="decimal"
      inputClassName="font-mono tabular-nums"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const p = parsePence(text);
        if (p === null) return setError('Enter an amount like 420 or £420.00');
        setError(undefined);
        onChange(p);
        setText(money(p));
      }}
    />
  );
}
