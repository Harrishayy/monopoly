import { Autonomy } from '@casework/core';
import { getPack } from '@casework/tracks';
import { z } from 'zod';
import { getCase, getCaseAt } from '@/server/cases';
import { ACTIVE_TRACK } from '@/server/config';
import { listRuns, startRun } from '@/server/runs';

const Body = z.object({
  caseRef: z.string(),
  track: z.string().optional(),
  autonomy: Autonomy.optional(),
  /** Hide history events from this number on, and decide as of just before it. */
  cutBefore: z.number().int().positive().optional(),
  mode: z.enum(['model', 'rules']).optional(),
});

/** Starts an agent run and returns its id. Stream it from /api/runs/[id]/events. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  const { caseRef, cutBefore } = body.data;
  const track = body.data.track ?? ACTIVE_TRACK;
  let pack;
  try {
    pack = getPack(track);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
  const at = cutBefore ? await getCaseAt(caseRef, cutBefore, track) : undefined;
  const c = at?.c ?? (cutBefore ? undefined : await getCase(caseRef, track));
  if (!c) return Response.json({ error: `No ${pack.vocabulary.case.toLowerCase()} ${caseRef}` }, { status: 404 });
  const mode = body.data.mode ?? (process.env.ANTHROPIC_API_KEY ? 'model' : 'rules');
  const runId = startRun(c, pack, {
    autonomy: body.data.autonomy ?? pack.autonomy,
    mode,
    cut: at && cutBefore ? { cutBefore, asOf: at.asOf } : undefined,
  });
  return Response.json({ runId }, { status: 202 });
}

/** Runs held in memory, newest first. ?case= filters to one case; ?standalone=1 hides eval and batch runs. */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return Response.json(listRuns({ caseRef: q.get('case') ?? undefined, groupId: q.get('group') ?? undefined, standalone: q.get('standalone') === '1' }));
}
