'use client';

import { ConversationProvider } from '@elevenlabs/react';
import { Captions, Download, Mic, MicOff, PhoneOff, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Waveform } from '@/domain/voice';
import { cn } from '@/lib/cn';
import { Button, CopyButton, Dialog, Eyebrow, Icon, Input, Select, Spinner, StatusChip, Surface, Switch } from '@/ui';
import { type CallControls, type CallLine, type TypedDetails, useCall } from './useCall';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Live elapsed seconds while the call runs; frozen once it ends. */
function useElapsed(from?: number, to?: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!from || to) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [from, to]);
  return from ? Math.max(0, Math.round(((to ?? now) - from) / 1000)) : 0;
}

/** Captions on or off, remembered on this device. */
function useCaptionPref(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem('portal.captions') === 'off') setOn(false);
    } catch {
      // Storage blocked: captions stay on.
    }
  }, []);
  return [
    on,
    (v) => {
      setOn(v);
      try {
        localStorage.setItem('portal.captions', v ? 'on' : 'off');
      } catch {
        // Storage blocked: the choice lasts for this page only.
      }
    },
  ];
}

function transcriptFile(lines: CallLine[], agency: string, caseRef?: string) {
  const head = [`${agency} tenant line`, caseRef && `Reference: ${caseRef}`, new Date().toLocaleString('en-GB'), ''].filter((x) => x !== undefined);
  const body = lines.map((l) => `[${clock(l.at)}] ${l.who === 'you' ? 'You' : 'Assistant'}: ${l.text}`);
  const url = URL.createObjectURL(new Blob([[...head, ...body].join('\n')], { type: 'text/plain' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `call-${caseRef ?? 'transcript'}.txt` });
  a.click();
  URL.revokeObjectURL(url);
}

/** The tenant line in the browser. Wraps the ElevenLabs provider so the call state lives here. */
export function CallPanel({ enabled, agency, onWrite }: { enabled: boolean; agency: string; onWrite?: () => void }) {
  return (
    <ConversationProvider>
      <CallPanelInner enabled={enabled} agency={agency} onWrite={onWrite} />
    </ConversationProvider>
  );
}

function CallPanelInner({ enabled, agency, onWrite }: { enabled: boolean; agency: string; onWrite?: () => void }) {
  const call = useCall();
  const { phase, lines } = call;
  const [captions, setCaptions] = useCaptionPref();
  const elapsed = useElapsed(call.startedAt, call.endedAt);
  const showTranscript = phase === 'live' || lines.length > 0;
  // Asked for before every new call so the case is opened under the caller's name and contact.
  const [details, setDetails] = useState<TypedDetails>();
  const [asking, setAsking] = useState(false);
  const begin = (d: TypedDetails) => {
    setDetails(d);
    setAsking(false);
    void call.start(d);
  };

  const chip =
    phase === 'live'
      ? { status: 'running' as const, label: call.speaking ? 'Assistant speaking' : call.muted ? 'Muted' : 'Listening' }
      : phase === 'mic' || phase === 'connecting'
        ? { status: 'new' as const, label: 'Connecting' }
        : phase === 'ended'
          ? { status: 'resolved' as const, label: 'Call ended' }
          : phase === 'failed'
            ? { status: 'failed' as const, label: 'Not connected' }
            : enabled
              ? { status: 'new' as const, label: 'Line open' }
              : { status: 'blocked' as const, label: 'Unavailable' };

  return (
    <Surface
      as="section"
      padded={false}
      aria-labelledby="h-call"
      // Phones: the page scrolls and the call controls sit in a bar at the bottom. Desktop: a fixed panel.
      className={cn('flex flex-col lg:h-full lg:overflow-hidden', phase === 'live' && 'mb-20 lg:mb-0')}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b-(length:--bw) border-line px-4 py-3.5 sm:px-5">
        <div className="grid gap-1">
          <Eyebrow tone="accent">Talk to us</Eyebrow>
          <h2 id="h-call" className="text-xl font-bold tracking-tight">
            Call the tenant line
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          {(phase === 'live' || phase === 'ended') && <span className="font-mono text-[13px] tabular-nums text-ink-2" aria-label={`Call time ${clock(elapsed)}`}>{clock(elapsed)}</span>}
          <StatusChip status={chip.status} label={chip.label} />
        </div>
      </div>

      <div className={cn('grid gap-4 px-4 py-4 sm:px-5 lg:min-h-0 lg:overflow-y-auto', showTranscript ? 'lg:shrink' : 'lg:flex-1 lg:content-center')}>
        {phase === 'idle' && <Idle call={call} enabled={enabled} onStart={() => setAsking(true)} />}
        {(phase === 'mic' || phase === 'connecting') && <Connecting call={call} />}
        {phase === 'failed' && <Failed call={call} enabled={enabled} onWrite={onWrite} onRetry={() => (details ? void call.start(details) : setAsking(true))} />}
        {phase === 'live' && <Live call={call} captions={captions} elapsed={elapsed} />}
        {phase === 'ended' && <Ended call={call} elapsed={elapsed} onAgain={() => setAsking(true)} />}
        {(phase === 'live' || phase === 'ended') && call.conversationId && <TypeDetails call={call} initial={details} />}
      </div>

      {showTranscript && (
        <div className="flex flex-col gap-2.5 border-t-(length:--bw) border-line bg-surface-2/40 px-4 py-3.5 sm:px-5 lg:min-h-36 lg:flex-1">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <Eyebrow as="h3">Transcript</Eyebrow>
            <div className="flex items-center gap-1">
              {phase === 'live' && (
                <div className="hidden w-40 lg:block">
                  <Switch label="Live captions" checked={captions} onCheckedChange={setCaptions} />
                </div>
              )}
              {phase !== 'live' && lines.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => transcriptFile(lines, agency, call.caseRef)}>
                  <Download size={15} aria-hidden />
                  Save transcript
                </Button>
              )}
            </div>
          </div>
          <Transcript lines={lines} partial={phase === 'live' ? call.partial : ''} />
        </div>
      )}
      <DetailsDialog open={asking} onOpenChange={setAsking} initial={details} onSubmit={begin} />
    </Surface>
  );
}

