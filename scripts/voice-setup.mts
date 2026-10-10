/**
 * Creates or updates the ElevenLabs voice agent for the tenant line and points its tools and
 * post-call webhook at PUBLIC_URL. Idempotent: run it again whenever the tunnel URL changes.
 *
 *   node scripts/voice-setup.mts            (or: pnpm voice:setup)
 *
 * Writes ELEVENLABS_AGENT_ID, ELEVENLABS_TOOL_ID, ELEVENLABS_WEBHOOK_ID and
 * ELEVENLABS_WEBHOOK_SECRET into the root .env.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(import.meta.dirname, '..', '.env');
process.loadEnvFile(ENV_FILE);

const API = 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY;
const PUBLIC_URL = process.env.PUBLIC_URL?.replace(/\/$/, '');
const AGENCY = process.env.AGENCY_NAME || 'Northgate Lettings';
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2'; // Alice: British, clear, professional

if (!KEY) throw new Error('Set ELEVENLABS_API_KEY in .env');
if (!PUBLIC_URL) console.warn('PUBLIC_URL is not set: the in-call tool and webhook will not reach localhost. Run `pnpm tunnel` first. The poller still picks up finished calls.');

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

const PROMPT = `You answer the tenant line for ${AGENCY}, a UK letting and property management agency.

Your job on every call:
1. Find out who is calling: their full name, and a phone number or email address we can reach them on.
2. Find out which property: the address, including the flat number.
3. Understand the issue: what is wrong, since when, how bad it is, whether anyone is at risk, and when someone could get access.
4. As soon as you know the issue and the address, call the log_issue tool. Call it again whenever details change or you learn something important (for example photos are available, access times, or the problem got worse).
5. Read back what you have logged and the reference the tool gives you, then explain that a coordinator will follow up.

Rules you must keep:
- Never promise a contractor, a visit date, a cost, a refund, compensation or who will pay. Say a coordinator will confirm next steps.
- Never give out other tenants' or landlords' details.
- If the caller smells gas: tell them to leave the property, not to use switches or flames, and to call the National Gas Emergency line on 0800 111 999 now. Then log it as an emergency.
- For fire, flooding near electrics, or anyone in danger: tell them to call 999 first, then log it as an emergency.
- If the caller wants to complain, dispute a charge, or talk about rent or their deposit, log it and say a manager will call back.
- Be calm, warm and brief. Use British English. Ask one question at a time. Don't read out long lists.`;

const FIRST_MESSAGE = `Hello, you're through to ${AGENCY}'s tenant line. I can log a repair or a problem with your home. Can I take your name, please?`;

const TOOL = {
  tool_config: {
    type: 'webhook',
    name: 'log_issue',
    description:
      'Log or update the caller’s issue in the agency’s case system. Call as soon as you know the issue and address, and again when details change. Returns the case reference to read back.',
    response_timeout_secs: 20,
    api_schema: {
      url: `${PUBLIC_URL ?? 'https://example.invalid'}/api/voice/tool`,
      method: 'POST',
      request_headers: {},
      request_body_schema: {
        type: 'object',
        description: 'What the caller has told you so far.',
        properties: {
          conversation_id: { type: 'string', dynamic_variable: 'system__conversation_id' },
          caller_name: { type: 'string', description: 'The caller’s full name, as they said it.' },
          contact: { type: 'string', description: 'Phone number or email address to reach the caller on. Empty if not given yet.' },
          address: { type: 'string', description: 'Property address including flat number.' },
          issue: { type: 'string', description: 'A one-line summary of the problem, e.g. "Boiler not working, no heating or hot water".' },
          details: { type: 'string', description: 'Everything relevant the caller said: since when, severity, what they have tried, access times, who is affected.' },
          urgency: { type: 'string', enum: ['emergency', 'urgent', 'routine'], description: 'emergency = gas, fire, flood, danger to people; urgent = no heating/hot water, leak, security; routine = everything else.' },
        },
        required: ['conversation_id', 'issue', 'details', 'urgency'],
      },
    },
  },
};

async function main() {
  // 1. The webhook tool (workspace-level, attached by id).
  let toolId = process.env.ELEVENLABS_TOOL_ID;
  if (toolId) {
    try {
      await el('PATCH', `/v1/convai/tools/${toolId}`, TOOL);
    } catch (err) {
      console.warn(`Tool ${toolId} could not be updated (${(err as Error).message.slice(0, 120)}); creating a new one.`);
      toolId = undefined;
    }
  }
  if (!toolId) toolId = (await el<{ id: string }>('POST', '/v1/convai/tools', TOOL)).id;
  setEnv({ ELEVENLABS_TOOL_ID: toolId });
  console.log(`tool log_issue: ${toolId} → ${TOOL.tool_config.api_schema.url}`);

  // 2. The post-call webhook (workspace-level, HMAC signed). Reused while the URL is unchanged,
  //    because a new webhook means a new secret the running server would not have.
  let webhookId = process.env.ELEVENLABS_WEBHOOK_ID;
  let stale: string[] = [];
  if (PUBLIC_URL) {
    const url = `${PUBLIC_URL}/api/voice/webhook`;
    const { webhooks = [] } = await el<{ webhooks: { webhook_id: string; name: string; webhook_url: string }[] }>('GET', '/v1/workspace/webhooks');
    const ours = webhooks.filter((w) => w.name.startsWith('Casework post-call'));
    const keep = ours.find((w) => w.webhook_id === webhookId && w.webhook_url === url && process.env.ELEVENLABS_WEBHOOK_SECRET);
    // Old ones are deleted after the agent is re-pointed (step 4b): ElevenLabs refuses to delete a webhook still in use.
    stale = ours.filter((w) => w !== keep).map((w) => w.webhook_id);
    if (!keep) {
      const wh = await el<{ webhook_id: string; webhook_secret?: string }>('POST', '/v1/workspace/webhooks', {
        settings: { auth_type: 'hmac', name: `Casework post-call (${new Date().toISOString().slice(0, 16)})`, webhook_url: url },
      });
      webhookId = wh.webhook_id;
      setEnv({ ELEVENLABS_WEBHOOK_ID: webhookId, ...(wh.webhook_secret ? { ELEVENLABS_WEBHOOK_SECRET: wh.webhook_secret } : {}) });
    }
    console.log(`post-call webhook: ${webhookId} → ${url}${keep ? ' (unchanged)' : ' (new secret written to .env)'}`);
  }

  // 3. The agent.
  const agentBody = {
    name: `${AGENCY} tenant line`,
    tags: ['casework'],
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE,
        language: 'en',
        prompt: { prompt: PROMPT, llm: process.env.ELEVENLABS_LLM || 'gemini-2.5-flash', temperature: 0.3, tool_ids: [toolId] },
      },
      tts: { voice_id: VOICE_ID, model_id: 'eleven_turbo_v2' },
      conversation: { max_duration_seconds: 600 },
    },
    platform_settings: {
      ...(webhookId ? { workspace_overrides: { webhooks: { post_call_webhook_id: webhookId, events: ['transcript'] } } } : {}),
    },
  };
  let agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    try {
      await el('PATCH', `/v1/convai/agents/${agentId}`, agentBody);
    } catch (err) {
      console.warn(`Agent ${agentId} could not be updated (${(err as Error).message.slice(0, 160)}); creating a new one.`);
      agentId = undefined;
    }
  }
  if (!agentId) agentId = (await el<{ agent_id: string }>('POST', '/v1/convai/agents/create', agentBody)).agent_id;
  setEnv({ ELEVENLABS_AGENT_ID: agentId });

  // 4. Point the workspace's post-call webhook at ours too (belt and braces for older workspaces).
  if (webhookId) {
    await el('PATCH', '/v1/convai/settings', { webhooks: { post_call_webhook_id: webhookId, events: ['transcript'] } }).catch((err) =>
      console.warn(`Workspace webhook setting not changed: ${(err as Error).message.slice(0, 160)}`),
    );
  }

  // 4b. Now nothing points at the old webhooks, so they can go.
  for (const id of stale.filter((id) => id !== webhookId)) {
    await el('DELETE', `/v1/workspace/webhooks/${id}`).catch((err) => console.warn(`Could not delete old webhook ${id}: ${(err as Error).message.slice(0, 160)}`));
  }

  // 5. Verify.
  const got = await el<any>('GET', `/v1/convai/agents/${agentId}`);
  const tools = got.conversation_config?.agent?.prompt?.tool_ids ?? [];
  console.log(`agent: ${got.agent_id} "${got.name}" voice=${got.conversation_config?.tts?.voice_id} tools=${JSON.stringify(tools)}`);
  console.log(`post-call webhook on agent: ${JSON.stringify(got.platform_settings?.workspace_overrides?.webhooks ?? null)}`);
  console.log(`Test it: https://elevenlabs.io/app/talk-to?agent_id=${agentId}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
