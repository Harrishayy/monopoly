import { Autonomy } from '@casework/core';
import { getPack } from '@casework/tracks';
import { z } from 'zod';
import { getCase } from '@/server/cases';
import { ACTIVE_TRACK } from '@/server/config';
import { startRun } from '@/server/runs';

const Body = z.object({ caseRef: z.string(), track: z.string().optional(), autonomy: Autonomy.optional() });

/** Starts an agent run and returns its id. Stream it from /api/runs/[id]/events. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  const track = body.data.track ?? ACTIVE_TRACK;
  const pack = getPack(track);
  const c = await getCase(body.data.caseRef, track);
  if (!c) return Response.json({ error: `No case ${body.data.caseRef}` }, { status: 404 });
  const runId = startRun(c, pack, body.data.autonomy ?? pack.autonomy);
  return Response.json({ runId }, { status: 202 });
}
