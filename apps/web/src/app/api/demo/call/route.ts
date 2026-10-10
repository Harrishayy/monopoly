import { VIDEO_DEMO_REF } from '@/lib/demo';
import { startOutboundCall } from '@/server/live/channels/outbound-call';
import { prepareVideoDemo, videoDemoCallScript, videoDemoState } from '@/server/live/demo-video';
import { directory } from '@/server/live/directory';
import { ingest } from '@/server/live/intake';

export const dynamic = 'force-dynamic';

/** Rings DEMO_TENANT_PHONE as a follow-up on the video case and pins the conversation to it. */
export async function POST() {
  const state = prepareVideoDemo();
  const phone = process.env.DEMO_TENANT_PHONE?.trim();
  if (!phone) return Response.json({ error: 'Set DEMO_TENANT_PHONE in .env to the mobile you will answer on speaker.' }, { status: 400 });

  const tenant = directory().tenants[0];
  const property = tenant && directory().properties.find((p) => p.id === tenant.propertyId);
  const script = videoDemoCallScript(tenant?.name ?? 'Alex', property?.address ?? 'Flat 2, 12 Elm Road');

  try {
    const call = await startOutboundCall({ to: phone, firstMessage: script.firstMessage, prompt: script.prompt });
    if (call.conversationId) {
      ingest({
        channel: 'call',
        caseRef: VIDEO_DEMO_REF,
        contact: phone,
        name: tenant?.name,
        title: 'No heating — follow-up call',
        body: 'Outbound call in progress. The voice agent is speaking to the tenant.',
        externalId: `elevenlabs:${call.conversationId}`,
        deferRun: true,
        meta: { provider: 'elevenlabs', conversationId: call.conversationId, callState: 'in_progress', direction: 'outbound' },
      });
    }
    return Response.json({ ...call, caseRef: state.caseRef, demo: videoDemoState() }, { status: 202 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
