import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { AUTONOMY } from '@/domain/settings';
import { PageHeader, SectionHeader } from '@/layout';
import { ACTIVE_TRACK } from '@/server/config';
import { rulesReport } from '@/server/rules';
import { Eyebrow, Mono, StatusChip, Surface } from '@/ui';

function RuleList({ rows }: { rows: { id: string; describe: string; appliesTo?: string[] }[] }) {
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Surface className="grid gap-1.5">
            <Mono muted className="text-[12px]">
              {r.id}
            </Mono>
            <p className="text-[14px] leading-snug">{r.describe}</p>
            {r.appliesTo && (
              <p className="flex flex-wrap gap-1.5 text-[12px] text-ink-2">
                Applies to
                {r.appliesTo.map((t) => (
                  <Mono key={t} className="rounded-ui bg-surface-2 px-1.5">
                    {t}
                  </Mono>
                ))}
              </p>
            )}
          </Surface>
        </li>
      ))}
    </ul>
  );
}

/** The rules of play: what the agent may do alone, what stops it, and when it must hand over. Read from the enforcing code. */
export function RulesView() {
  const r = rulesReport();
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  const noun = r.caseNoun.toLowerCase();
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow={meta.label}
        title="Rules"
        description={`What the agent may do on its own, what stops it, and when it must hand a ${noun} to a person. This page is generated from the code that enforces each rule, so it cannot drift from what actually runs.`}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Surface className="grid content-start gap-1">
          <Eyebrow>Default autonomy</Eyebrow>
          <b className="text-lg">{AUTONOMY[r.autonomy].label}</b>
          <p className="text-[13px] text-ink-2">{AUTONOMY[r.autonomy].explain}</p>
        </Surface>
        <Surface className="grid content-start gap-1">
          <Eyebrow>Sent without a person</Eyebrow>
          <b className="text-lg">{r.gate.autoSend.length} of {r.tools.length} actions</b>
          <p className="text-[13px] text-ink-2">Only replies to the person who contacted us, at {Math.round(r.gate.minConfidence * 100)}% confidence or more.</p>
        </Surface>
        <Surface className="grid content-start gap-1">
          <Eyebrow>Always a person</Eyebrow>
          <b className="text-lg">{r.mustEscalate.length} triggers</b>
          <p className="text-[13px] text-ink-2">Any of these forces a handover, whatever the model proposes.</p>
        </Surface>
      </div>

      <section aria-labelledby="escalate" className="grid gap-3">
        <SectionHeader id="escalate" title="When it always hands over" description={`If the assessment finds any of these, the ${noun} goes to a person with a handover card. From the pack's escalation triggers.`} />
        <RuleList rows={r.mustEscalate} />
      </section>

      <section aria-labelledby="gate" className="grid gap-3">
        <SectionHeader id="gate" title="What leaves the building" description="After a run, the proposed message goes out on its own only if every condition holds. Otherwise it waits on the case page for a person to approve, edit or reject." />
        <Surface className="grid gap-3">
          <ol className="grid list-decimal gap-1.5 pl-5 text-[14px]">
            {r.gate.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            Auto-send actions:
            {r.gate.autoSend.map((a) => (
              <Mono key={a} className="rounded-ui bg-surface-2 px-1.5">
                {a}
              </Mono>
            ))}
          </div>
        </Surface>
      </section>

      <section aria-labelledby="guard" className="grid gap-3">
        <SectionHeader id="guard" title="The guard" description="Runs before every tool call, in this order. A refused call is logged as action.blocked and the reason goes back to the model so it can choose again." />
        <RuleList rows={r.guard} />
      </section>

      <section aria-labelledby="policy" className="grid gap-3">
        <SectionHeader id="policy" title="Policy rules" description="The pack's business rules, checked by the guard on the tools they apply to." />
        <RuleList rows={r.policy} />
      </section>

      <section aria-labelledby="actions" className="grid gap-3">
        <SectionHeader id="actions" title="Actions" description="Every action the agent can take, who it reaches, and whether it can go out without a person." />
        <div className="overflow-x-auto rounded-ui-lg border-(length:--bw) border-line bg-surface">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b-(length:--bw) border-line text-ink-2">
              <tr>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Reaches</th>
                <th className="px-3 py-2 font-medium">Without a person</th>
              </tr>
            </thead>
            <tbody>
              {r.tools.map((t) => (
                <tr key={t.name} className="border-b-(length:--bw) border-line last:border-0">
                  <td className="px-3 py-2">
                    <Mono>{t.name}</Mono>
                  </td>
                  <td className="px-3 py-2">{t.recipient ?? '—'}</td>
                  <td className="px-3 py-2">
                    {t.internal ? (
                      <span className="text-[13px] text-ink-2">{t.name === 'case.escalate' ? 'Hands the job to a person' : 'Internal: nothing is sent'}</span>
                    ) : (
                      <StatusChip size="sm" status={t.autoSend ? 'resolved' : 'blocked'} label={t.autoSend ? 'Auto-send' : 'Needs approval'} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
