import { env, recordFinishedCall, verifySignature, type ConversationData } from '@/server/live/channels/voice';

/** ElevenLabs post-call transcription webhook (HMAC signed). Files the full transcript on the case. */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = env('ELEVENLABS_WEBHOOK_SECRET', true);
  if (secret && !verifySignature(raw, req.headers.get('elevenlabs-signature'), secret)) {
    return Response.json({ error: 'Bad signature' }, { status: 401 });
  }
  let payload: { type?: string; data?: ConversationData };
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  if (payload.type !== 'post_call_transcription' || !payload.data?.conversation_id) return Response.json({ ignored: payload.type ?? null });
  try {
    const r = recordFinishedCall(payload.data, 'webhook');
    return Response.json({ ok: true, caseRef: r?.caseRef ?? null });
  } catch (err) {
    console.error('[voice] webhook failed:', err);
    // Still 200: the poller retries from the conversations API, and repeated failures disable the webhook.
    return Response.json({ ok: false });
  }
}
