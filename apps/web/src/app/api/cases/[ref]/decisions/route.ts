import { z } from 'zod';

const Body = z.object({ runId: z.string(), optionId: z.string(), note: z.string().optional() });

/** Records a human decision on a handover. Emits human.decided once the event store exists. */
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  return Response.json(
    { error: `Decision store not built yet (case ${ref}). See docs/plan/05-components.md → api/decisions.` },
    { status: 501 },
  );
}
