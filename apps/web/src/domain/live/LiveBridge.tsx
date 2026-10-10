'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useLiveSignal } from '@/lib/live';
import { toast } from '@/ui';

const FROM: Record<string, string> = { call: 'New call', email: 'New email', sms: 'New message', note: 'New report' };

/**
 * Mounted once in the shell. Toasts new calls and emails as they arrive and refreshes server-rendered
 * lists (the inbox) straight away. Client lists refresh themselves via `useApi(…, { live: true })`.
 */
export function LiveBridge() {
  const router = useRouter();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = () => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => router.refresh(), 250);
  };

  useLiveSignal((s) => {
    if (s.kind === 'case.opened') {
      toast(`${FROM[s.channel] ?? 'New case'} · ${s.caseRef}`, {
        description: s.title,
        duration: 15_000,
        action: { label: 'Open', onClick: () => router.push(`/cases/${encodeURIComponent(s.caseRef)}`) },
      });
    } else if (s.kind === 'outbound' && s.status === 'awaiting_approval') {
      toast.warning(`${s.caseRef}: reply waiting for approval`, {
        duration: 10_000,
        action: { label: 'Review', onClick: () => router.push(`/cases/${encodeURIComponent(s.caseRef)}`) },
      });
    } else if (s.kind === 'outbound' && s.status === 'sent') {
      toast.success(`${s.caseRef}: reply sent`);
    } else if (s.kind === 'outbound' && s.status === 'failed') {
      toast.error(`${s.caseRef}: reply failed to send`);
    }
    if (s.kind !== 'run.started') refresh();
  });
  return null;
}
