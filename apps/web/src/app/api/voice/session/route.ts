import { signedUrl, voiceConfigured } from '@/server/live/channels/voice';

export const dynamic = 'force-dynamic';

/** Returns a signed ElevenLabs conversation URL for the tenant portal's call button. */
export async function POST() {
  if (!voiceConfigured()) {
    return Response.json({ error: 'Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in .env to enable voice (pnpm voice:setup).' }, { status: 503 });
  }
  try {
    return Response.json({ signedUrl: await signedUrl() });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
