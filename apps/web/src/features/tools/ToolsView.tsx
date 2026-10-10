import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { AUTONOMY } from '@/domain/settings';
import { ToolHealthRow } from '@/domain/tools';
import { PageHeader, SectionHeader } from '@/layout';
import { ACTIVE_TRACK } from '@/server/config';
import { toolRegistry } from '@/server/tools';
import { Mono, StatusChip, Surface } from '@/ui';

const PIPELINE: { name: string; who: 'code' | 'model' | 'person'; what: string }[] = [
  { name: 'Read', who: 'code', what: 'Loads the case file, every dated event and the attachments. Each source gets a stable id that facts must cite.' },
  { name: 'Assess', who: 'code', what: 'The track pack’s rules work out the stage, who the case is waiting on, risks, and which actions would break policy right now.' },
  { name: 'Decide', who: 'model', what: 'The model reads the sources and the assessment and picks one next action with a reason, citations and a confidence. Without a model, the playbook picks.' },
  { name: 'Guard', who: 'code', what: 'Every action goes through the policy guard and autonomy level before it runs. Refusals go back to the model so it can choose again.' },
  { name: 'Act or hand over', who: 'person', what: 'Allowed actions run with retries and an idempotency key. Anything risky, disputed or refused ends in a handover card for a person.' },
];

const WHO = { code: 'Deterministic code', model: 'Model', person: 'Tools or a person' } as const;

/** The pack's tools, the rules that gate them, and how the agent is put together. */
export function ToolsView() {
  const reg = toolRegistry();
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow={meta.label}
        title="Tools and policy"
        description="What the agent can do, what stops it, and when it must hand over. Health comes from the runs in this session."
      />

      <section aria-labelledby="pipeline" className="grid gap-4">
        <SectionHeader id="pipeline" title="How a run works" description="The same five stages run for every case, live in the browser or unattended in the Reality Test." />
        <ol className="grid gap-2 md:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <li key={p.name} className="relative grid content-start gap-2 rounded-ui-lg border-(length:--bw) border-line bg-surface p-3.5 shadow-ui">
              <span className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-accent font-mono text-[11px] font-bold text-accent-ink">{i + 1}</span>
                <b className="font-display text-[15px]">{p.name}</b>
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[.08em] text-ink-2">{WHO[p.who]}</span>
              <p className="text-[13px] leading-snug text-ink-2">{p.what}</p>
              {i < PIPELINE.length - 1 && (
                <span aria-hidden className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-ink-2 md:block">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-ink-2">
          Every step emits an event. The screens, the mascot and the generated ANSWERS/ files are all views of that one event stream, so what you see here is what gets submitted.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Surface className="grid content-start gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-2">Default autonomy</span>
          <b className="text-lg">{AUTONOMY[reg.autonomy].label}</b>
          <p className="text-[13px] text-ink-2">{AUTONOMY[reg.autonomy].explain}</p>
        </Surface>
        <Surface className="grid content-start gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-2">Decision model</span>
          <div className="flex flex-wrap items-center gap-2">
            <Mono className="text-[14px] font-semibold">{reg.model.decide}</Mono>
            <StatusChip size="sm" status={reg.model.configured ? 'resolved' : 'blocked'} label={reg.model.configured ? 'Configured' : 'No API key'} />
          </div>
          <p className="text-[13px] text-ink-2">{reg.model.configured ? 'Runs use the model and fall back to the rules-only playbook if a call fails.' : 'Runs use the rules-only playbook until ANTHROPIC_API_KEY is set.'}</p>
        </Surface>
        <Surface className="grid content-start gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-2">Registry</span>
          <b className="text-lg">
            {reg.tools.length} tools · {reg.rules.length} rules · {reg.mustEscalate.length} triggers
          </b>
          <p className="text-[13px] text-ink-2">Actions are recorded to an outbox; no live channel is connected.</p>
        </Surface>
      </div>

      <section aria-labelledby="tools" className="grid gap-3">
        <SectionHeader id="tools" title="Tools" description="Write tools go through the guard. Read tools always run." />
        <Surface padded={false} className="px-4">
          <ul>
            {reg.tools.map((t) => (
              <ToolHealthRow key={t.name} tool={t} />
            ))}
          </ul>
        </Surface>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="rules" className="grid content-start gap-3">
          <SectionHeader id="rules" title="Policy rules" description="Checked in code before a tool runs, not only in the prompt." />
          <ul className="grid gap-2">
            {reg.rules.map((r) => (
              <li key={r.id} className="grid gap-1 rounded-ui border-(length:--bw) border-line bg-surface p-3">
                <Mono className="text-[12.5px] font-semibold">{r.id}</Mono>
                <p className="text-[13px]">{r.describe}</p>
                <p className="text-[12px] text-ink-2">
                  Applies to {r.appliesTo.map((a, i) => <span key={a}>{i > 0 && ', '}<Mono>{a}</Mono></span>)}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="escalate" className="grid content-start gap-3">
          <SectionHeader id="escalate" title="Always hand to a person" description="When one of these is present the run ends in a handover, whatever the model chose." />
          <ul className="grid gap-2">
            {reg.mustEscalate.map((r) => (
              <li key={r.id} className="s-escalated grid gap-1 rounded-ui border-(length:--bw) border-line border-l-4 border-l-(--c) bg-surface p-3">
                <Mono className="text-[12.5px] font-semibold">{r.id}</Mono>
                <p className="text-[13px]">{r.describe}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
