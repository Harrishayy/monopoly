'use client';

import { Check, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

/** Copies a ref or payload. Shows "Copied" for 1.5s; says so if the clipboard is refused. */
export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1500);
  }
  const Icon = state === 'copied' ? Check : state === 'failed' ? X : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      className={cn('inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-ui px-2 text-[12.5px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink', className)}
    >
      <Icon size={14} aria-hidden />
      <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy blocked; select the text' : label}</span>
    </button>
  );
}
