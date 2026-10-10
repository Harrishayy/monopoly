import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { PageHeader, SectionHeader } from '@/layout';
import type { CostBucket, CostReport } from '@/lib/api-types';
import { money } from '@/lib/format';
import { ACTIVE_TRACK } from '@/server/config';
import { costReport } from '@/server/costs';
import { EmptyState, Eyebrow, Mono, StatusChip, Surface } from '@/ui';

const ENDING: Record<CostReport['endings'][number]['ending'], { label: string; chip: 'resolved' | 'blocked' | 'escalated' | 'needs_info' | 'failed'; explain: string }> = {
  handled: { label: 'Handled', chip: 'resolved', explain: 'Finished with no person involved' },
  held: { label: 'Held for approval', chip: 'blocked', explain: 'Draft ready; a person clicks send' },
  escalated: { label: 'Escalated', chip: 'escalated', explain: 'Handed over with full context' },
  needs_info: { label: 'Needs info', chip: 'needs_info', explain: 'Waiting on someone to reply' },
  failed: { label: 'Failed', chip: 'failed', explain: 'Run failed and went to a person' },
};

const fine = (p: number) => money(p, { fine: true });
const int = (n: number) => n.toLocaleString('en-GB');

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Surface className="grid content-start gap-1">
      <Eyebrow>{label}</Eyebrow>
      <b className="font-display text-2xl tabular-nums">{value}</b>
      {note && <p className="text-[13px] text-ink-2">{note}</p>}
    </Surface>
  );
}

/** One series of horizontal bars: spend per group. Values are labelled, so the bar length is a reading aid only. */
function Bars({ id, title, rows }: { id: string; title: string; rows: CostBucket[] }) {
  const max = Math.max(...rows.map((r) => r.pence), Number.EPSILON);
  return (
    <section aria-labelledby={id} className="grid content-start gap-3">
      <SectionHeader id={id} level={3} title={title} />
      <ul className="grid gap-2.5">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-[13px]" title={`${r.label}: ${fine(r.pence)} over ${r.runs} runs`}>
            <span className="truncate capitalize">{r.label}</span>
            <span className="h-2.5 rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (r.pence / max) * 100)}%` }} />
            </span>
            <span className="text-right tabular-nums text-ink-2">
              <Mono>{fine(r.pence)}</Mono> · {r.runs} {r.runs === 1 ? 'run' : 'runs'}
            </span>
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Group</th>
            <th>Runs</th>
            <th>Spend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.runs}</td>
              <td>{fine(r.pence)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** What the agent costs to run, how often it needs a person, and the time it saves. */
export function CostsView() {
  const r = costReport();
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  const total = r.endings.reduce((s, e) => s + e.runs, 0);
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : '0%');
  const hours = r.minutesSaved / 60;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow={meta.label}
        title="Cost and impact"
        description={`Model spend on ${r.model}, how often runs finish without a person, and the time they save. Figures come from every finished run on this server; the assumptions are listed at the bottom.`}
      />

      {r.runs === 0 ? (
        <EmptyState title="No finished runs yet" body="Run a case, call the voice line or send an email. Costs appear here once a run finishes." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Total model spend" value={fine(r.totalPence)} note={`${r.runs} runs across ${r.cases} cases`} />
            <Tile label="Per case" value={fine(r.perCaseMedianPence)} note={`median; 90th percentile ${fine(r.perCaseP90Pence)}`} />
            <Tile label="Per run" value={fine(r.perRunPence)} note="mean, including retries and fallbacks" />
            <Tile label="Person time saved" value={`${hours >= 1 ? `${hours.toFixed(1)} h` : `${r.minutesSaved} min`}`} note={`worth about ${money(r.personPenceSaved)} at the assumed rate`} />
          </div>

          <section aria-labelledby="endings" className="grid gap-3">
            <SectionHeader id="endings" title="How runs ended" description="Autonomy rate: the share finished with no person involved. Held, escalated and waiting runs still save the triage." />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {r.endings.map((e) => (
                <Surface key={e.ending} className="grid content-start gap-1.5">
                  <StatusChip size="sm" status={ENDING[e.ending].chip} label={ENDING[e.ending].label} />
                  <b className="font-display text-2xl tabular-nums">{pct(e.runs)}</b>
                  <p className="text-[13px] text-ink-2">
                    {e.runs} {e.runs === 1 ? 'run' : 'runs'}. {ENDING[e.ending].explain}.
                  </p>
                </Surface>
              ))}
            </div>
          </section>

          <div className="grid gap-8 md:grid-cols-2">
            <Bars id="by-channel" title="Spend by channel" rows={r.byChannel} />
            <Bars id="by-kind" title="Spend by run kind" rows={r.byKind} />
          </div>

          <section aria-labelledby="tokens" className="grid gap-3">
            <SectionHeader id="tokens" level={3} title="Tokens" />
            <div className="grid gap-3 sm:grid-cols-4">
              <Tile label="Input" value={int(r.tokens.input)} />
              <Tile label="Output" value={int(r.tokens.output)} />
              <Tile label="Cache read" value={int(r.tokens.cacheRead)} />
              <Tile label="Cache write" value={int(r.tokens.cacheWrite)} />
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="assumptions" className="grid gap-3">
        <SectionHeader id="assumptions" level={3} title="Assumptions" />
        <ul className="grid max-w-prose list-disc gap-1.5 pl-5 text-[13.5px] text-ink-2">
          {r.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
