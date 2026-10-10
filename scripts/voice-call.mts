/**
 * Imports the Twilio number into ElevenLabs (once) and has the tenant-line agent call you.
 *
 *   pnpm voice:call
 *   pnpm voice:call +447700900123
 *
 * Needs ELEVENLABS_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
 * and DEMO_TENANT_PHONE (or a number on the command line). Creates the agent if missing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(import.meta.dirname, '..', '.env');
process.loadEnvFile(ENV_FILE);

const API = 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY;
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = e164(process.env.TWILIO_PHONE_NUMBER);
const TO = e164(process.argv[2] || process.env.DEMO_TENANT_PHONE);
const AGENCY = process.env.AGENCY_NAME || 'Northgate Lettings';

if (!KEY) throw new Error('Set ELEVENLABS_API_KEY in .env');
if (!SID || !TOKEN || !FROM) {
  throw new Error(
    'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in .env (Twilio console → Account Info, plus the trial number).',
  );
}
if (!TO) throw new Error('Set DEMO_TENANT_PHONE in .env, or pass a number: pnpm voice:call +447700900123');
if (TO === FROM) throw new Error('The agent cannot call the Twilio number from itself. DEMO_TENANT_PHONE must be your mobile.');

function e164(raw?: string) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;
  return `+${trimmed.replace(/\D/g, '')}`;
}

async function el<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'xi-api-key': KEY!, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 800)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

function setEnv(vars: Record<string, string>) {
  let s = readFileSync(ENV_FILE, 'utf8');
  for (const [k, v] of Object.entries(vars)) {
    const line = `${k}=${v}`;
    s = new RegExp(`^${k}=.*$`, 'm').test(s) ? s.replace(new RegExp(`^${k}=.*$`, 'm'), line) : `${s.trimEnd()}\n${line}\n`;
    process.env[k] = v;
  }
  writeFileSync(ENV_FILE, s);
}

async function ensureAgent(): Promise<string> {
  let agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    try {
      await el('GET', `/v1/convai/agents/${agentId}`);
      return agentId;
    } catch {
      console.warn(`Agent ${agentId} is gone; creating a new one.`);
    }
  }
  const created = await el<{ agent_id: string }>('POST', '/v1/convai/agents/create', {
    name: `${AGENCY} tenant line`,
    tags: ['casework'],
    conversation_config: {
      agent: {
        first_message: `Hello, you're through to ${AGENCY}'s tenant line. I can log a repair or a problem with your home. Can I take your name, please?`,
        language: 'en',
        prompt: {
          prompt: `You answer the tenant line for ${AGENCY}. Ask name, contact, address and the issue. Be brief. British English.`,
          llm: process.env.ELEVENLABS_LLM || 'gemini-2.5-flash',
          temperature: 0.3,
        },
      },
      tts: { voice_id: process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2', model_id: 'eleven_turbo_v2' },
    },
  });
  setEnv({ ELEVENLABS_AGENT_ID: created.agent_id });
  console.log(`created agent ${created.agent_id} (run \`pnpm voice:setup\` later so log_issue hits this app)`);
  return created.agent_id;
}

async function ensureNumber(agentId: string): Promise<string> {
  if (process.env.ELEVENLABS_PHONE_NUMBER_ID) return process.env.ELEVENLABS_PHONE_NUMBER_ID;
  const listed = await el< { phone_number: string; phone_number_id: string }[] | { phone_numbers: { phone_number: string; phone_number_id: string }[] } >(
    'GET',
    '/v1/convai/phone-numbers?provider=twilio',
  );
  const numbers = Array.isArray(listed) ? listed : listed.phone_numbers ?? [];
  const existing = numbers.find((n) => n.phone_number === FROM);
  if (existing) {
    setEnv({ ELEVENLABS_PHONE_NUMBER_ID: existing.phone_number_id });
    return existing.phone_number_id;
  }
  const imported = await el<{ phone_number_id: string }>('POST', '/v1/convai/phone-numbers', {
    provider: 'twilio',
    label: `${AGENCY} tenant line`,
    phone_number: FROM,
    sid: SID,
    token: TOKEN,
    agent_id: agentId,
    enable_sms: false,
  });
  setEnv({ ELEVENLABS_PHONE_NUMBER_ID: imported.phone_number_id });
  console.log(`imported ${FROM} as ${imported.phone_number_id}`);
  return imported.phone_number_id;
}

async function main() {
  const agentId = await ensureAgent();
  const phoneNumberId = await ensureNumber(agentId);
  const call = await el<{ success: boolean; message?: string; conversation_id?: string; callSid?: string }>(
    'POST',
    '/v1/convai/twilio/outbound-call',
    { agent_id: agentId, agent_phone_number_id: phoneNumberId, to_number: TO },
  );
  if (!call.success) throw new Error(call.message || 'ElevenLabs did not start the call');
  console.log(`calling ${TO} from ${FROM}`);
  if (call.conversation_id) console.log(`conversation ${call.conversation_id}`);
  console.log('Your phone should ring in a few seconds. Answer and talk to the agent.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
