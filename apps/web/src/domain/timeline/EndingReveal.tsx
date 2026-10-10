'use client';

import { useState } from 'react';
import { Prose } from '@/domain/case';
import { Button } from '@/ui';

/** How an example case ended. Hidden by default: it is a spoiler for the step-through. */
export function EndingReveal({ ending }: { ending: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="grid gap-2 rounded-ui border-(length:--bw) border-dashed border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[14px] font-bold">How it ended</h2>
        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show how it ended'}
        </Button>
      </div>
      {open ? <Prose text={ending} /> : <p className="text-[12.5px] text-ink-2">Hidden so it doesn&apos;t colour your read of the agent. The agent never sees it.</p>}
    </section>
  );
}
