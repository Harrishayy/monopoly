'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type CallPhase = 'idle' | 'mic' | 'connecting' | 'live' | 'ended' | 'failed';

export interface CallLine {
  id: number;
  who: 'agent' | 'you';
  text: string;
  /** Seconds into the call. */
  at: number;
  /** The caller talked over the agent before it finished this line. */
  cut?: boolean;
}

export interface AudioDevice {
  id: string;
  label: string;
}

const CONNECT_TIMEOUT_MS = 15_000;
/** No input above this level for this long, and no words transcribed: the mic is probably the wrong one. */
const HEARD_LEVEL = 0.02;
const SILENT_AFTER_MS = 9_000;

/** The caller winding up: "bye", "that's all", "nothing else". */
const CALLER_BYE = /\b(good ?bye|bye|cheers|that'?s (all|everything|it)|nothing else)\b/i;
/** The assistant signing off. "Take care" only counts at the very end, so safety advice mid-sentence doesn't trigger it. */
const AGENT_BYE = /\b(good ?bye|bye( now| for now)?)\b|\btake care[.!]?$/i;
/** After the assistant's goodbye finishes playing, hang up this long later unless the caller speaks again. */
const HANGUP_AFTER_MS = 1200;
const HANGUP_CAP_MS = 12_000;

export interface TypedDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/** The assistant's opening line when the caller filled in their details first, so it doesn't ask for their name again. */
function greeting(d: TypedDetails) {
  const first = d.name?.trim().split(/\s+/)[0];
  return `Hello${first ? ` ${first}` : ''}, thanks for your details${d.address ? `; I've got the property as ${d.address}` : ''}. What's the problem?`;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : typeof err === 'string' ? err : 'Something went wrong.');

function micError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone access is blocked. Allow it from the icon in your browser’s address bar, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone found. Plug one in or pick another, then try again.';
  if (name === 'NotReadableError') return 'Another app is using your microphone. Close it, then try again.';
  return 'We could not open your microphone. Check it is connected, then try again.';
}

async function listDevices(): Promise<{ inputs: AudioDevice[]; outputs: AudioDevice[] }> {
  if (!navigator.mediaDevices?.enumerateDevices) return { inputs: [], outputs: [] };
  const all = await navigator.mediaDevices.enumerateDevices();
  const pick = (kind: MediaDeviceKind) =>
    all
      .filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'communications')
      .map((d, i) => ({ id: d.deviceId, label: d.label || (kind === 'audioinput' ? `Microphone ${i + 1}` : `Speaker ${i + 1}`) }));
  return { inputs: pick('audioinput'), outputs: pick('audiooutput') };
}

/**
 * One portal call to the tenant line: microphone checks, connection with a timeout, live captions
 * (tentative and final), device switching, a "we can't hear you" check, and the case reference once
 * the voice agent has filed it.
 */
export function useCall() {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [error, setError] = useState<string>();
  const [lines, setLines] = useState<CallLine[]>([]);
  const [partial, setPartial] = useState('');
  const [caseRef, setCaseRef] = useState<string>();
  const [startedAt, setStartedAt] = useState<number>();
  const [endedAt, setEndedAt] = useState<number>();
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([]);
  const [inputId, setInputId] = useState<string>('default');
  const [outputId, setOutputId] = useState<string>('default');
  const [notHeard, setNotHeard] = useState(false);
  const [closing, setClosing] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const callerBye = useRef(false);
  /** Details from the pre-call form, filed on the case as soon as the call connects. */
  const pending = useRef<TypedDetails>(undefined);

  const phaseRef = useRef<CallPhase>('idle');
  const convId = useRef<string>(undefined);
  const startRef = useRef(0);
  const lineId = useRef(0);
  const heard = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const go = (p: CallPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const at = () => Math.max(0, Math.round((Date.now() - startRef.current) / 1000));

  const lookupRef = useCallback(async () => {
    const id = convId.current;
    if (!id) return undefined;
    try {
      const r = (await (await fetch(`/api/portal/call/${encodeURIComponent(id)}`, { cache: 'no-store' })).json()) as { caseRef?: string | null };
      if (r.caseRef) setCaseRef(r.caseRef);
      return r.caseRef ?? undefined;
    } catch {
      return undefined;
    }
  }, []);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      clearTimeout(timeout.current);
      convId.current = conversationId;
      setConversationId(conversationId);
      startRef.current = Date.now();
      setStartedAt(startRef.current);
      go('live');
    },
    onDisconnect: (details) => {
      clearTimeout(timeout.current);
      setClosing(false);
      setPartial('');
      setEndedAt(Date.now());
      const wasLive = phaseRef.current === 'live';
      if (details.reason === 'error') {
        setError(wasLive ? 'The call dropped. Anything you said has been saved; you can call again.' : details.message || 'We could not connect the call.');
        go(wasLive ? 'ended' : 'failed');
      } else if (wasLive) go('ended');
      else if (phaseRef.current === 'connecting') {
        setError('The call could not be connected. Try again in a moment.');
        go('failed');
      }
    },
    onError: (message) => {
      if (phaseRef.current === 'live') setError(typeof message === 'string' ? message : 'The line is having trouble.');
    },
    onMessage: (m) => {
      const text = m.message?.trim();
      if (!text) return;
      const who = m.role === 'user' || m.source === 'user' ? 'you' : 'agent';
      if (who === 'you') {
        heard.current = true;
        setNotHeard(false);
        setPartial('');
        // Speaking again after a goodbye keeps the call open.
        callerBye.current = CALLER_BYE.test(text);
        setClosing(false);
      } else if (AGENT_BYE.test(text) && (callerBye.current || !text.endsWith('?'))) setClosing(true);
      setLines((l) => [...l, { id: lineId.current++, who, text, at: at() }]);
    },
    onIncomingEvent: (event) => {
      const e = event as { type?: string; tentative_user_transcription_event?: { user_transcript?: string } };
      if (e.type === 'tentative_user_transcript') setPartial(e.tentative_user_transcription_event?.user_transcript ?? '');
    },
    onAgentResponseCorrection: (c) => {
      const fixed = (c as { corrected_agent_response?: string }).corrected_agent_response?.trim();
      if (!fixed) return;
      setLines((l) => {
        const i = l.findLastIndex((x) => x.who === 'agent');
        return i < 0 ? l : l.map((x, j) => (j === i ? { ...x, text: fixed, cut: true } : x));
      });
    },
    onInterruption: () =>
      setLines((l) => {
        const i = l.findLastIndex((x) => x.who === 'agent');
        return i < 0 || l[i]!.cut ? l : l.map((x, j) => (j === i ? { ...x, cut: true } : x));
      }),
    onAgentToolResponse: () => void lookupRef(),
  });
  // The hook's object changes every render; its functions are stable, so depend on those.
  const { status, isSpeaking, isMuted, setMuted, startSession, endSession, sendContextualUpdate, changeInputDevice, changeOutputDevice, getInputVolume, getOutputVolume } = conversation;

  const refreshDevices = useCallback(async () => {
    try {
      const d = await listDevices();
      setInputs(d.inputs);
      setOutputs(d.outputs);
      return d;
    } catch {
      return { inputs: [], outputs: [] };
    }
  }, []);

  // Device list follows plugs and unplugs. If the mic in use disappears mid-call, fall back to the default.
  useEffect(() => {
    void refreshDevices();
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const onChange = async () => {
      const d = await refreshDevices();
      if (inputId !== 'default' && !d.inputs.some((x) => x.id === inputId)) {
        setInputId('default');
        if (phaseRef.current === 'live') await changeInputDevice({}).catch(() => {});
      }
    };
    md.addEventListener('devicechange', onChange);
    return () => md.removeEventListener('devicechange', onChange);
  }, [refreshDevices, inputId, changeInputDevice]);

  const start = useCallback(async (details?: TypedDetails) => {
    pending.current = details;
    setError(undefined);
    setNotHeard(false);
    // Browsers only expose the microphone on https or localhost; anywhere else mediaDevices is missing.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Calls need a secure page. Open this site over https (or on localhost) to use your microphone.');
      go('failed');
      return;
    }
    go('mic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: inputId === 'default' ? true : { deviceId: { exact: inputId } } });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      setError(micError(err));
      go('failed');
      return;
    }
    // Labels are only readable after permission, so list again now.
    void refreshDevices();
    go('connecting');
    try {
      const res = await fetch('/api/voice/session', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { signedUrl?: string; error?: string };
      if (!body.signedUrl) throw new Error(res.status === 503 ? 'Calls are switched off right now. Please report the issue in writing below.' : 'The tenant line is not answering. Try again in a moment, or write to us below.');
      setLines([]);
      setPartial('');
      setClosing(false);
      setConversationId(undefined);
      callerBye.current = false;
      setCaseRef(undefined);
      setEndedAt(undefined);
      heard.current = false;
      convId.current = undefined;
      timeout.current = setTimeout(() => {
        if (phaseRef.current !== 'connecting') return;
        setError('The call took too long to connect. Check your internet connection and try again.');
        go('failed');
        endSession();
      }, CONNECT_TIMEOUT_MS);
      startSession({
        signedUrl: body.signedUrl,
        ...(inputId !== 'default' && { inputDeviceId: inputId }),
        ...(details?.name && { overrides: { agent: { firstMessage: greeting(details) } } }),
      });
    } catch (err) {
      setError(errorText(err));
      go('failed');
    }
  }, [startSession, endSession, inputId, refreshDevices]);

  const end = useCallback(() => {
    // Hanging up before the agent answers is a cancel, not a failure.
    if (phaseRef.current !== 'live') go('idle');
    clearTimeout(timeout.current);
    endSession();
  }, [endSession]);

  const chooseInput = useCallback(
    async (id: string) => {
      setInputId(id);
      if (phaseRef.current !== 'live') return;
      try {
        await changeInputDevice(id === 'default' ? {} : { inputDeviceId: id });
        heard.current = false;
      } catch {
        setError('That microphone could not be opened. Pick another one.');
      }
    },
    [changeInputDevice],
  );

  const chooseOutput = useCallback(
    async (id: string) => {
      setOutputId(id);
      if (phaseRef.current !== 'live') return;
      await changeOutputDevice(id === 'default' ? {} : { outputDeviceId: id }).catch(() => setError('That speaker could not be used. Pick another one.'));
    },
    [changeOutputDevice],
  );

  const inputLevel = useCallback(() => {
    try {
      return phaseRef.current === 'live' ? getInputVolume() : 0;
    } catch {
      return 0;
    }
  }, [getInputVolume]);
  const outputLevel = useCallback(() => {
    try {
      return phaseRef.current === 'live' ? getOutputVolume() : 0;
    } catch {
      return 0;
    }
  }, [getOutputVolume]);

  // "We can't hear you": nothing above a whisper on the mic and no words transcribed.
  useEffect(() => {
    if (phase !== 'live') return;
    const since = Date.now();
    const id = setInterval(() => {
      if (isMuted || heard.current) setNotHeard(false);
      else if (inputLevel() > HEARD_LEVEL) {
        heard.current = true;
        setNotHeard(false);
      } else if (Date.now() - since > SILENT_AFTER_MS) setNotHeard(true);
    }, 300);
    return () => clearInterval(id);
  }, [phase, isMuted, inputLevel, inputId]);

  // The voice agent files the case mid-call; after hang-up the post-call webhook may still be on its way.
  useEffect(() => {
    if (phase === 'live') {
      const id = setInterval(() => void lookupRef(), 4000);
      return () => clearInterval(id);
    }
    if (phase === 'ended' && !caseRef) {
      let tries = 0;
      const id = setInterval(async () => {
        if ((await lookupRef()) || ++tries >= 15) clearInterval(id);
      }, 3000);
      void lookupRef();
      return () => clearInterval(id);
    }
  }, [phase, caseRef, lookupRef]);

  // Hang up after the assistant's goodbye, in case the agent itself doesn't end the call.
  useEffect(() => {
    if (!closing || phase !== 'live' || isSpeaking) return;
    const id = setTimeout(endSession, HANGUP_AFTER_MS);
    return () => clearTimeout(id);
  }, [closing, isSpeaking, phase, endSession]);
  useEffect(() => {
    if (!closing || phase !== 'live') return;
    const id = setTimeout(endSession, HANGUP_CAP_MS);
    return () => clearTimeout(id);
  }, [closing, phase, endSession]);

  /** Saves what the caller typed on the case and, mid-call, tells the assistant the exact spelling. */
  const saveTyped = useCallback(
    async (t: TypedDetails) => {
      const id = convId.current;
      if (!id) throw new Error('The call has not connected yet.');
      const res = await fetch(`/api/portal/call/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      });
      const body = (await res.json().catch(() => ({}))) as { caseRef?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'We could not save that. Please try again.');
      if (body.caseRef) setCaseRef(body.caseRef);
      if (phaseRef.current === 'live') {
        const said = [t.name && `name "${t.name}"`, t.email && `email "${t.email}"`, t.phone && `phone "${t.phone}"`, t.address && `property address "${t.address}"`].filter(Boolean).join(', ');
        try {
          sendContextualUpdate(`The caller typed their details on screen: ${said}. These are saved on the case. Use these exact spellings and don't ask them to spell these again.`);
        } catch {
          // The details are saved on the case either way.
        }
      }
    },
    [sendContextualUpdate],
  );

  // File the pre-call details once the call has an id: the case opens with the caller's name and contact,
  // and the assistant gets the exact spellings so it doesn't ask for them.
  useEffect(() => {
    const d = pending.current;
    if (phase !== 'live' || !conversationId || !d) return;
    pending.current = undefined;
    void saveTyped(d).catch(() => {
      // The caller can still say or retype them; the transcript is filed either way.
    });
  }, [phase, conversationId, saveTyped]);

  // Keep the screen awake and warn before leaving while the call is live.
  useEffect(() => {
    if (phase !== 'live') return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => {});
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => {
      void lock?.release().catch(() => {});
      window.removeEventListener('beforeunload', warn);
    };
  }, [phase]);

  // Hang up if the page goes away mid-call.
  useEffect(() => () => endSession(), [endSession]);

  return {
    phase,
    status,
    speaking: isSpeaking,
    muted: isMuted,
    setMuted,
    error,
    lines,
    partial,
    caseRef,
    startedAt,
    endedAt,
    notHeard,
    closing,
    keepTalking: () => setClosing(false),
    conversationId,
    saveTyped,
    inputs,
    outputs,
    inputId,
    outputId,
    chooseInput,
    chooseOutput,
    inputLevel,
    outputLevel,
    start,
    end,
    reset: () => {
      setError(undefined);
      go('idle');
    },
  };
}

export type CallControls = ReturnType<typeof useCall>;
