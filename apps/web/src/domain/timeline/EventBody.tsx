'use client';

import { useState } from 'react';
import { Prose } from '@/domain/case';
import { cn } from '@/lib/cn';

/** A history event's text, clamped with a toggle when long. */
export function EventBody({ text, lines = 3 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 220 || text.split('\n').length > lines;
  return (
    <div className="min-w-0">
      <div className={cn(!open && long && 'overflow-hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent)]')} style={!open && long ? { maxHeight: `${lines * 1.65 + 0.2}em` } : undefined}>
        <Prose text={text} className="text-[13px]" />
      </div>
      {long && (
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-0.5 cursor-pointer text-[12px] font-semibold text-accent hover:underline">
          {open ? 'Show less' : 'Show all'}
        </button>
      )}
    </div>
  );
}
