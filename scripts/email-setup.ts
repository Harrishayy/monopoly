/**
 * Sets up the email channel on AgentMail and writes the result into the root .env.
 *
 *   pnpm email:setup                      # key already in .env: create or find the inbox
 *   pnpm email:setup --signup you@x.com   # no account yet: sign up, store the key, email you an OTP
 *   pnpm email:setup --otp 123456         # confirm the OTP from that email
 *
 * Run with Node ≥ 22.18 (native TypeScript). Never prints the API key.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV = resolve(ROOT, '.env');
const BASE = process.env.AGENTMAIL_API_URL ?? 'https://api.agentmail.to/v0';
const ORIGIN = BASE.replace(/\/v0$/, '');
const USERNAME = process.env.AGENTMAIL_USERNAME ?? 'casework-lettings';
const DISPLAY = process.env.AGENTMAIL_DISPLAY_NAME ?? 'Casework Lettings';

function readEnv(): Record<string, string> {
  if (!existsSync(ENV)) return {};
  return Object.fromEntries(
    readFileSync(ENV, 'utf8')
      .split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1]!, m[2]!.replace(/^["']|["']$/g, '')]),
  );
}

function setEnv(key: string, value: string) {
  const text = existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  writeFileSync(ENV, re.test(text) ? text.replace(re, line) : `${text.replace(/\n?$/, '\n')}${line}\n`);
}

async function call<T>(url: string, key: string | undefined, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}), ...init.headers },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url} → ${res.status}: ${body.slice(0, 400)}`);
  return (body ? JSON.parse(body) : {}) as T;
}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const env = readEnv();
let key = process.env.AGENTMAIL_API_KEY || env.AGENTMAIL_API_KEY;

const signup = flag('signup');
if (signup) {
  const r = await call<{ api_key: string; inbox_id?: string }>(`${ORIGIN}/agent/sign-up`, undefined, {
    method: 'POST',
    body: JSON.stringify({ human_email: signup, username: USERNAME }),
  });
  setEnv('AGENTMAIL_API_KEY', r.api_key);
  key = r.api_key;
  if (r.inbox_id) setEnv('AGENTMAIL_INBOX', r.inbox_id);
  console.log(`Signed up. API key saved to .env. An OTP was sent to ${signup}; run: pnpm email:setup --otp <code>`);
  if (r.inbox_id) console.log(`Inbox: ${r.inbox_id}`);
  process.exit(0);
}

if (!key) {
  console.error('No AGENTMAIL_API_KEY. Either paste one from https://console.agentmail.to into .env, or run: pnpm email:setup --signup you@example.com');
  process.exit(1);
}

const otp = flag('otp');
if (otp) {
  await call(`${ORIGIN}/agent/verify`, key, { method: 'POST', body: JSON.stringify({ otp_code: otp }) });
  console.log('Verified.');
}

interface Inbox { inbox_id: string; email: string; display_name?: string }
const { inboxes } = await call<{ inboxes: Inbox[] }>(`${BASE}/inboxes?limit=50`, key);
let inbox = inboxes.find((i) => i.inbox_id === env.AGENTMAIL_INBOX || i.email === env.AGENTMAIL_INBOX) ?? inboxes.find((i) => i.email.startsWith(`${USERNAME}@`));
if (!inbox) {
  try {
    inbox = await call<Inbox>(`${BASE}/inboxes`, key, {
      method: 'POST',
      body: JSON.stringify({ username: USERNAME, display_name: DISPLAY, client_id: `casework-${USERNAME}` }),
    });
  } catch (err) {
    // Username taken by someone else: let AgentMail pick one.
    console.warn(`Could not claim ${USERNAME}@agentmail.to (${(err as Error).message.slice(0, 120)}); creating a random address.`);
    inbox = await call<Inbox>(`${BASE}/inboxes`, key, { method: 'POST', body: JSON.stringify({ display_name: DISPLAY }) });
  }
}
setEnv('AGENTMAIL_INBOX', inbox.inbox_id);
console.log(`Email channel ready: ${inbox.email}`);
console.log('Restart the dev server so it starts polling. Send a test from any Gmail to that address.');
