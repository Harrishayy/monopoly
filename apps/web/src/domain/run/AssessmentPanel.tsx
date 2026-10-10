import type { Assessment } from '@casework/core';
import { Citation } from '@/domain/case';
import { Eyebrow, RelativeTime } from '@/ui';
import { BlockedAction } from './BlockedAction';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="grid gap-1.5">
    <Eyebrow as="h3">{title}</Eyebrow>
    {children}
  </section>
);

const Cites = ({ ids }: { ids: string[] }) => (
  <span className="flex min-w-0 flex-wrap gap-1">
    {ids.slice(0, 3).map((id) => (
      <Citation key={id} sourceId={id} />
    ))}
  </span>
);

/** The pack's deterministic read of the case, made before the model runs. The guard enforces its barred list. */
export function AssessmentPanel({ assessment: a }: { assessment: Assessment }) {
  return (
    <div className="grid gap-4">
      <Section title="Stage">
        <p className="text-[14px] font-semibold">{a.stage}</p>
        <p className="text-[12.5px] text-ink-2">
          As of <RelativeTime at={a.asOf} absolute />
          {a.waitingOn && (
            <>
              {' '}· waiting on <b className="text-ink">{a.waitingOn.party}</b> since <RelativeTime at={a.waitingOn.since} absolute />
            </>
          )}
        </p>
      </Section>
      {a.flags.length > 0 && (
        <Section title="Flags">
          <ul className="grid gap-1.5">
            {a.flags.map((f) => (
              <li key={f.id} className={`grid gap-1 rounded-ui border px-2.5 py-2 text-[13px] ${f.mustEscalate ? 's-escalated border-(--c) bg-(--c)/10' : 'border-line'}`}>
                <span>
                  {f.mustEscalate && <b className="mr-1 font-mono text-[10.5px] uppercase text-(--c)">Must escalate</b>}
                  {f.text}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-2">{f.id}</span>
                  <Cites ids={f.sourceIds} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {a.facts.length > 0 && (
        <Section title="Facts">
          <ul className="grid gap-2">
            {a.facts.map((f) => (
              <li key={f.text} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-[13px]">
                <span className="min-w-[10rem] flex-1">{f.text}</span>
                <Cites ids={f.sourceIds} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {a.suggested.length > 0 && (
        <Section title="Playbook suggests">
          <ol className="grid gap-1 text-[13px]">
            {a.suggested.map((s, i) => (
              <li key={s.action} className="grid gap-0.5">
                <span className="font-mono text-[12.5px] font-semibold">
                  {i + 1}. {s.action}
                </span>
                <span className="text-ink-2">{s.why}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}
      {a.barred.length > 0 && (
        <Section title="Barred right now">
          <div className="grid gap-1.5">
            {a.barred.map((b) => (
              <BlockedAction key={b.action} action={b.action} ruleId={b.ruleId} why={b.why} heading="The guard will refuse" />
            ))}
          </div>
        </Section>
      )}
      {a.boundaries.length > 0 && (
        <Section title="Must not claim or do">
          <ul className="grid list-disc gap-1 pl-4 text-[13px]">
            {a.boundaries.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Section>
      )}
      {a.noise.length > 0 && (
        <Section title={`Set aside as noise (${a.noise.length})`}>
          <ul className="grid gap-1 text-[12.5px] text-ink-2">
            {a.noise.map((n) => (
              <li key={n.sourceId} className="flex items-start gap-2">
                <Citation sourceId={n.sourceId} />
                <span>{n.why}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
