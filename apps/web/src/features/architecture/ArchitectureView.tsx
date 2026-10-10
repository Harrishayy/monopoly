import { TRACK_META } from '@casework/tracks/meta';
import type { TrackId } from '@casework/core';
import { PageHeader, SectionHeader } from '@/layout';
import { ACTIVE_TRACK } from '@/server/config';
import { Surface } from '@/ui';

function Box({ x, y, w, h, title, sub, accent, dashed }: { x: number; y: number; w: number; h: number; title: string; sub?: string[]; accent?: boolean; dashed?: boolean }) {
  const lines = sub ?? [];
  const top = y + h / 2 - (lines.length * 15) / 2 + 4;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="var(--surface)" stroke={accent ? 'var(--accent)' : 'currentColor'} strokeWidth={accent ? 2 : 1.25} strokeDasharray={dashed ? '5 4' : undefined} />
      <text x={x + w / 2} y={top - (lines.length ? 4 : -2)} textAnchor="middle" fontSize={13} fontWeight={700} fill="currentColor">
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={l} x={x + w / 2} y={top + 13 + i * 15} textAnchor="middle" fontSize={11.5} fill="var(--ink-2)">
          {l}
        </text>
      ))}
    </g>
  );
}

function Arrow({ d, label, lx, ly, anchor = 'middle' }: { d: string; label?: string; lx?: number; ly?: number; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <g>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} markerEnd="url(#arch-arrow)" />
      {label && lx !== undefined && ly !== undefined && (
        <text x={lx} y={ly} textAnchor={anchor} fontSize={11} fill="var(--ink-2)">
          {label}
        </text>
      )}
    </g>
  );
}

const LAYERS: { name: string; what: string }[] = [
  { name: 'Channels', what: 'ElevenLabs voice: the agent calls a log_issue tool mid-call, so the case appears while the caller is still talking, then the post-call webhook attaches the full transcript; a poller covers a dropped tunnel. Email: an inbox poller. Portal: a web form for tenants.' },
  { name: 'Ingest', what: 'One function for every channel. It opens a case or joins the caller’s open one by phone or email, deduplicates on the provider’s id, and adds the CRM record (tenancy, landlord, consent limit) when the contact is known.' },
  { name: 'Store', what: 'SQLite on disk: cases, every message, every run event, and every outbound message with its status. Restarts lose nothing.' },
  { name: 'Agent', what: 'The same runCase used by the Reality Test. Rules assess the stage and risks; Haiku 5.5 proposes one next step with citations; the guard refuses anything a rule forbids; risky cases end in a handover.' },
  { name: 'Outbound gate', what: 'Low-stakes, confident replies to the tenant go out on their own. Everything else (landlord, contractor, money, escalations) waits for a person to approve, edit or reject.' },
  { name: 'Console', what: 'What the agency works in: the inbox updates live over Server-Sent Events, each case shows the conversation and every agent action, and approvals happen in place.' },
];

