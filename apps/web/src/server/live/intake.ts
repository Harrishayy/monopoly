import 'server-only';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { RunView, SourceKind } from '@casework/core';
import { getPack } from '@casework/tracks';
import { ACTIVE_TRACK } from '../config';
import { addressFor, attachCrm } from './directory';
import { getRun, startRun, subscribe } from '../runs';
import {
  countSources,
  findCaseByThread,
  findOpenCaseByContact,
  getLiveCaseRow,
  getSourceByExternalId,
  hasExternalId,
  insertCase,
  insertOutbound,
  insertSource,
  liveCase,
  sourcesFor,
  nextRef,
  supersedePending,
  updateCase,
  updateSourceBody,
  type Outbound,
} from './store';

/**
 * One entry point for every live channel (voice, email, web form). A message either opens a new
 * case or joins the caller's open one; the agent then runs on the whole case and its proposed
 * step goes through the outbound gate. Channel adapters only translate their payload into this.
 */

export interface InboundMessage {
  channel: Extract<SourceKind, 'call' | 'email' | 'sms' | 'note'>;
  /** Phone number or email address. Used to join follow-ups onto the open case. */
  contact?: string;
  name?: string;
  /** Short subject; becomes the case title on a new case. */
  title: string;
  body: string;
  receivedAt?: string;
  /** Provider id (ElevenLabs conversation id, Gmail Message-ID). Makes ingest idempotent. */
  externalId?: string;
  meta?: Record<string, unknown>;
  /** Don't start the agent yet (e.g. a call still in progress). */
  deferRun?: boolean;
  /** Join this case instead of matching on contact. */
  caseRef?: string;
}

export interface IngestResult {
  caseRef: string;
  sourceId: string;
  created: boolean;
  duplicate: boolean;
  runId?: string;
}

export type LiveSignal =
  | { kind: 'case.opened'; caseRef: string; title: string; channel: string }
  | { kind: 'case.updated'; caseRef: string; sourceId: string }
  | { kind: 'case.hidden'; caseRef: string; hidden: boolean }
  | { kind: 'run.started'; caseRef: string; runId: string }
  | { kind: 'run.finished'; caseRef: string; runId: string; outcome?: string }
  | { kind: 'outbound'; caseRef: string; id: string; status: string };

const g = globalThis as unknown as { __caseworkLiveBus?: EventEmitter };
export const liveBus: EventEmitter = (g.__caseworkLiveBus ??= new EventEmitter().setMaxListeners(100));
export const emitLive = (s: LiveSignal) => liveBus.emit('signal', s);

export function ingest(m: InboundMessage): IngestResult {
  const now = new Date().toISOString();
  const receivedAt = m.receivedAt ?? now;

  if (m.externalId && hasExternalId(m.externalId)) {
    const s = getSourceByExternalId(m.externalId)!;
    return { caseRef: s.caseRef, sourceId: s.id, created: false, duplicate: true };
  }

  const threadId = typeof m.meta?.threadId === 'string' ? m.meta.threadId : undefined;
  let row =
    (m.caseRef ? getLiveCaseRow(m.caseRef) : undefined) ??
    (threadId ? findCaseByThread(threadId) : undefined) ??
    (m.contact ? findOpenCaseByContact(m.contact) : undefined);
  const created = !row;
  if (!row) {
    const ref = nextRef();
    insertCase({
      ref,
      title: m.title,
      customerName: m.name ?? m.contact ?? 'Unknown caller',
      contact: m.contact ?? null,
      channel: m.channel,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    });
    row = getLiveCaseRow(ref)!;
  }

  // Numbered by message only, so the CRM record doesn't shift event numbers.
  const sourceId = `${row.ref}:event-${countSources(row.ref) - (sourcesFor(row.ref).some((s) => s.id === `${row.ref}:crm`) ? 1 : 0) + 1}`;
  insertSource(
    row.ref,
    { id: sourceId, kind: m.channel, title: m.title, receivedAt, body: m.body, meta: { ...m.meta, contact: m.contact, name: m.name } },
    m.externalId,
  );
  attachCrm(row.ref, row.contact, receivedAt);
  updateCase(row.ref, { updatedAt: now, ...(m.name && row.customerName === row.contact ? { customerName: m.name } : {}) });
  emitLive(created ? { kind: 'case.opened', caseRef: row.ref, title: row.title, channel: m.channel } : { kind: 'case.updated', caseRef: row.ref, sourceId });

  const runId = m.deferRun ? undefined : runLiveCase(row.ref);
  return { caseRef: row.ref, sourceId, created, duplicate: false, runId };
}

/** Replace a message's body (e.g. the full transcript arriving after a mid-call note), then rerun. */
export function amend(externalId: string, body: string, meta: Record<string, unknown> = {}, rerun = true): IngestResult | undefined {
  const s = getSourceByExternalId(externalId);
  if (!s) return undefined;
  updateSourceBody(externalId, body, { ...s.meta, ...meta });
  emitLive({ kind: 'case.updated', caseRef: s.caseRef, sourceId: s.id });
  return { caseRef: s.caseRef, sourceId: s.id, created: false, duplicate: false, runId: rerun ? runLiveCase(s.caseRef) : undefined };
}

