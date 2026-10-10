import { z } from 'zod';
import { followThrough } from '@/server/live/followthrough';
import { getLiveCaseRow } from '@/server/live/store';
import { getRun, recordDecision } from '@/server/runs';

const Body = z.object({ runId: z.string(), optionId: z.string(), note: z.string().max(2000).optional() });

/**
 * Records a person's choice on a run's handover. On a live case it also starts the follow-through:
 * the messages that carry the decision out are drafted and held for approval.
 */
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const ref = decodeURIComponent((await params).ref);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  let res = recordDecision({ caseRef: ref, decidedBy: 'Operator', ...body.data });
  // Re-sending the same choice is safe: it (re)starts the follow-through for decisions made before it existed.
  const prior = getRun(body.data.runId)?.decision;
  if (res === 'Already decided' && prior?.optionId === body.data.optionId) res = prior;
  if (typeof res === 'string') return Response.json({ error: res }, { status: res.startsWith('No run') ? 404 : 409 });
  const label = getRun(body.data.runId)?.view.handover?.options.find((o) => o.id === body.data.optionId)?.label;
  const live = !!label && !!getLiveCaseRow(ref);
  if (live) void followThrough(ref, body.data.runId, label, body.data.note);
  return Response.json({ ...res, followThrough: live ? 'drafting' : undefined }, { status: 201 });
}
