import { portalConfig } from '@/server/portal';

export const dynamic = 'force-dynamic';

/** What the tenant portal shows: the agency's name, support email, and whether calls are available. */
export function GET() {
  return Response.json(portalConfig());
}
