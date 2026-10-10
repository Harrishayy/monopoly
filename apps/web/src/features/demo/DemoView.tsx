'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { VIDEO_CALL_LINES, VIDEO_DEMO_REF, VIDEO_PORTAL_DETAILS, VIDEO_SHOTS } from '@/lib/demo';
import { api } from '@/lib/api';
import { PageHeader } from '@/layout';
import { Button, CopyButton, Eyebrow, Surface, toast } from '@/ui';

export interface DemoStatus {
  caseRef: string;
  title: string;
  prepared: boolean;
  tenantName: string;
  contact: string | null;
  phone: string | null;
  callReady: boolean;
  portalUrl: string;
}

/** Operator sheet for the 60-second Loom: seed the email chain, walk the shots, call in from the portal. */
export function DemoView({ initial }: { initial: DemoStatus }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<'reset' | 'begin' | null>(null);

  async function prepare(reset: boolean) {
    return api<DemoStatus>('/api/demo/video', { method: 'POST', json: { reset } });
  }

  async function begin() {
    setBusy('begin');
    try {
      const next = await prepare(true);
      setState(next);
      router.push('/architecture');
    } catch (e) {
      toast.error('Could not prepare the video case', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy('reset');
    try {
      setState(await prepare(true));
      toast('Video case reset', { description: `${VIDEO_DEMO_REF} is ready with the prerun email chain.` });
    } catch (e) {
      toast.error('Could not reset', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow="60-second Loom"
        title="Video run"
        description="Launch this, start Loom on Architecture, and talk. The email chain is already on the case. After that you call in from the tenant portal on your phone — no Twilio."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={reset} loading={busy === 'reset'}>
              Reset scenario
            </Button>
            <Button variant="primary" icon="play" onClick={begin} loading={busy === 'begin'}>
              Prepare and begin
            </Button>
          </div>
        }
      />

      <Surface className="grid gap-2">
        <Eyebrow>Ready</Eyebrow>
        <p className="text-[15px] font-semibold">
          {state.prepared ? `${state.caseRef} · ${state.title}` : 'Not seeded yet — click Prepare and begin.'}
        </p>
        <p className="text-[13.5px] text-ink-2">
          Tenant {state.tenantName}
          {state.contact ? ` · ${state.contact}` : ''}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
          <span className="min-w-0 truncate font-mono text-[12.5px]">{state.portalUrl}</span>
          <CopyButton value={state.portalUrl} label="Copy portal link" />
        </p>
        {!state.callReady && (
          <p className="text-[13px] text-ink-2">
            Voice needs <code className="font-mono">ELEVENLABS_API_KEY</code> and the tunnel so your phone can reach{' '}
            <code className="font-mono">/portal</code>.
          </p>
        )}
      </Surface>

      <section className="grid gap-3" aria-labelledby="shots">
        <h2 id="shots" className="font-display text-[18px] font-bold">
          Shot list
        </h2>
        <ol className="grid gap-3">
          {VIDEO_SHOTS.map((s, i) => (
            <li key={s.id}>
              <Surface className="grid gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[12px] text-ink-2">{s.clock}</span>
                  <span className="font-semibold">
                    {i + 1}. {s.screen}
                  </span>
                  <Link href={s.href} className="ml-auto text-[13px] font-semibold text-accent">
                    Open
                  </Link>
                </div>
                <p className="text-[14px] leading-snug">{s.say}</p>
              </Surface>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3" aria-labelledby="on-the-call">
        <h2 id="on-the-call" className="font-display text-[18px] font-bold">
          After the email (you are {state.tenantName})
        </h2>
        <Surface className="grid gap-3">
          <ol className="grid list-decimal gap-2 pl-5 text-[14px] leading-snug">
            <li>
              On your phone open the tenant portal (copy the link above). Use the tunnel URL, not localhost.
            </li>
            <li>
              Tap <b>Call us</b>. Details are prefilled as {VIDEO_PORTAL_DETAILS.name} / {VIDEO_PORTAL_DETAILS.email} so the call joins this case. Allow the microphone.
            </li>
            <li>Say these lines, then hang up:</li>
          </ol>
          <ol className="grid gap-1.5">
            {VIDEO_CALL_LINES.map((line) => (
              <li key={line} className="text-[14.5px] leading-snug">
                “{line}”
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="primary" icon="call">
              <a href={state.portalUrl} target="_blank" rel="noreferrer">
                Open tenant portal
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/cases/${VIDEO_DEMO_REF}?tab=conversation`}>Open the case</Link>
            </Button>
          </div>
        </Surface>
      </section>

      <section className="grid gap-2 text-[13.5px] text-ink-2">
        <h2 className="font-display text-[16px] font-bold text-ink">Before you hit record</h2>
        <ul className="grid list-disc gap-1 pl-5">
          <li>
            <code className="font-mono">pnpm demo</code> on :3100 and the ngrok / Cloudflare tunnel still running.
          </li>
          <li>Portal link opened on the phone, mic allowed.</li>
          <li>Start Loom, then click Prepare and begin. Do not record this page — start talking on Architecture.</li>
          <li>After the call, open Review messages, Approve & send to your inbox, close on 94%.</li>
        </ul>
      </section>
    </div>
  );
}