/** Before a call: who is calling, how to reach them and which property. Opens the case under their name straight away. */
function DetailsDialog({ open, onOpenChange, initial, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: TypedDetails; onSubmit: (d: TypedDetails) => void }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  // Prefill with what they gave last time, e.g. when calling again.
  useEffect(() => {
    if (!open) return;
    if (initial?.name || initial?.email || initial?.phone) {
      setName(initial.name ?? '');
      setContact(initial.email ?? initial.phone ?? '');
      setAddress(initial.address ?? '');
      return;
    }
    setName('');
    setContact('');
    setAddress('');
  }, [open, initial]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = contact.trim();
    onSubmit({ name: name.trim(), address: address.trim(), ...(c.includes('@') ? { email: c } : { phone: c }) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Before we connect you" description="So we can open your case straight away and keep you updated. The assistant will already know who you are.">
      <form onSubmit={submit} className="grid gap-3" aria-label="Your details">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" maxLength={120} autoFocus />
        <Input
          label="Phone or email"
          hint="Where we send your reference and updates"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          maxLength={200}
          pattern={'(.+@.+\\..+)|([+0-9 ()\\-]{7,})'}
          title="An email address or a phone number"
        />
        <Input label="Property address" value={address} onChange={(e) => setAddress(e.target.value)} required autoComplete="street-address" maxLength={240} placeholder="e.g. Flat 2, 12 Elm Road" />
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="h-11">
            <Icon name="call" size={16} />
            Start call
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DevicePickers({ call, compact }: { call: CallControls; compact?: boolean }) {
  const mics = [{ value: 'default', label: 'System default' }, ...call.inputs.filter((d) => d.id !== 'default').map((d) => ({ value: d.id, label: d.label }))];
  const speakers = [{ value: 'default', label: 'System default' }, ...call.outputs.filter((d) => d.id !== 'default').map((d) => ({ value: d.id, label: d.label }))];
  const showSpeakers = call.outputs.length > 1;
  if (mics.length < 2 && !showSpeakers) return null;
  return (
    <div className={cn('grid gap-3', showSpeakers && !compact && 'sm:grid-cols-2')}>
      {mics.length > 1 && <Select label="Microphone" options={mics} value={call.inputId} onChange={(v) => void call.chooseInput(v)} />}
      {showSpeakers && !compact && <Select label="Speaker" options={speakers} value={call.outputId} onChange={(v) => void call.chooseOutput(v)} />}
    </div>
  );
}

function Idle({ call, enabled, onStart }: { call: CallControls; enabled: boolean; onStart: () => void }) {
  return (
    <>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
          <Icon name="call" size={20} />
        </span>
        <div className="grid gap-1.5 text-[14.5px]">
          <p>Our assistant answers straight away, any time. Tell it what’s wrong and where; it logs the issue while you talk and reads you a reference.</p>
          <p className="text-[13.5px] text-ink-2">We’ll ask for your name, contact and address first, so your report is tracked from the start. Everything is captioned on screen.</p>
        </div>
      </div>
      <Button variant="primary" onClick={onStart} disabled={!enabled} className="h-12 text-[15px]">
        <Icon name="call" size={16} />
        {enabled ? 'Start call' : 'Calls are unavailable right now'}
      </Button>
      {!enabled && <p className="text-[13px] text-ink-2">Please use the written form instead. It reaches the same team.</p>}
      {/* Phones route audio themselves (and can't pick a speaker), so the pickers are for computers. */}
      {enabled && (
        <div className="hidden sm:block">
          <DevicePickers call={call} />
        </div>
      )}
      <p className="text-[12.5px] text-ink-2">Uses your microphone. Works best with headphones in a quiet room.</p>
    </>
  );
}

function Connecting({ call }: { call: CallControls }) {
  return (
    <div className="grid justify-items-center gap-4 py-6 text-center" role="status" aria-live="polite">
      <Spinner size={16} className="text-accent" />
      <div className="grid gap-1">
        <p className="font-semibold">{call.phase === 'mic' ? 'Waiting for your microphone…' : 'Connecting you to the tenant line…'}</p>
        <p className="text-[13px] text-ink-2">{call.phase === 'mic' ? 'Choose “Allow” if your browser asks.' : 'This usually takes a couple of seconds.'}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={call.end}>
        Cancel
      </Button>
    </div>
  );
}

function Failed({ call, enabled, onWrite, onRetry }: { call: CallControls; enabled: boolean; onWrite?: () => void; onRetry: () => void }) {
  return (
    <>
      <div role="alert" className="flex items-start gap-3 rounded-ui border-(length:--bw) border-bad/40 bg-bad/10 px-3.5 py-3 text-[14px]">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden />
        <p>{call.error ?? 'The call could not be connected.'}</p>
      </div>
      <DevicePickers call={call} />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon="retry" onClick={onRetry} disabled={!enabled}>
          Try again
        </Button>
        <Button variant="ghost" asChild>
          <a href="#h-report" onClick={onWrite}>
            Write to us instead
          </a>
        </Button>
      </div>
    </>
  );
}

function Live({ call, captions, elapsed }: { call: CallControls; captions: boolean; elapsed: number }) {
  const last = call.lines.at(-1);
  const caption = call.partial ? { who: 'you' as const, text: call.partial, tentative: true } : last ? { ...last, tentative: false } : undefined;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Meter label="Assistant" active={call.speaking} levels={call.outputLevel} />
        <Meter label={call.muted ? 'You · muted' : 'You'} active={!call.speaking && !call.muted} levels={call.inputLevel} you />
      </div>

      {captions && (
        // Phones show the transcript itself in the page, so this big caption would repeat its last line.
        <div className="hidden min-h-20 content-start gap-1.5 rounded-ui-lg border-(length:--bw) border-line bg-surface-2/60 px-4 py-3.5 lg:grid" aria-hidden>
          {caption ? (
            <>
              <span className={cn('font-mono text-[10.5px] font-semibold uppercase tracking-wider', caption.who === 'agent' ? 'text-accent' : 'text-ink-2')}>{caption.who === 'agent' ? 'Assistant' : 'You'}</span>
              <p className={cn('text-[17px] font-medium leading-snug text-pretty break-words sm:text-[19px] sm:text-balance', caption.tentative && 'text-ink-2')}>{caption.text}</p>
            </>
          ) : (
            <p className="text-[15px] text-ink-2">Captions appear here as you talk.</p>
          )}
        </div>
      )}

      {call.notHeard && (
        <div role="alert" className="grid gap-3 rounded-ui border-(length:--bw) border-hold/40 bg-hold/10 px-3.5 py-3">
          <p className="flex items-start gap-2.5 text-[14px]">
            <MicOff size={17} className="mt-0.5 shrink-0 text-hold" aria-hidden />
            We can’t hear you yet. Check your microphone isn’t muted, or pick a different one.
          </p>
          <DevicePickers call={call} compact />
        </div>
      )}
      {call.error && (
        <p role="alert" className="text-[13px] text-bad">
          {call.error}
        </p>
      )}
      {call.closing && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-ui border-(length:--bw) border-line bg-surface-2/60 px-3.5 py-2.5 text-[14px]">
          <span className="flex items-center gap-2">
            <Spinner size={12} className="text-ink-2" />
            Ending the call after the goodbye…
          </span>
          <Button variant="ghost" size="sm" onClick={call.keepTalking}>
            Keep talking
          </Button>
        </div>
      )}
      {call.caseRef && (
        <p className="flex items-center gap-2 text-[13.5px]" role="status">
          <Icon name="check" size={16} className="text-ok" />
          Logged under <b className="font-mono">{call.caseRef}</b>
        </p>
      )}

      {/* Phones: always in reach at the bottom of the screen, whatever is scrolled into view. */}
      <div className="fixed inset-x-0 bottom-0 z-(--z-sticky) flex items-center gap-2 border-t-(length:--bw) border-line bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-ui lg:static lg:z-auto lg:flex-wrap lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <span className="w-11 shrink-0 font-mono text-[13px] tabular-nums text-ink-2 lg:hidden" aria-hidden>
          {clock(elapsed)}
        </span>
        <Button onClick={() => call.setMuted(!call.muted)} aria-pressed={call.muted} className="h-11 flex-1 lg:h-auto lg:min-w-28 lg:flex-none">
          {call.muted ? <MicOff size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
          {call.muted ? 'Unmute' : 'Mute'}
        </Button>
        <Button variant="danger" onClick={call.end} className="h-11 flex-1 lg:h-auto lg:min-w-28 lg:flex-none">
          <PhoneOff size={16} aria-hidden />
          End call
        </Button>
      </div>
    </>
  );
}

function Meter({ label, active, levels, you }: { label: string; active: boolean; levels: () => number; you?: boolean }) {
  return (
    <div className={cn('grid gap-1.5 rounded-ui border-(length:--bw) px-3 py-2.5 transition-colors', active ? 'border-line-strong bg-surface' : 'border-line bg-surface-2/40')}>
      <span className={cn('flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider', you ? 'text-ink-2' : 'text-accent')}>
        <span className={cn('size-1.5 rounded-full bg-current', active && 'motion-safe:animate-pulse')} aria-hidden />
        {label}
      </span>
      <Waveform levels={levels} playing height={30} label={`${label} audio level`} className={you ? '[--wave-on:var(--ink-2)]' : undefined} />
    </div>
  );
}

function Ended({ call, elapsed, onAgain }: { call: CallControls; elapsed: number; onAgain: () => void }) {
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setWaited(true), 45_000);
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      <div className="grid gap-1" role="status">
        <p className="text-[14px] text-ink-2">Call ended after {clock(elapsed)}.</p>
        {call.caseRef ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xl font-bold tracking-tight sm:text-2xl">
              Your reference is <span className="whitespace-nowrap font-mono">{call.caseRef}</span>
            </p>
            <CopyButton value={call.caseRef} label="Copy reference" />
          </div>
        ) : waited || !call.lines.length ? (
          <p className="text-lg font-semibold">A coordinator will send your reference once they have read the call.</p>
        ) : (
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Spinner size={16} className="text-accent" /> Filing your call…
          </p>
        )}
      </div>
      {call.error && <p className="text-[13px] text-ink-2">{call.error}</p>}
      <p className="text-[14px] text-ink-2">A coordinator reviews every call and follows up. Quote the reference if you contact us again.</p>
      <Button className="justify-self-stretch sm:justify-self-start" icon="call" onClick={onAgain}>
        Call again
      </Button>
    </>
  );
}

