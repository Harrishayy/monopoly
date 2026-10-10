import type { Source } from '@casework/core';
import { KIND } from '@/domain/case/kinds';
import type { OutboundView } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { Button, Icon, RelativeTime, StatusChip } from '@/ui';
import { OUTBOUND_CHIP } from './OutboundCard';

/** Splits "Agent: …\nCaller: …" transcripts (optionally "[0:12] Agent: …") into turns; other lines stay as text. */
function turns(body: string): { who?: string; time?: string; text: string }[] {
  // Call bodies carry notes before the transcript ("Caller: Grace" is a field there, not a turn).
  const cut = body.search(/^Transcript:\s*$/m);
  if (cut > 0) {
    const head = body.slice(0, cut).trimEnd();
    return [{ text: head }, ...turns(body.slice(cut))];
  }
  const lines = body.split('\n');
  const re = /^(?:\[(\d+:\d{2})\]\s*)?(agent|user|caller|tenant|assistant|customer)\s*:\s*/i;
  if (lines.filter((l) => re.test(l)).length < 2) return [{ text: body }];
  const out: { who?: string; time?: string; text: string }[] = [];
  let inTurn = false;
  for (const l of lines) {
    const m = l.match(re);
    if (m) {
      out.push({ who: m[2]!.toLowerCase(), time: m[1], text: l.slice(m[0].length) });
      inTurn = true;
    } else if (inTurn && l.trim()) out[out.length - 1]!.text += `\n${l}`;
    else {
      inTurn = false;
      const last = out.at(-1);
      if (last && !last.who) last.text += `\n${l}`;
      else out.push({ text: l });
    }
  }
  return out.map((t) => (t.who ? t : { ...t, text: t.text.replace(/^\n+|\n+$/g, '') })).filter((t) => t.who || t.text.trim());
}

const AGENTISH = new Set(['agent', 'assistant']);

type Item = { at: string; kind: 'in'; s: Source } | { at: string; kind: 'out'; o: OutboundView };

/**
 * The whole thread on a live case, in time order: what came in (call transcripts as turns, emails,
 * portal reports), what the agency sent back, and drafts waiting for a person. Replaced drafts are
 * left out; the review tab still has them.
 */
export function Conversation({ sources, outbound = [], onReview }: { sources: Source[]; outbound?: OutboundView[]; onReview?: () => void }) {
  const items: Item[] = [
    ...sources.map((s) => ({ at: s.receivedAt, kind: 'in' as const, s })),
    ...outbound.filter((o) => o.status !== 'superseded').map((o) => ({ at: o.sentAt ?? o.createdAt, kind: 'out' as const, o })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  if (!items.length) return <p className="text-[13.5px] text-ink-2">No messages yet.</p>;
  return (
    <ol className="grid gap-3" aria-label="Conversation">
      {items.map((it) => (it.kind === 'in' ? <Inbound key={it.s.id} s={it.s} /> : <Outbound key={`${it.o.id}:${it.o.status}`} o={it.o} onReview={onReview} />))}
    </ol>
  );
}

function Inbound({ s }: { s: Source }) {
  const meta = s.meta as { name?: string; contact?: string; via?: string };
  const from = meta.name ?? meta.contact ?? 'Unknown';
  if (s.kind === 'crm') {
    return (
      <li className="rounded-ui-lg border-(length:--bw) border-dashed border-line px-3 py-2">
        <details>
          <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[12px] text-ink-2">
            <Icon name={KIND.crm.icon} size={14} />
            <span className="font-semibold text-ink">Directory record attached</span>
            <span className="truncate">{s.title}</span>
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-[13px] [overflow-wrap:anywhere]">{s.body}</p>
        </details>
      </li>
    );
  }
  return (
    <li className="mr-0 grid gap-2 rounded-ui-lg border-(length:--bw) border-line bg-surface p-3 sm:mr-10">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2">
        <Icon name={KIND[s.kind].icon} size={14} />
        <span className="font-semibold text-ink">{KIND[s.kind].label}</span>
        <span>
          from {from}
          {meta.contact && meta.name ? ` · ${meta.contact}` : ''}
        </span>
        {meta.via && <span className="font-mono text-[11px]">via {meta.via}</span>}
        <RelativeTime at={s.receivedAt} className="ml-auto font-mono text-[11px]" />
      </header>
      <p className="text-[13.5px] font-semibold">{s.title}</p>
      <div className="grid gap-1.5">
        {turns(s.body).map((t, i) =>
          t.who ? (
            <p key={i} className={`grid gap-0.5 rounded-ui px-2.5 py-1.5 text-[13.5px] ${AGENTISH.has(t.who) ? 'mr-8 bg-surface-2' : 'ml-8 bg-accent-soft'}`}>
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-2">
                {AGENTISH.has(t.who) ? 'Voice agent' : 'Caller'}
                {t.time && <span className="ml-1.5 font-normal normal-case tracking-normal">{t.time}</span>}
              </span>
              <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{t.text}</span>
            </p>
          ) : (
            <p key={i} className="whitespace-pre-wrap text-[13.5px] [overflow-wrap:anywhere]">
              {t.text}
            </p>
          ),
        )}
      </div>
    </li>
  );
}

function Outbound({ o, onReview }: { o: OutboundView; onReview?: () => void }) {
  const chip = OUTBOUND_CHIP[o.status];
  const waiting = o.status === 'awaiting_approval' || o.status === 'failed';
  const sent = o.status === 'sent';
  return (
    <li
      className={cn(
        'ml-0 grid gap-2 rounded-ui-lg border-(length:--bw) p-3 sm:ml-10',
        sent ? 'border-accent/35 bg-accent-soft' : waiting ? 'border-dashed border-line-strong bg-surface' : 'border-line bg-surface-2/60 opacity-80',
      )}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2">
        <Icon name={o.channel === 'email' ? KIND.email.icon : KIND.note.icon} size={14} />
        <span className="font-semibold text-ink">{sent ? 'Agency reply' : waiting ? 'Draft reply' : 'Draft'}</span>
        <span>
          to {o.recipient}
          {o.address ? ` · ${o.address}` : ''}
        </span>
        <StatusChip status={chip.status} label={chip.label} size="sm" />
        <RelativeTime at={o.sentAt ?? o.createdAt} className="ml-auto font-mono text-[11px]" />
      </header>
      {o.subject && <p className="text-[12.5px] text-ink-2">Subject: {o.subject}</p>}
      <p className={cn('whitespace-pre-wrap text-[13.5px] [overflow-wrap:anywhere]', !sent && !waiting && 'line-clamp-3')}>{o.body}</p>
      {o.error && <p className="text-[12.5px] text-bad">Delivery failed: {o.error}</p>}
      {waiting && onReview && (
        <div>
          <Button size="sm" variant="primary" icon="propose" onClick={onReview}>
            Review and send
          </Button>
        </div>
      )}
    </li>
  );
}