/** How a call or email becomes a case, a decision and a message, and how the offline Reality Test path stays separate. */
export function ArchitectureView() {
  const meta = TRACK_META[ACTIVE_TRACK as TrackId];
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6">
      <PageHeader eyebrow={meta.label} title="Architecture" description="How a call, email or form becomes a case, a decision and a message, and where a person steps in." />

      <figure className="grid gap-3">
        <Surface className="overflow-x-auto text-ink">
          <svg
            viewBox="0 0 1040 560"
            role="img"
            aria-label="Voice, email and portal messages go through one ingest step into a SQLite store. The agent reads the case, assesses it, proposes a step with Haiku 5.5, passes it through the policy guard, and either proposes a message or hands over. An outbound gate auto-sends low-stakes replies and holds the rest for approval in the admin console. Separately, pnpm reality runs the same agent over the challenge folder and writes ANSWERS."
            className="h-auto w-full min-w-[760px]"
          >
            <defs>
              <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
              </marker>
            </defs>

            <text x={20} y={24} fontSize={11} fontWeight={600} letterSpacing=".08em" fill="var(--ink-2)">
              LIVE
            </text>
            <Box x={20} y={40} w={170} h={96} title="Voice · ElevenLabs" sub={['log_issue tool (mid-call)', 'post-call webhook', 'poller fallback']} />
            <Box x={20} y={156} w={170} h={56} title="Email inbox" sub={['polled for new mail']} />
            <Box x={20} y={232} w={170} h={56} title="Tenant portal" sub={['report form · call button']} />

            <Box x={240} y={120} w={140} h={90} title="ingest()" sub={['open or join case', 'dedupe by provider id', 'attach CRM record']} />
            <Arrow d="M190 88 C215 88 215 150 238 150" label="transcript" lx={198} ly={80} anchor="start" />
            <Arrow d="M190 184 L238 172" />
            <Arrow d="M190 260 C215 260 215 195 238 195" />

            <Box x={430} y={120} w={140} h={90} title="SQLite store" sub={['cases · messages', 'run events', 'outbound']} />
            <Arrow d="M380 165 L428 165" label="writes" lx={404} ly={157} />

            <rect x={605} y={14} width={215} height={276} rx={10} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeDasharray="4 4" />
            <text x={712} y={30} textAnchor="middle" fontSize={11} fontWeight={600} letterSpacing=".08em" fill="var(--ink-2)">
              AGENT · runCase
            </text>
            <Box x={620} y={40} w={185} h={44} title="Assessment" sub={['rules: stage, risks, bars']} />
            <Box x={620} y={100} w={185} h={44} title="Model loop" sub={['Haiku 5.5 proposes a step']} />
            <Box x={620} y={160} w={185} h={44} title="Policy guard" sub={['refuses forbidden actions']} />
            <Box x={620} y={220} w={185} h={56} title="Next step or handover" sub={['cited, with confidence']} />
            <Arrow d="M712 84 L712 98" />
            <Arrow d="M712 144 L712 158" />
            <Arrow d="M712 204 L712 218" />
            <path d="M805 182 C840 182 840 122 807 122" fill="none" stroke="currentColor" strokeWidth={1.25} strokeDasharray="4 3" markerEnd="url(#arch-arrow)" />
            <text x={846} y={156} fontSize={11} fill="var(--ink-2)">
              refused: retry
            </text>
            <Arrow d="M570 150 C595 150 595 62 618 62" label="case + sources" lx={540} ly={110} anchor="middle" />
            <Arrow d="M618 262 C590 262 590 200 572 196" label="events" lx={588} ly={250} anchor="end" />

            <Box x={870} y={250} w={150} h={64} title="Outbound gate" sub={['auto-send or hold']} accent />
            <Arrow d="M805 260 C835 260 835 282 868 282" />
            <Box x={870} y={350} w={70} h={52} title="Sent" sub={['to tenant']} />
            <Box x={950} y={350} w={70} h={52} title="Held" sub={['for approval']} accent />
            <Arrow d="M915 314 L905 348" />
            <Arrow d="M975 314 L985 348" />

            <Box x={430} y={340} w={410} h={62} title="Admin console" sub={['live inbox (SSE) · conversations · agent actions · approvals · cost · rules']} />
            <Arrow d="M500 210 L500 338" label="live updates" lx={508} ly={280} anchor="start" />
            <Arrow d="M948 376 L842 376" label="approve / edit" lx={895} ly={420} />

            <rect x={20} y={444} width={1000} height={100} rx={10} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeDasharray="6 5" />
            <text x={36} y={466} fontSize={11} fontWeight={600} letterSpacing=".08em" fill="var(--ink-2)">
              OFFLINE · REALITY TEST (no live store, no channels)
            </text>
            <Box x={40} y={478} w={170} h={50} title="data/challenges" sub={['case folders']} />
            <Box x={290} y={478} w={190} h={50} title="pnpm reality" sub={['unattended batch']} />
            <Box x={560} y={478} w={170} h={50} title="runCase" sub={['the same agent']} />
            <Box x={810} y={478} w={190} h={50} title="ANSWERS/" sub={['ANSWER.md · REASONING.md']} />
            <Arrow d="M210 503 L288 503" label="reads" lx={249} ly={496} />
            <Arrow d="M480 503 L558 503" label="each case" lx={519} ly={496} />
            <Arrow d="M730 503 L808 503" label="writes" lx={769} ly={496} />
          </svg>
        </Surface>
        <figcaption className="max-w-prose text-[13px] text-ink-2">
          Every live channel goes through one ingest step and one store. The agent is the same code the Reality Test runs; only the live path adds the outbound gate, where low-stakes replies go out alone and everything else waits for a person. The dashed band at the bottom is the offline run that writes ANSWERS/, and it does not touch the live store.
        </figcaption>
      </figure>

      <section aria-labelledby="layers" className="grid gap-3">
        <SectionHeader id="layers" title="Layer by layer" />
        <dl className="grid gap-3 md:grid-cols-2">
          {LAYERS.map((l) => (
            <Surface key={l.name} className="grid content-start gap-1">
              <dt className="font-display text-[15px] font-bold">{l.name}</dt>
              <dd className="text-[13.5px] leading-snug text-ink-2">{l.what}</dd>
            </Surface>
          ))}
        </dl>
      </section>
    </div>
  );
}
