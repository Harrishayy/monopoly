import { costReport } from '@/server/costs';

export const dynamic = 'force-dynamic';

/** Model spend, autonomy rate and estimated time saved, from every finished run on this server. */
export function GET() {
  return Response.json(costReport());
}
