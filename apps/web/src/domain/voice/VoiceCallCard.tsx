'use client';

import { Mic, MicOff, Pause, PhoneOff, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { duration } from '@/lib/format';
import { useReducedMotion } from '@/lib/hooks';
import { Button, StatusChip } from '@/ui';
import { Waveform } from './Waveform';

export interface CallTurn {
  speaker: string;
  text: string;
  atMs: number;
  /** True when the agent is speaking. */
  agent?: boolean;
}

export type CallState = 'ringing' | 'live' | 'agent_speaking' | 'caller_speaking' | 'ended' | 'failed';

export interface CallView {
  title: string;
  caller: string;
  turns: CallTurn[];
  durationMs: number;
  /** Live mode only: current state. */
  state?: CallState;
  error?: string;
}

const STATE_LABEL: Record<CallState, string> = {
  ringing: 'Ringing',
  live: 'Live',
  agent_speaking: 'Agent speaking',
  caller_speaking: 'Caller speaking',
  ended: 'Ended',
  failed: 'Failed',
};

/** Deterministic peaks from the transcript, so a recording always draws the same waveform. */
function peaksFor(turns: CallTurn[], n = 64) {
  const text = turns.map((t) => t.text).join(' ') || 'call';
  return Array.from({ length: n }, (_, i) => 0.25 + 0.7 * (((text.charCodeAt((i * 7) % text.length) * 31 + i * 17) % 100) / 100));
}

/**
 * A call handled by the voice agent. 'recording' plays a transcript back turn by turn;
 * 'live' shows controls and the state passed in (wired when the voice agent is configured).
 */
export function VoiceCallCard({ call, mode, onMute, onEnd }: { call: CallView; mode: 'live' | 'recording'; onMute?: (muted: boolean) => void; onEnd?: () => void }) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [posMs, setPosMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const peaks = useMemo(() => peaksFor(call.turns), [call.turns]);
  const total = Math.max(call.durationMs, (call.turns.at(-1)?.atMs ?? 0) + 3000);

  useEffect(() => {
    if (!playing) return;
    if (reduced) {
      setPosMs(total);
      setPlaying(false);
      return;
    }
    const started = performance.now() - posMs;
    const id = setInterval(() => {
      const p = performance.now() - started;
      if (p >= total) {
        setPosMs(total);
        setPlaying(false);
      } else setPosMs(p);
    }, 100);
    return () => clearInterval(id);
    // posMs is read once when playback starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reduced, total]);

  const active = mode === 'recording' ? call.turns.findLastIndex((t) => t.atMs <= posMs) : call.turns.length - 1;
  const state: CallState = mode === 'live' ? (call.state ?? 'live') : playing ? (call.turns[active]?.agent ? 'agent_speaking' : 'caller_speaking') : posMs >= total ? 'ended' : 'live';

  return (
    <div className="grid gap-3.5">
      <div className="flex items-center gap-3">
        {mode === 'recording' ? (
          <Button
            variant="primary"
            size="sm"
            className="aspect-square px-0"
            aria-label={playing ? 'Pause recording' : 'Play recording'}
            onClick={() => {
              if (posMs >= total) setPosMs(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
          </Button>
        ) : (
          <span className={cn('grid size-9 place-items-center rounded-full', state === 'failed' ? 'bg-bad/15 text-bad' : 'bg-accent-soft text-accent')} aria-hidden>
            <Mic size={16} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <b className="block truncate text-sm">{call.title}</b>
          <span className="text-[12px] text-ink-2">
            {call.caller} · {mode === 'recording' ? `${duration(posMs)} / ${duration(total)}` : duration(call.durationMs)}
          </span>
        </div>
        <StatusChip status={state === 'failed' ? 'failed' : state === 'ended' ? 'resolved' : state === 'ringing' ? 'new' : 'running'} label={mode === 'recording' && state === 'live' ? 'Recording' : STATE_LABEL[state]} />
      </div>
      <Waveform levels={peaks} progress={mode === 'recording' ? posMs / total : state === 'ringing' ? 0 : 1} playing={mode === 'recording' ? playing : state !== 'ended' && state !== 'failed' && state !== 'ringing'} />
      {call.error && <p role="alert" className="text-[13px] text-bad">{call.error}</p>}
      <ol className="grid gap-2" aria-live={playing ? 'polite' : undefined}>
        {call.turns.map((t, i) => (
          <li key={i} className={cn('grid grid-cols-[64px_minmax(0,1fr)] gap-2.5 text-[13.5px] transition-opacity duration-300', mode === 'recording' && i > active && 'opacity-40')}>
            <b className={cn('pt-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider', t.agent ? 'text-accent' : 'text-ink-2')}>{t.speaker}</b>
            <span>{t.text}</span>
          </li>
        ))}
      </ol>
      {mode === 'live' && state !== 'ended' && state !== 'failed' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setMuted(!muted);
              onMute?.(!muted);
            }}
            aria-pressed={muted}
          >
            {muted ? <MicOff size={15} aria-hidden /> : <Mic size={15} aria-hidden />}
            {muted ? 'Unmute' : 'Mute'}
          </Button>
          <Button size="sm" variant="danger" onClick={onEnd}>
            <PhoneOff size={15} aria-hidden />
            End call
          </Button>
        </div>
      )}
    </div>
  );
}
