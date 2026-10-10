import type { ToolInfo } from '@/lib/api-types';
import { cn } from '@/lib/cn';
import { duration } from '@/lib/format';
import { Mono } from '@/ui';

const STATE = {
  healthy: { cls: 's-resolved', label: 'Healthy' },
  degraded: { cls: 's-escalated', label: 'Degraded' },
  down: { cls: 's-failed', label: 'Down' },
  unused: { cls: 's-blocked', label: 'No calls yet' },
} as const;

const EFFECT = { read: 'Reads', write: 'Writes', money: 'Spends money' } as const;

/** Bars for the last 50 attempts: height = latency, colour + gap marks failures. */
function Sparkline({ recent }: { recent: ToolInfo['health']['recent'] }) {
  if (!recent.length) return <span className="text-[12px] text-ink-2">No attempts yet</span>;
  const max = Math.max(1, ...recent.map((r) => r.ms ?? 0));
  const w = 3;
  const gap = 1;
  return (
    <svg width={50 * (w + gap)} height={24} viewBox={`0 0 ${50 * (w + gap)} 24`} role="img" aria-label={`${recent.filter((r) => !r.ok).length} of the last ${recent.length} attempts failed`} className="max-w-full">
      {recent.map((r, i) => {
        const h = r.ok ? Math.max(3, ((r.ms ?? 0) / max) * 22) : 22;
        return <rect key={i} x={i * (w + gap)} y={24 - h} width={w} height={h} rx={1} fill={r.ok ? 'var(--ok)' : 'var(--bad)'} opacity={r.ok ? 0.75 : 1} />;
      })}
    </svg>
  );
}

/** One tool: what it does, which rules gate it, and how it has behaved in this session's runs. */
export function ToolHealthRow({ tool }: { tool: ToolInfo }) {
  const h = tool.health;
  const s = STATE[h.state];
  const attempts = h.recent.length;
  const okRate = attempts ? Math.round((100 * h.recent.filter((r) => r.ok).length) / attempts) : undefined;
  return (
    <li className="grid gap-3 border-b-(length:--bw) border-line py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Mono className="text-[13px] font-semibold">{tool.name}</Mono>
          <span className="rounded-ui border border-line px-1.5 py-0.5 text-[11px] text-ink-2">{EFFECT[tool.effect]}</span>
          {tool.recipient && <span className="text-[12px] text-ink-2">→ {tool.recipient}</span>}
        </div>
        <p className="text-[13px] text-ink-2">{tool.description}</p>
        {tool.rules.length > 0 && (
          <p className="text-[12px] text-ink-2">
            Gated by{' '}
            {tool.rules.map((r, i) => (
              <span key={r}>
                {i > 0 && ', '}
                <Mono>{r}</Mono>
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="grid content-start gap-1 text-[12.5px]">
        <Sparkline recent={h.recent} />
        <span className="text-ink-2">
          {h.calls} call{h.calls === 1 ? '' : 's'}
          {okRate !== undefined && ` · ${okRate}% attempts ok`}
          {h.avgMs !== undefined && ` · avg ${duration(h.avgMs)}`}
          {h.blocked > 0 && ` · ${h.blocked} refused by policy`}
        </span>
        {h.lastError && <span className="text-bad [overflow-wrap:anywhere]">Last error: {h.lastError}</span>}
      </div>
      <span className={cn(s.cls, 'inline-flex h-fit items-center gap-1.5 justify-self-start whitespace-nowrap rounded-ui border border-(--c)/40 bg-(--c)/10 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-(--c) md:justify-self-end')}>
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        {s.label}
      </span>
    </li>
  );
}
