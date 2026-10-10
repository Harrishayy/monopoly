import { env } from '@/server/live/channels/voice';

export const dynamic = 'force-dynamic';

/** What the tenant portal shows: the agency's name, support email, and whether calls are available. */
export function GET() {
  return Response.json({
    agency: env('AGENCY_NAME') || 'Northgate Lettings',
    email: env('SUPPORT_EMAIL') || (env('AGENTMAIL_INBOX')?.includes('@') ? env('AGENTMAIL_INBOX') : undefined),
    voice: !!env('ELEVENLABS_API_KEY') && !!env('ELEVENLABS_AGENT_ID'),
  });
}
