'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { OutboundStatus, OutboundView } from '@/lib/api-types';
import { Button, Input, RelativeTime, StatusChip, Textarea, toast, type ChipStatus } from '@/ui';

export const OUTBOUND_CHIP: Record<OutboundStatus, { status: ChipStatus; label: string }> = {
  sent: { status: 'resolved', label: 'Sent' },
  awaiting_approval: { status: 'escalated', label: 'Awaiting approval' },
  recorded: { status: 'new', label: 'Recorded' },
  rejected: { status: 'blocked', label: 'Rejected' },
  failed: { status: 'failed', label: 'Failed' },
  superseded: { status: 'new', label: 'Replaced' },
};

/** One proposed message: where it goes, why the gate held or sent it, and approve / reject for a person. */
export function OutboundCard({ o, onChanged, showCase, rows = 6 }: { o: OutboundView; onChanged?: (action?: 'approve' | 'reject') => void; showCase?: boolean; rows?: number }) {
  const [body, setBody] = useState(o.body);
  const [address, setAddress] = useState(o.address ?? '');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const open = o.status === 'awaiting_approval' || o.status === 'failed';
  const chip = OUTBOUND_CHIP[o.status];

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    try {
      await api(`/api/outbound/${encodeURIComponent(o.id)}`, { method: 'POST', json: { action, body: action === 'approve' && body !== o.body ? body : undefined, address: action === 'approve' && o.channel === 'email' && address.trim() && address.trim() !== o.address ? address.trim() : undefined } });
      toast.success(action === 'approve' ? 'Sent' : 'Rejected', { description: `${o.recipient}${address ? ` · ${address}` : ''}` });
    } catch (e) {
      toast.error(action === 'approve' ? 'Could not send' : 'Could not reject', { description: (e as Error).message });
    } finally {
      setBusy(null);
      onChanged?.(action);
    }
  }

  return (
    <article className="grid gap-2.5 rounded-ui-lg border-(length:--bw) border-line bg-surface p-3" aria-label={`Message to ${o.recipient}`}>
      <header className="flex flex-wrap items-center gap-2">
        <StatusChip status={chip.status} label={chip.label} size="sm" />
        <span className="text-[13px] font-semibold">To {o.recipient}</span>
        <span className="font-mono text-[11px] text-ink-2">
          {o.channel}
          {o.address ? ` · ${o.address}` : ''}
        </span>
        {showCase && (
          <Link href={`/cases/${encodeURIComponent(o.caseRef)}`} className="font-mono text-[11px] font-semibold text-accent underline">
            {o.caseRef}
          </Link>
        )}
        <RelativeTime at={o.sentAt ?? o.createdAt} className="ml-auto font-mono text-[11px] text-ink-2" />
      </header>
      {o.subject && <p className="text-[12.5px] text-ink-2">Subject: {o.subject}</p>}
      {o.why && (
        <p className="text-[12.5px] text-ink-2">
          <span className="font-semibold text-ink">{o.status === 'sent' ? 'Sent automatically: ' : 'Held: '}</span>
          {o.why}
        </p>
      )}
      {o.error && (
        <p role="alert" className="rounded-ui border border-dashed border-bad/60 p-2 text-[12.5px] text-bad">
          Delivery failed: {o.error}
        </p>
      )}
      {open ? (
        <>
          {o.channel === 'email' && (
            <Input label="To" type="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="name@example.com" hint={o.address ? undefined : 'Not on file. Add the address to send.'} />
          )}
          <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={rows} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" icon="propose" onClick={() => act('approve')} loading={busy === 'approve'} disabled={!!busy || !body.trim() || (o.channel === 'email' && !/^\S+@\S+\.\S+$/.test(address.trim()))}>
              {o.status === 'failed' ? 'Retry send' : 'Approve & send'}
            </Button>
            <Button size="sm" onClick={() => act('reject')} loading={busy === 'reject'} disabled={!!busy}>
              Reject
            </Button>
          </div>
        </>
      ) : (
        <p className="whitespace-pre-wrap rounded-ui bg-surface-2 p-2.5 text-[13px] [overflow-wrap:anywhere]">{o.body}</p>
      )}
    </article>
  );
}
