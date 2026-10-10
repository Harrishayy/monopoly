import { agentsOverview } from '@/server/agents';

/** Both agents, how each works, and every eval run either has written. Read-only. */
export async function GET() {
  return Response.json(await agentsOverview());
}
