import 'server-only';
import { env } from './voice';

const API = 'https://api.elevenlabs.io';

function e164(raw?: string) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;
  return `+${trimmed.replace(/\D/g, '')}`;
}

async function el<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = env('ELEVENLABS_API_KEY', true);
  if (!key) throw new Error('Set ELEVENLABS_API_KEY in .env');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 800)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export interface OutboundCallRequest {
  to: string;
  firstMessage?: string;
  prompt?: string;
}

export interface OutboundCallResult {
  to: string;
  from: string;
  conversationId?: string;
  callSid?: string;
}

/**
 * Rings `to` from the imported Twilio number using the tenant-line agent.
 * Does not rewrite `.env`. Needs the agent and phone number ids already written by `pnpm tunnel` / `pnpm voice:call`.
 */
export async function startOutboundCall(req: OutboundCallRequest): Promise<OutboundCallResult> {
  const to = e164(req.to);
  const from = e164(env('TWILIO_PHONE_NUMBER', true));
  const agentId = env('ELEVENLABS_AGENT_ID', true);
  const phoneNumberId = env('ELEVENLABS_PHONE_NUMBER_ID', true);
  const sid = env('TWILIO_ACCOUNT_SID', true);
  const token = env('TWILIO_AUTH_TOKEN', true);
  if (!to) throw new Error('Set DEMO_TENANT_PHONE in .env, or pass a number.');
  if (!from || !sid || !token) throw new Error('Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in .env.');
  if (!agentId) throw new Error('No ElevenLabs agent. Run `pnpm tunnel` or `pnpm voice:setup` first.');
  if (to === from) throw new Error('The agent cannot call the Twilio number from itself. DEMO_TENANT_PHONE must be your mobile.');

  let numberId = phoneNumberId;
  if (!numberId) {
    const listed = await el<{ phone_number: string; phone_number_id: string }[] | { phone_numbers: { phone_number: string; phone_number_id: string }[] }>(
      'GET',
      '/v1/convai/phone-numbers?provider=twilio',
    );
    const numbers = Array.isArray(listed) ? listed : listed.phone_numbers ?? [];
    const existing = numbers.find((n) => n.phone_number === from);
    if (!existing) throw new Error('Twilio number is not imported into ElevenLabs yet. Run `pnpm voice:call` once to import it.');
    numberId = existing.phone_number_id;
  }

  const payload: Record<string, unknown> = { agent_id: agentId, agent_phone_number_id: numberId, to_number: to };
  if (req.firstMessage || req.prompt) {
    payload.conversation_initiation_client_data = {
      conversation_config_override: {
        agent: {
          ...(req.firstMessage ? { first_message: req.firstMessage } : {}),
          ...(req.prompt ? { prompt: { prompt: req.prompt, llm: env('ELEVENLABS_LLM') || 'gemini-2.5-flash', temperature: 0.3 } } : {}),
        },
      },
    };
  }

  let call: { success?: boolean; message?: string; conversation_id?: string; callSid?: string };
  try {
    call = await el('POST', '/v1/convai/twilio/outbound-call', payload);
  } catch (err) {
    if (!req.firstMessage && !req.prompt) throw err;
    call = await el('POST', '/v1/convai/twilio/outbound-call', { agent_id: agentId, agent_phone_number_id: numberId, to_number: to });
  }
  if (call.success === false) throw new Error(call.message || 'ElevenLabs did not start the call');
  return { to, from, conversationId: call.conversation_id, callSid: call.callSid };
}

export const outboundCallConfigured = () =>
  !!(env('ELEVENLABS_API_KEY') && env('ELEVENLABS_AGENT_ID') && env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_PHONE_NUMBER') && env('DEMO_TENANT_PHONE'));
