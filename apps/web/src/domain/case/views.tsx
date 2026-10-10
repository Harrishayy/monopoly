import type { Source } from '@casework/core';
import { KeyValue, RelativeTime } from '@/ui';
import { Prose } from './Prose';

const meta = (s: Source) => s.meta as Record<string, string | undefined>;

function Header({ s, extra }: { s: Source; extra?: { label: string; value: React.ReactNode; mono?: boolean }[] }) {
  const m = meta(s);
  return (
    <KeyValue
      className="mb-3"
      items={[
        ...(m.from ? [{ label: 'From', value: m.from }] : []),
        ...(m.to ? [{ label: 'To', value: m.to }] : []),
        { label: 'Received', value: <RelativeTime at={s.receivedAt} absolute />, mono: true },
        ...(extra ?? []),
      ]}
    />
  );
}

export interface Turn {
  speaker: string;
  text: string;
  atMs?: number;
}

/** "Name: words" lines become turns; anything else is one turn from the caller. */
export function turnsFrom(s: Source): Turn[] {
  const lines = s.body.split('\n').filter((l) => l.trim());
  const turns: Turn[] = [];
  for (const l of lines) {
    const m = l.match(/^\s*(?:\*\*)?([A-Z][\w .'-]{0,30}?)(?:\*\*)?:\s+(.+)$/);
    if (m) turns.push({ speaker: m[1]!, text: m[2]! });
    else if (turns.length) turns.at(-1)!.text += `\n${l}`;
    else turns.push({ speaker: meta(s).from ?? 'Caller', text: l });
  }
  return turns;
}

/** Speaker turns with timestamps. `activeIndex` marks the turn being played. */
export function CallTranscript({ turns, activeIndex }: { turns: Turn[]; activeIndex?: number }) {
  return (
    <ol className="grid gap-2">
      {turns.map((t, i) => (
        <li key={i} aria-current={i === activeIndex || undefined} className="grid grid-cols-[minmax(0,90px)_minmax(0,1fr)] gap-3 rounded-ui p-2 text-[13.5px] aria-[current]:bg-accent-soft">
          <b className="truncate text-[12.5px] font-semibold text-ink-2">
            {t.speaker}
            {t.atMs !== undefined && <span className="block font-mono text-[11px] font-normal">{Math.floor(t.atMs / 60000)}:{String(Math.floor((t.atMs % 60000) / 1000)).padStart(2, '0')}</span>}
          </b>
          <span className="whitespace-pre-line [overflow-wrap:anywhere]">{t.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function CallView({ source }: { source: Source }) {
  return (
    <>
      <Header s={source} />
      <CallTranscript turns={turnsFrom(source)} />
    </>
  );
}

/** From, to, date, subject, body. Quoted replies (lines starting with ">") are collapsed. */
export function EmailView({ source }: { source: Source }) {
  const lines = source.body.split('\n');
  const q = lines.findIndex((l, i) => l.startsWith('>') || (/^On .+wrote:$/.test(l.trim()) && i > 0));
  const main = q > 0 ? lines.slice(0, q).join('\n') : source.body;
  const quoted = q > 0 ? lines.slice(q).join('\n') : '';
  const subject = meta(source).subject;
  return (
    <>
      <Header s={source} extra={subject ? [{ label: 'Subject', value: subject }] : undefined} />
      <Prose text={main} />
      {quoted && (
        <details className="mt-3 rounded-ui border-(length:--bw) border-dashed border-line p-2 text-[13px] text-ink-2">
          <summary className="cursor-pointer font-semibold">Quoted reply</summary>
          <Prose text={quoted.replace(/^>\s?/gm, '')} className="mt-2" />
        </details>
      )}
    </>
  );
}

/** Extracted document text with page markers (form feeds or "--- page n" lines). */
export function DocumentView({ source }: { source: Source }) {
  const pages = source.body.split(/\f|\n-{3,}\s*page\s*\d+\s*-*\n/i);
  return (
    <>
      <Header s={source} extra={[{ label: 'File', value: meta(source).file ?? source.title, mono: true }]} />
      {source.body.trim() ? (
        pages.map((p, i) => (
          <section key={i} className="grid gap-2 border-t-(length:--bw) border-dashed border-line pt-3 first:border-t-0 first:pt-0">
            {pages.length > 1 && <span className="font-mono text-[11px] text-ink-2">Page {i + 1}</span>}
            <p className="whitespace-pre-wrap font-mono text-[12px] leading-[1.65] [overflow-wrap:anywhere]">{p.trim()}</p>
          </section>
        ))
      ) : (
        <p className="text-[13.5px] text-ink-2">No text could be extracted from this file.</p>
      )}
    </>
  );
}

/** A record update: "- key: value" lines as fields, the rest as history text. Changed fields are marked. */
export function CrmRecordView({ source }: { source: Source }) {
  const fields: { label: string; value: string; changed: boolean }[] = [];
  const rest: string[] = [];
  for (const l of source.body.split('\n')) {
    const m = l.match(/^\s*[-*]?\s*\**([A-Za-z][\w /]{1,40}?)\**:\**\s+(.+)$/);
    if (m) fields.push({ label: m[1]!, value: m[2]!, changed: /→|->|changed|updated/i.test(m[2]!) });
    else rest.push(l);
  }
  return (
    <>
      <Header s={source} extra={[{ label: 'Type', value: meta(source).channel ?? 'Update' }]} />
      {fields.length > 0 && (
        <KeyValue
          className="mb-3"
          items={fields.map((f) => ({ label: f.label, value: f.changed ? <mark className="rounded-[2px] bg-accent-soft px-1 text-ink">{f.value}</mark> : f.value }))}
        />
      )}
      <Prose text={rest.join('\n').trim()} />
    </>
  );
}

/** The case file or a ticket: status and the request text. */
export function TicketView({ source }: { source: Source }) {
  return (
    <>
      <KeyValue className="mb-3" items={[{ label: 'Opened', value: <RelativeTime at={source.receivedAt} absolute />, mono: true }]} />
      <Prose text={source.body} />
    </>
  );
}

/** SMS, chat and notes. */
export function MessageView({ source }: { source: Source }) {
  return (
    <>
      <Header s={source} />
      <Prose text={source.body} />
    </>
  );
}
