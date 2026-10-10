import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { REPO_ROOT } from '../../config';
import { amend, ingest, type IngestResult } from '../intake';
import { getSourceByExternalId, kvGet, kvSet } from '../store';

/**
 * ElevenLabs voice adapter. Three ways a call reaches a case, all idempotent on the conversation id:
 *  - in call: the agent's `log_issue` webhook tool (needs PUBLIC_URL via the tunnel)
 *  - after the call: the signed post-call transcription webhook
 *  - fallback: a poller over the agent's finished conversations, for when nothing can reach localhost
 */

const API = 'https://api.elevenlabs.io';
/** `pnpm voice:setup` writes ids and the webhook secret into .env while the server runs; re-read it when one is missing. */
export function env(name: string, fresh = false): string | undefined {
  if (fresh || !process.env[name]) {
    try {
      const parsed = parseEnv(readFileSync(resolve(/* turbopackIgnore: true */ REPO_ROOT, '.env'), 'utf8'));
      for (const [k, v] of Object.entries(parsed)) if (v && (!process.env[k] || (fresh && k === name))) process.env[k] = v;
    } catch {
      // No .env: leave the variable unset.
    }
  }
  return process.env[name] || undefined;
}
const key = () => env('ELEVENLABS_API_KEY');
const agentId = () => env('ELEVENLABS_AGENT_ID');
const extId = (conversationId: string) => `elevenlabs:${conversationId}`;

async function el<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { 'xi-api-key': key()! }, cache: 'no-store' });
  if (!res.ok) throw new Error(`ElevenLabs ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** A browser-safe signed URL for one conversation with the tenant-line agent. */
export async function signedUrl(): Promise<string> {
  const { signed_url } = await el<{ signed_url: string }>(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId()!)}`);
  return signed_url;
}

export const voiceConfigured = () => !!key() && !!agentId();

// ── in call ──────────────────────────────────────────────────────────────

export interface LogIssueArgs {
  conversation_id?: string;
  caller_name?: string;
  contact?: string;
  address?: string;
  issue?: string;
  details?: string;
  urgency?: string;
}

