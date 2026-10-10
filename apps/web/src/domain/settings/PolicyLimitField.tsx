'use client';

import { useState } from 'react';
import { Mono, MoneyInput, StatusChip } from '@/ui';

export interface PolicyLimit {
  id: string;
  describe: string;
  appliesTo: string[];
  pence: number;
}

/**
 * Edits one spend limit. Edits here are a local preview only: the limit the agent enforces
 * lives in the pack's policy rules, so the copy says so instead of pretending to save.
 */
export function PolicyLimitField({ rule, onChange, state: forced }: { rule: PolicyLimit; onChange?: (pence: number) => void; state?: 'default' | 'edited' | 'error' }) {
  const [pence, setPence] = useState(rule.pence);
  const edited = forced === 'edited' || pence !== rule.pence;
  return (
    <div className="grid gap-2 rounded-ui-lg border-(length:--bw) border-line bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Mono className="text-[12px]">{rule.id}</Mono>
        {edited && <StatusChip status="needs_info" size="sm" label="Preview only" />}
      </div>
      <p className="text-[13px] text-ink-2">{rule.describe}</p>
      <MoneyInput
        label="Limit"
        valuePence={pence}
        onChange={(p) => {
          setPence(p);
          onChange?.(p);
        }}
        hint={edited ? 'Not saved. The enforced limit is set in the pack’s policy rules.' : `Gates ${rule.appliesTo.join(', ')}`}
      />
    </div>
  );
}
