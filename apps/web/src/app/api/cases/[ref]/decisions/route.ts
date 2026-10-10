import { z } from 'zod';
import { recordDecision } from '@/server/runs';

const Body = z.object({ runId: z.string(), optionId: z.string(), note: z.string().max(2000).optional() });

/** Records a person's choice on a run's handover. Held in memory with the run. */
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  const res = recordDecision({ caseRef: decodeURIComponent(ref), decidedBy: 'Operator', ...body.data });
  if (typeof res === 'string') return Response.json({ error: res }, { status: res.startsWith('No run') ? 404 : 409 });
  return Response.json(res, { status: 201 });
}