function noteBody(a: LogIssueArgs) {
  return [
    `Phone call in progress, logged by the voice agent.`,
    a.urgency && `Urgency (caller's account): ${a.urgency}`,
    a.caller_name && `Caller: ${a.caller_name}`,
    a.contact && `Contact: ${a.contact}`,
    a.address && `Property: ${a.address}`,
    a.issue && `Issue: ${a.issue}`,
    a.details && `Details: ${a.details}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** The in-call `log_issue` tool. Opens the case on the first call and updates it on later ones. */
export function logIssue(a: LogIssueArgs): IngestResult & { say: string } {
  const conversationId = a.conversation_id || `unknown-${Date.now()}`;
  const id = extId(conversationId);
  const existing = getSourceByExternalId(id);
  const logged = { ...(existing?.meta.logged as LogIssueArgs | undefined), ...stripEmpty(a) };
  const meta = { provider: 'elevenlabs', conversationId, callState: 'in_progress', urgency: logged.urgency, address: logged.address, logged };
  // Mid-call updates rerun the agent only when urgency goes up; the post-call webhook reruns with the full transcript.
  const rank = (u?: string) => ['routine', 'urgent', 'emergency'].indexOf(u ?? 'routine');
  const prior = existing?.meta.logged as LogIssueArgs | undefined;
  const r = existing
    ? amend(id, noteBody(logged), meta, rank(logged.urgency) > rank(prior?.urgency))!
    : ingest({
        channel: 'call',
        contact: a.contact || undefined,
        name: a.caller_name || undefined,
        title: a.issue || 'Phone call',
        body: noteBody(a),
        externalId: id,
        meta,
      });
  const say =
    a.urgency === 'emergency'
      ? `Logged as an emergency under reference ${spoken(r.caseRef)}. A coordinator has been alerted now.`
      : `Logged under reference ${spoken(r.caseRef)}. A coordinator will review it and follow up with you.`;
  return { ...r, say };
}

const stripEmpty = (a: LogIssueArgs) => Object.fromEntries(Object.entries(a).filter(([, v]) => v)) as LogIssueArgs;
/** "LIVE-004" → "LIVE-004 (live, 0, 0, 4)" so the voice reads the digits one by one. */
const spoken = (ref: string) => `${ref} (live, ${ref.replace(/^LIVE-/, '').split('').join(', ')})`;

// ── after the call ───────────────────────────────────────────────────────

interface Turn {
  role: 'agent' | 'user';
  message?: string | null;
  time_in_call_secs?: number;
}

export interface ConversationData {
  conversation_id: string;
  agent_id?: string;
  status?: string;
  transcript?: Turn[];
  analysis?: { transcript_summary?: string; call_successful?: string; data_collection_results?: Record<string, { value?: unknown }> };
  metadata?: { start_time_unix_secs?: number; call_duration_secs?: number; phone_call?: { external_number?: string } };
}

const fmtTime = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function transcriptText(d: ConversationData) {
  const lines = (d.transcript ?? []).filter((t) => t.message).map((t) => `[${fmtTime(t.time_in_call_secs)}] ${t.role === 'agent' ? 'Agent' : 'Caller'}: ${t.message}`);
  return lines.join('\n');
}

/** Files the finished call's full transcript on its case (or opens one) and reruns the agent. */
export function recordFinishedCall(d: ConversationData, via: 'webhook' | 'poller'): IngestResult | undefined {
  const done = `voice:done:${d.conversation_id}`;
  if (kvGet(done)) return undefined;
  const id = extId(d.conversation_id);
  const transcript = transcriptText(d);
  const existing = getSourceByExternalId(id);
  const logged = existing?.meta.logged as LogIssueArgs | undefined;
  const summary = d.analysis?.transcript_summary;
  const body = [
    `Phone call, ${fmtTime(d.metadata?.call_duration_secs)} long.`,
    logged && `Logged during the call:\n${noteBody(logged).split('\n').slice(1).join('\n')}`,
    summary && `Call summary (voice platform): ${summary}`,
    transcript ? `Transcript:\n${transcript}` : 'No transcript was captured.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const meta = { provider: 'elevenlabs', conversationId: d.conversation_id, callState: 'ended', via, durationSecs: d.metadata?.call_duration_secs };
  const receivedAt = d.metadata?.start_time_unix_secs ? new Date(d.metadata.start_time_unix_secs * 1000).toISOString() : undefined;
  let r: IngestResult | undefined;
  if (existing) r = amend(id, body, meta);
  else if ((d.transcript ?? []).some((t) => t.role === 'user' && t.message)) {
    r = ingest({
      channel: 'call',
      contact: d.metadata?.phone_call?.external_number,
      title: summary ? summary.split(/[.!?]/)[0]!.slice(0, 90) : 'Phone call',
      body,
      receivedAt,
      externalId: id,
      meta,
    });
  }
  kvSet(done, new Date().toISOString());
  return r;
}

/**
 * Verifies an ElevenLabs webhook signature: header `t=<unix>,v0=<hex>`, where the hex is
 * HMAC-SHA256 of `<t>.<raw body>` with the webhook secret. Rejects anything older than 30 minutes.
 */
export function verifySignature(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=', 2) as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 30 * 60) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  const got = parts.v0 ?? '';
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

// ── fallback poller ──────────────────────────────────────────────────────

const POLL_MS = 15_000;

async function pollOnce() {
  const since = Number(kvGet('voice:since') ?? Math.floor(Date.now() / 1000) - 3600);
  const list = await el<{ conversations: { conversation_id: string; status: string; start_time_unix_secs: number }[] }>(
    `/v1/convai/conversations?agent_id=${encodeURIComponent(agentId()!)}&page_size=30&call_start_after_unix=${since - 600}`,
  );
  let newest = since;
  for (const c of list.conversations ?? []) {
    newest = Math.max(newest, c.start_time_unix_secs);
    if (c.status !== 'done' || kvGet(`voice:done:${c.conversation_id}`)) continue;
    const d = await el<ConversationData>(`/v1/convai/conversations/${c.conversation_id}`);
    const r = recordFinishedCall(d, 'poller');
    if (r) console.log(`[voice] poller filed call ${c.conversation_id} on ${r.caseRef}`);
  }
  // Keep a little overlap; calls that are still in progress are picked up on a later pass.
  kvSet('voice:since', String(newest));
}

export async function startVoice() {
  if (!voiceConfigured()) {
    console.log('[voice] ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID not set; voice channel off');
    return;
  }
  const tick = () => pollOnce().catch((err) => console.error('[voice] poll failed:', err instanceof Error ? err.message : err));
  setInterval(tick, POLL_MS).unref?.();
  void tick();
  if (!env('ELEVENLABS_WEBHOOK_SECRET')) console.warn('[voice] ELEVENLABS_WEBHOOK_SECRET not set: post-call webhooks are accepted unsigned');
  console.log(`[voice] polling agent ${agentId()} every ${POLL_MS / 1000}s; webhook ${process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/voice/webhook` : 'not reachable (no PUBLIC_URL)'}`);
}
