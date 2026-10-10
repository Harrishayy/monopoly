import 'server-only';
import { env } from '@/server/live/channels/voice';
import type { PortalConfig } from '@/features/portal';

/** What the tenant portal shows: the agency's name, support email, and whether calls are available. */
export function portalConfig(): PortalConfig {
  const inbox = env('AGENTMAIL_INBOX');
  return {
    agency: env('AGENCY_NAME') || 'Northgate Lettings',
    email: env('SUPPORT_EMAIL') || (inbox?.includes('@') ? inbox : undefined),
    voice: !!env('ELEVENLABS_API_KEY') && !!env('ELEVENLABS_AGENT_ID'),
  };
}
