import { getTimeline } from '@/server/cases';

/** History events, eval labels and (for examples) how the case ended. */
export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const t = await getTimeline(decodeURIComponent(ref));
  if (!t) return Response.json({ error: `No case ${ref}` }, { status: 404 });
  return Response.json(t);
}