const DESKTOP = '(min-width: 1024px)';

/**
 * The call so far. Desktop: a list that scrolls inside the panel. Phones: chat bubbles in the page
 * itself (no box-in-a-box scrolling); the page follows new lines only while the caller is already at
 * the bottom, and offers a "Latest" button when they have scrolled up to reread.
 */
function Transcript({ lines, partial }: { lines: CallLine[]; partial: string }) {
  const list = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const [behind, setBehind] = useState(false);

  // Phones: track whether the caller is reading the newest lines.
  useEffect(() => {
    const onScroll = () => {
      const el = document.scrollingElement ?? document.documentElement;
      pinned.current = el.scrollHeight - (window.scrollY + window.innerHeight) < 120;
      if (pinned.current) setBehind(false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toLatest = (smooth: boolean) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const end = list.current?.lastElementChild;
    // Leave room for the call controls fixed at the bottom of the screen.
    if (end) window.scrollTo({ top: window.scrollY + end.getBoundingClientRect().bottom - window.innerHeight + 96, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    if (window.matchMedia(DESKTOP).matches) {
      // Follow the newest line inside the list only; never scroll the page under the caller.
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (pinned.current) toLatest(true);
    else setBehind(true);
  }, [lines.length, partial]);

  if (!lines.length && !partial) return <p className="text-[13px] text-ink-2">The assistant will greet you in a moment.</p>;
  const bubble = (who: CallLine['who']) =>
    cn(
      'grid min-w-0 max-w-[88%] gap-1 rounded-ui-lg border-(length:--bw) px-3 py-2 text-[15px] leading-snug',
      who === 'agent' ? 'justify-self-start border-line bg-surface' : 'justify-self-end border-accent/25 bg-accent-soft',
      'lg:max-w-none lg:justify-self-stretch lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-2.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:text-[14px] lg:leading-normal',
    );
  return (
    <>
      <ol ref={list} aria-label="Call transcript" aria-live="polite" aria-relevant="additions" className="grid content-start gap-2 lg:min-h-0 lg:flex-1 lg:gap-2.5 lg:overflow-y-auto lg:pr-1">
        {lines.map((l) => (
          <li key={l.id} className={cn(bubble(l.who), 'motion-safe:animate-[step-in_var(--dur-base)_var(--out)]')}>
            <span className="flex items-baseline gap-2 lg:grid lg:content-start lg:gap-0.5 lg:pt-0.5">
              <b className={cn('font-mono text-[10.5px] font-semibold uppercase tracking-wider', l.who === 'agent' ? 'text-accent' : 'text-ink-2')}>{l.who === 'agent' ? 'Assistant' : 'You'}</b>
              <span className="font-mono text-[10.5px] tabular-nums text-ink-2">{clock(l.at)}</span>
            </span>
            <span className="min-w-0 break-words">
              {l.text}
              {l.cut && <span className="ml-1 text-[12px] text-ink-2">(interrupted)</span>}
            </span>
          </li>
        ))}
        {partial && (
          <li className={cn(bubble('you'), 'border-dashed')} aria-hidden>
            <b className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-2 lg:pt-0.5">You</b>
            <span className="min-w-0 break-words text-ink-2">
              {partial}
              <Captions size={13} className="ml-1.5 inline align-[-2px] opacity-60" />
            </span>
          </li>
        )}
      </ol>
      {behind && (
        <button
          type="button"
          onClick={() => {
            setBehind(false);
            toLatest(true);
          }}
          className="fixed bottom-24 left-1/2 z-(--z-sticky) flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border-(length:--bw) border-line-strong bg-surface px-3.5 py-2 text-[13px] font-semibold shadow-ui lg:hidden"
        >
          Latest <span aria-hidden>↓</span>
        </button>
      )}
    </>
  );
}

/** Name, email and phone typed by the caller, for when speech recognition mangles the spelling. */
function TypeDetails({ call, initial }: { call: CallControls; initial?: TypedDetails }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Required<TypedDetails>>({ name: initial?.name ?? '', email: initial?.email ?? '', phone: initial?.phone ?? '', address: initial?.address ?? '' });
  const [state, setState] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; error?: string }>({ kind: 'idle' });
  const set = (k: keyof TypedDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    if (state.kind === 'saved') setState({ kind: 'idle' });
  };

  if (!open)
    return (
      <Button variant="ghost" size="sm" className="justify-self-start" aria-expanded={false} onClick={() => setOpen(true)}>
        <Icon name="note" size={16} />
        {initial ? 'Check or change your details' : 'Tricky spelling? Type your name or email'}
      </Button>
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: 'saving' });
    try {
      await call.saveTyped({ name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), address: v.address.trim() });
      setState({ kind: 'saved' });
    } catch (err) {
      setState({ kind: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-ui-lg border-(length:--bw) border-line bg-surface-2/40 p-3.5" aria-label="Type your details">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow as="h3">Type your details</Eyebrow>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 cursor-pointer place-items-center rounded-ui text-ink-2 hover:bg-surface-2 hover:text-ink">
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Full name" value={v.name} onChange={set('name')} autoComplete="name" maxLength={120} />
        <Input label="Email" type="email" value={v.email} onChange={set('email')} autoComplete="email" maxLength={200} />
        <Input label="Phone" type="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" maxLength={40} />
        <Input label="Property address" value={v.address} onChange={set('address')} autoComplete="street-address" maxLength={240} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" loading={state.kind === 'saving'} disabled={!v.name.trim() && !v.email.trim() && !v.phone.trim() && !v.address.trim()}>
          Save details
        </Button>
        {state.kind === 'saved' && (
          <span role="status" className="flex items-center gap-1.5 text-[13px] text-ok">
            <Icon name="check" size={14} />
            {call.phase === 'live' ? 'Saved. The assistant now has the exact spelling.' : 'Saved on your case.'}
          </span>
        )}
        {state.kind === 'error' && (
          <span role="alert" className="text-[13px] text-bad">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
