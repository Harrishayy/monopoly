import type { NavCounts } from '@/lib/api-types';
import { inboxCases } from '@/server/cases';
import { listOutbound } from '@/server/live/store';
import { listRuns } from '@/server/runs';

export const dynamic = 'force-dynamic';

/** Numbers for the nav tabs. Escalations counts handovers nobody has decided yet; approvals counts held messages. */
export async function GET() {
  const runs = listRuns();
  const counts: NavCounts = {
    cases: (await inboxCases().catch(() => [])).length,
    running: runs.filter((r) => !r.done).length,
    // Per case: the latest standalone run decides whether a handover is still open.
    escalations: [...new Map([...runs].reverse().filter((r) => !r.groupId).map((r) => [r.caseRef, r] as const)).values()].filter((r) => r.handover && !r.decision).length,
    approvals: safe(() => listOutbound({ status: 'awaiting_approval' }).length),
  };
  return Response.json(counts);
}

function safe(fn: () => number) {
  try {
    return fn();
  } catch {
    return 0;
  }
}