/** Runs the agent on the case as it stands now and gates whatever it proposes. */
export function runLiveCase(caseRef: string): string | undefined {
  const c = liveCase(caseRef);
  if (!c) return undefined;
  const pack = getPack(c.track ?? ACTIVE_TRACK);
  const mode = process.env.ANTHROPIC_API_KEY ? 'model' : 'rules';
  updateCase(caseRef, { status: 'running', updatedAt: new Date().toISOString() });
  const runId = startRun(c, pack, { autonomy: pack.autonomy, mode, tag: { kind: 'live', name: 'Live intake' } });
  emitLive({ kind: 'run.started', caseRef, runId });
  const unsubscribe = subscribe(runId, (s) => {
    if (s.kind !== 'end') return;
    unsubscribe();
    const view = getRun(runId)?.view;
    if (!view) return;
    updateCase(caseRef, { status: (view.outcome === 'declined' ? 'blocked' : (view.outcome ?? 'failed')) as never, updatedAt: new Date().toISOString() });
    gateOutbound(caseRef, runId, view);
    emitLive({ kind: 'run.finished', caseRef, runId, outcome: view.outcome });
  });
  return runId;
}

// ── outbound gate ────────────────────────────────────────────────────────

export type Sender = (o: Outbound) => Promise<void>;
const gs = globalThis as unknown as { __caseworkSenders?: Map<string, Sender> };
const senders: Map<string, Sender> = (gs.__caseworkSenders ??= new Map());
/** Channel adapters register how they deliver (e.g. 'email' → SMTP). */
export const registerSender = (channel: string, send: Sender) => senders.set(channel, send);

/** Auto-send only these: low-stakes messages back to the person who contacted us. */
export const AUTO_SEND = new Set(['tenant.update', 'tenant.ask', 'tenant.chase']);
export const AUTO_SEND_MIN_CONFIDENCE = 0.7;
/** Internal steps: nothing is sent, so the gate has nothing to hold. */
export const NO_OUTBOUND = new Set(['case.wait', 'case.close', 'case.escalate']);

/** The checks in gateOutbound, in plain words, for the rules page. Keep in step with the code below. */
export const GATE_CONDITIONS = [
  'The proposed action is one of the auto-send actions (a reply, question or chase to the tenant)',
  `The agent's confidence is at least ${AUTO_SEND_MIN_CONFIDENCE * 100}%`,
  'The run did not escalate or produce a handover',
  'No policy rule blocked an action during the run',
  'There is an address on file for the recipient (from the contact or the CRM register)',
  'A live channel is connected to deliver it',
];

/**
 * Decides what happens to the agent's proposed step. A reply to the customer on the channel they
 * used goes out automatically only when it is low-stakes, confident, the run did not escalate and
 * nothing was blocked. Everything else is held for a person to approve on the case page.
 */
export function gateOutbound(caseRef: string, runId: string, view: RunView) {
  // The newest run is the current view of the case: older drafts nobody acted on are stale.
  for (const id of supersedePending(caseRef, `${runId}:out`)) emitLive({ kind: 'outbound', caseRef, id, status: 'superseded' });
  const next = view.next;
  if (!next || NO_OUTBOUND.has(next.action)) return;
  const row = getLiveCaseRow(caseRef);
  const address = addressFor(caseRef, next.recipient);
  const channel = address?.includes('@') ? 'email' : next.channel;
  const reasons: string[] = [];
  if (!AUTO_SEND.has(next.action)) reasons.push(`${next.action} needs a person's sign-off`);
  if (next.confidence < AUTO_SEND_MIN_CONFIDENCE) reasons.push(`confidence ${Math.round(next.confidence * 100)}% is under ${AUTO_SEND_MIN_CONFIDENCE * 100}%`);
  if (view.outcome === 'escalated' || view.handover) reasons.push('the run escalated');
  if (view.blocked.length) reasons.push('a policy rule blocked an action');
  if (!address) reasons.push(`no address on file for ${next.recipient}`);
  if (!senders.has(channel)) reasons.push(`no live ${channel} channel connected`);

  const o: Outbound = {
    id: `${runId}:out`,
    caseRef,
    runId,
    channel,
    recipient: next.recipient,
    address,
    subject: row ? `Re: ${row.title} [${caseRef}]` : caseRef,
    body: next.message,
    status: reasons.length ? 'awaiting_approval' : 'sent',
    why: reasons.length ? reasons.join('; ') : 'Low-stakes reply to the customer, confident, no escalation',
    createdAt: new Date().toISOString(),
    sentAt: null,
    error: null,
  };
  if (reasons.length) {
    insertOutbound(o);
    emitLive({ kind: 'outbound', caseRef, id: o.id, status: o.status });
    return;
  }
  insertOutbound({ ...o, status: 'awaiting_approval' });
  void deliver(o.id, o);
}

/** Sends an outbound message through its channel and records the result. Never throws. */
export async function deliver(id: string, o: Outbound): Promise<{ ok: boolean; error?: string }> {
  const { setOutboundStatus } = await import('./store');
  if (o.channel === 'email' && !senders.has('email')) {
    const { ensureEmailSender } = await import('./channels/email');
    ensureEmailSender();
  }
  const send = senders.get(o.channel);
  if (!send || !o.address) {
    const error = !send ? `No live ${o.channel} channel connected` : 'No address';
    setOutboundStatus(id, 'failed', { error });
    emitLive({ kind: 'outbound', caseRef: o.caseRef, id, status: 'failed' });
    return { ok: false, error };
  }
  try {
    await send(o);
    setOutboundStatus(id, 'sent', { sentAt: new Date().toISOString() });
    emitLive({ kind: 'outbound', caseRef: o.caseRef, id, status: 'sent' });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    setOutboundStatus(id, 'failed', { error });
    emitLive({ kind: 'outbound', caseRef: o.caseRef, id, status: 'failed' });
    return { ok: false, error };
  }
}

export const newId = () => randomUUID();
