import type { NavCounts } from '@/lib/api-types';
import { listCases } from '@/server/cases';
import { listRuns } from '@/server/runs';

/** Numbers for the nav tabs. Escalations counts handovers nobody has decided yet. */
export async function GET() {
  const runs = listRuns();
  const counts: NavCounts = {
    cases: (await listCases().catch(() => [])).length,
    running: runs.filter((r) => !r.done).length,
    escalations: runs.filter((r) => r.handover && !r.decision && !r.groupId).length,
  };
  return Response.json(counts);
}
