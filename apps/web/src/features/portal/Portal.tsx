'use client';

import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button, Eyebrow, Icon, Input, Surface, Textarea } from '@/ui';

interface PortalConfig {
  agency: string;
  email?: string;
  voice: boolean;
}

/** Tenant help page: one big call button, a report form, and the inbox address. */
export function Portal() {
  const [config, setConfig] = useState<PortalConfig>({ agency: 'Northgate Lettings', voice: false });
  useEffect(() => {
    fetch('/api/portal/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b-(length:--bw) border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-display text-lg font-bold">{config.agency}</p>
            <Eyebrow>Tenant help</Eyebrow>
          </div>
          <p className="text-right text-[13px] text-ink-2">
            Gas smell? Leave the property and call
            <br />
            <a className="font-semibold text-bad underline" href="tel:0800111999">
              0800 111 999
            </a>
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6">
        <section aria-labelledby="h-intro">
          <h1 id="h-intro" className="font-display text-2xl font-bold sm:text-3xl">
            Something wrong with your home?
          </h1>
          <p className="mt-1 text-ink-2">Talk to us now, or tell us in writing. Every report gets a reference and a coordinator follows up.</p>
        </section>

        <ConversationProvider>
          <CallPanel enabled={config.voice} />
        </ConversationProvider>

        <div className={cn('grid gap-5', config.email && 'sm:grid-cols-[1fr_16rem]')}>
          <ReportForm />
          {config.email && (
            <Surface className="grid content-start gap-2">
              <Eyebrow>Prefer email?</Eyebrow>
              <a href={`mailto:${config.email}`} className="flex items-center gap-2 break-all font-semibold text-accent underline">
                <Icon name="email" size={16} />
                {config.email}
              </a>
              <p className="text-[13px] text-ink-2">Photos help. We reply to the address you write from.</p>
            </Surface>
          )}
        </div>
      </main>
    </div>
  );
}

type Line = { id: number; who: 'agent' | 'you'; text: string };
type Mic = 'unknown' | 'granted' | 'denied' | 'prompt';

function CallPanel({ enabled }: { enabled: boolean }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string>();
  const [mic, setMic] = useState<Mic>('unknown');
  const [starting, setStarting] = useState(false);
  const idRef = useRef(0);
  const logRef = useRef<HTMLOListElement>(null);

  const conversation = useConversation({
    onMessage: (m) => {
      const who = (m as { role?: string }).role === 'user' || m.source === 'user' ? 'you' : 'agent';
      setLines((l) => [...l, { id: idRef.current++, who, text: m.message }]);
    },
    onError: (message) => setError(typeof message === 'string' ? message : 'The call dropped.'),
    onDisconnect: () => setStarting(false),
  });
  const { status, isSpeaking } = conversation;
  const live = status === 'connected';

  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((p) => {
        setMic(p.state as Mic);
        p.onchange = () => setMic(p.state as Mic);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lines]);

  const start = useCallback(async () => {
    setError(undefined);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMic('granted');
    } catch {
      setMic('denied');
      setStarting(false);
      setError('We need your microphone for the call. Allow it in your browser’s address bar, then try again.');
      return;
    }
    try {
      const res = await fetch('/api/voice/session', { method: 'POST' });
      const body = (await res.json()) as { signedUrl?: string; error?: string };
      if (!body.signedUrl) throw new Error(body.error ?? 'Calls are unavailable right now.');
      setLines([]);
      conversation.startSession({ signedUrl: body.signedUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }, [conversation]);

  const state = live ? (isSpeaking ? 'Agent speaking' : 'Listening') : status === 'connecting' || starting ? 'Connecting…' : 'Ready';

  return (
    <Surface className="grid gap-4" aria-labelledby="h-call">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="h-call" className="font-display text-xl font-bold">
            Call the tenant line
          </h2>
          <p className="text-[13px] text-ink-2">Speak to our assistant now, any time. It logs your issue while you talk.</p>
        </div>
        <span role="status" aria-live="polite" className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider text-ink-2">
          <span
            aria-hidden
            className={cn('size-2.5 rounded-full', live ? 'bg-ok motion-safe:animate-pulse' : status === 'error' ? 'bg-bad' : 'bg-line-strong/40')}
          />
          {state}
        </span>
      </div>

      {live ? (
        <Button variant="danger" icon="x" onClick={() => conversation.endSession()} className="h-14 text-base">
          End call
        </Button>
      ) : (
        <Button variant="primary" icon="call" onClick={start} loading={starting || status === 'connecting'} disabled={!enabled} className="h-14 text-base">
          {enabled ? 'Call us' : 'Calls unavailable right now'}
        </Button>
      )}

      {mic === 'denied' && !error && <p className="text-[13px] text-hold">Microphone is blocked for this site. Allow it in the address bar to call.</p>}
      {error && (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      )}

      {lines.length > 0 && (
        <ol ref={logRef} aria-label="Call transcript" className="grid max-h-72 gap-2 overflow-y-auto rounded-ui bg-surface-2/60 p-3 text-sm">
          {lines.map((l) => (
            <li key={l.id} className={cn('max-w-[85%] rounded-ui px-3 py-2', l.who === 'you' ? 'justify-self-end bg-accent-soft' : 'bg-surface')}>
              <span className="sr-only">{l.who === 'you' ? 'You' : 'Agent'}: </span>
              {l.text}
            </li>
          ))}
        </ol>
      )}
    </Surface>
  );
}

function ReportForm() {
  const [form, setForm] = useState({ name: '', contact: '', address: '', issue: '', details: '' });
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'done' | 'error'; ref?: string; error?: string }>({ kind: 'idle' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: form.contact.includes('@') ? 'email' : 'note',
          contact: form.contact || undefined,
          name: form.name || undefined,
          title: form.issue,
          body: [`Reported on the tenant portal.`, form.address && `Property: ${form.address}`, `Issue: ${form.issue}`, form.details && `Details: ${form.details}`]
            .filter(Boolean)
            .join('\n'),
          meta: { address: form.address },
        }),
      });
      const body = (await res.json()) as { caseRef?: string; error?: unknown };
      if (!res.ok || !body.caseRef) throw new Error('We could not save that. Please try again or call us.');
      setState({ kind: 'done', ref: body.caseRef });
    } catch (err) {
      setState({ kind: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (state.kind === 'done')
    return (
      <Surface className="grid content-start gap-2" role="status">
        <Eyebrow tone="muted">Report received</Eyebrow>
        <p className="font-display text-xl font-bold">Your reference is {state.ref}</p>
        <p className="text-ink-2">A coordinator will review it and get back to you. Quote the reference if you contact us again.</p>
        <Button variant="ghost" className="justify-self-start" onClick={() => (setForm({ name: '', contact: '', address: '', issue: '', details: '' }), setState({ kind: 'idle' }))}>
          Report something else
        </Button>
      </Surface>
    );

  return (
    <Surface as="form" onSubmit={submit} className="grid gap-3" aria-labelledby="h-report">
      <h2 id="h-report" className="font-display text-xl font-bold">
        Report an issue
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Your name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Input label="Phone or email" value={form.contact} onChange={set('contact')} required autoComplete="email" />
      </div>
      <Input label="Property address" value={form.address} onChange={set('address')} required autoComplete="street-address" />
      <Input label="What’s wrong?" hint="One line, e.g. “Boiler not heating”" value={form.issue} onChange={set('issue')} required maxLength={120} />
      <Textarea label="Details" value={form.details} onChange={set('details')} rows={4} maxLength={2000} placeholder="Since when, how bad, what you’ve tried, when we can get access" />
      {state.kind === 'error' && (
        <p role="alert" className="text-[13px] text-bad">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={state.kind === 'sending'} className="justify-self-start">
        Send report
      </Button>
    </Surface>
  );
}
