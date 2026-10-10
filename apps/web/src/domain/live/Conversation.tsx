import type { Source } from '@casework/core';
import { KIND } from '@/domain/case/kinds';
import { Icon, RelativeTime } from '@/ui';

/** Splits "Agent: …\nUser: …" transcripts into turns; anything else is one block. */
function turns(body: string): { who?: string; text: string }[] {
  const lines = body.split('\n');
  const re = /^(agent|user|caller|tenant|assistant|customer)\s*:\s*/i;
  if (lines.filter((l) => re.test(l)).length < 2) return [{ text: body }];
  const out: { who?: string; text: string }[] = [];
  for (const l of lines) {
    const m = l.match(re);
    if (m) out.push({ who: m[1]!.toLowerCase(), text: l.slice(m[0].length) });
    else if (out.length && l.trim()) out[out.length - 1]!.text += `\n${l}`;
    else if (l.trim()) out.push({ text: l });
  }
  return out;
}

const AGENTISH = new Set(['agent', 'assistant']);

/** Every message on a live case in order: call transcripts as turns, emails as a thread. */
export function Conversation({ sources }: { sources: Source[] }) {
  if (!sources.length) return <p className="text-[13.5px] text-ink-2">No messages yet.</p>;
  return (
    <ol className="grid gap-3" aria-label="Conversation">
      {sources.map((s) => {
        const meta = s.meta as { name?: string; contact?: string; via?: string; durationSecs?: number };
        const from = meta.name ?? meta.contact ?? 'Unknown';
        return (
          <li key={s.id} className="grid gap-2 rounded-ui-lg border-(length:--bw) border-line bg-surface p-3">
            <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2">
              <Icon name={KIND[s.kind].icon} size={14} />
              <span className="font-semibold text-ink">{KIND[s.kind].label}</span>
              <span>from {from}{meta.contact && meta.name ? ` · ${meta.contact}` : ''}</span>
              {meta.via && <span className="font-mono text-[11px]">via {meta.via}</span>}
              <RelativeTime at={s.receivedAt} className="ml-auto font-mono text-[11px]" />
            </header>
            <p className="text-[13.5px] font-semibold">{s.title}</p>
            <div className="grid gap-1.5">
              {turns(s.body).map((t, i) =>
                t.who ? (
                  <p key={i} className={`grid gap-0.5 rounded-ui px-2.5 py-1.5 text-[13.5px] ${AGENTISH.has(t.who) ? 'bg-surface-2' : 'bg-accent-soft'}`}>
                    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-2">{AGENTISH.has(t.who) ? 'Voice agent' : 'Caller'}</span>
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
      })}
    </ol>
  );
}
