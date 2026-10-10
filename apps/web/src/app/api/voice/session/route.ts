/** Returns a signed ElevenLabs conversation URL for the browser voice agent. */
export function POST() {
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID) {
    return Response.json({ error: 'Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in .env to enable voice.' }, { status: 503 });
  }
  return Response.json({ error: 'Voice session not built yet. See docs/plan/05-components.md → api/voice.' }, { status: 501 });
}
