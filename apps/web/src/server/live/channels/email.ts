import 'server-only';
import { liveEnv } from '../env';
import { ingest, registerSender } from '../intake';
import { kvGet, kvSet, sourcesFor, type Outbound } from '../store';

/**
 * Email adapter on AgentMail (agentmail.to): a real inbox from one API key, no domain and no
 * tunnel. Inbound mail is polled every few seconds and opened as live cases; the agent's gated
 * replies go back into the same thread. A no-op when AGENTMAIL_API_KEY or AGENTMAIL_INBOX is unset.
 */

const API = process.env.AGENTMAIL_API_URL ?? 'https://api.agentmail.to/v0';
const POLL_MS = Number(process.env.EMAIL_POLL_MS ?? 10_000);
const CURSOR_KEY = 'email:agentmail:after';

interface MessageItem {
  inbox_id: string;
  thread_id: string;
  message_id: string;
  labels: string[];
  timestamp: string;
  from: string;
  to: string[];
  subject?: string;
  preview?: string;
}

interface Message extends MessageItem {
  text?: string;
  extracted_text?: string;
  html?: string;
  attachments?: { attachment_id: string; filename?: string; content_type?: string; size?: number }[];
}

export const emailInbox = () => liveEnv('AGENTMAIL_INBOX') ?? null;

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${liveEnv('AGENTMAIL_API_KEY')}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`AgentMail ${init.method ?? 'GET'} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** "Jane Doe <jane@x.com>" → { name, address }. */
export function parseAddress(raw: string): { name?: string; address: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1]?.trim() || undefined, address: m[2]!.trim().toLowerCase() };
  return { address: raw.trim().toLowerCase() };
}

/** Drops the quoted history a mail client appends below a reply. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const QUOTE_START = [/^On .+wrote:\s*$/, /^-{2,}\s*Original Message\s*-{2,}/i, /^_{5,}\s*$/, /^>/];
  const cut = lines.findIndex((l) => QUOTE_START.some((re) => re.test(l.trim())));
  return (cut > 0 ? lines.slice(0, cut) : lines).join('\n').trim();
}

let polling = false;

async function pollOnce() {
  if (polling) return;
  polling = true;
  try {
    const inbox = emailInbox()!;
    const after = kvGet(CURSOR_KEY);
    const q = new URLSearchParams({ limit: '25', ascending: 'true', labels: 'received' });
    if (after) q.set('after', after);
    const { messages } = await api<{ messages: MessageItem[] }>(`/inboxes/${encodeURIComponent(inbox)}/messages?${q}`);
    for (const item of messages) {
      const from = parseAddress(item.from);
      // Our own sends carry the "sent" label; never ingest mail from the inbox itself.
      if (item.labels.includes('sent') || from.address === inbox.toLowerCase()) continue;
      const m = await api<Message>(`/inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(item.message_id)}`);
      const body = stripQuoted(m.extracted_text ?? m.text ?? m.preview ?? '') || '(empty email)';
      const attachments = m.attachments?.map((a) => a.filename).filter(Boolean) ?? [];
      ingest({
        channel: 'email',
        contact: from.address,
        name: from.name,
        title: (m.subject ?? '(no subject)').replace(/^\s*(re|fwd?):\s*/i, ''),
        body: attachments.length ? `${body}\n\n[Attachments: ${attachments.join(', ')}]` : body,
        receivedAt: new Date(m.timestamp).toISOString(),
        externalId: `agentmail:${m.message_id}`,
        meta: { threadId: m.thread_id, messageId: m.message_id, inbox, from: item.from, subject: m.subject, provider: 'agentmail' },
      });
      await api(`/inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(m.message_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ add_labels: ['read'], remove_labels: ['unread'] }),
      }).catch(() => undefined);
    }
    // `after` is inclusive-ish; ingest dedupes on message id, so advancing to the last timestamp is safe.
    const last = messages.at(-1)?.timestamp;
    if (last) kvSet(CURSOR_KEY, last);
  } catch (err) {
    console.error('[email] poll failed:', err instanceof Error ? err.message : err);
  } finally {
    polling = false;
  }
}

/** Replies in the customer's thread when we have one; otherwise starts a new email. */
async function send(o: Outbound) {
  const inbox = emailInbox();
  if (!inbox) throw new Error('AGENTMAIL_INBOX is not set');
  const last = sourcesFor(o.caseRef)
    .filter((s) => s.kind === 'email' && typeof s.meta?.messageId === 'string' && (s.meta.inbox ?? inbox) === inbox)
    .at(-1);
  const to = o.address!;
  if (last && parseAddress(String(last.meta.from ?? last.meta.contact ?? '')).address === to.toLowerCase()) {
    await api(`/inboxes/${encodeURIComponent(inbox)}/messages/${encodeURIComponent(String(last.meta.messageId))}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text: o.body }),
    });
    return;
  }
  await api(`/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
    method: 'POST',
    body: JSON.stringify({ to, subject: o.subject ?? o.caseRef, text: o.body }),
  });
}

/** Registers the AgentMail sender if the keys are on disk now. Safe to call more than once. */
export function ensureEmailSender(): boolean {
  if (!liveEnv('AGENTMAIL_API_KEY', true) || !emailInbox()) return false;
  registerSender('email', send);
  return true;
}

let pollingStarted = false;

export async function startEmail() {
  if (!ensureEmailSender()) {
    console.log('[email] AGENTMAIL_API_KEY / AGENTMAIL_INBOX not set; email channel off (run pnpm email:setup).');
    return;
  }
  // Only ingest mail that arrives from now on the first time; later restarts resume from the cursor.
  if (!kvGet(CURSOR_KEY)) kvSet(CURSOR_KEY, new Date().toISOString());
  if (!pollingStarted) {
    pollingStarted = true;
    void pollOnce();
    setInterval(() => void pollOnce(), POLL_MS).unref?.();
  }
  console.log(`[email] polling ${emailInbox()} every ${POLL_MS / 1000}s`);
}
