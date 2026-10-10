import { getRun, summariseRun } from '@/server/runs';

/** The reduced RunView plus run metadata (cut, mode, decision). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = getRun(id);
  if (!rec) return Response.json({ error: `No run ${id}` }, { status: 404 });
  return Response.json({ view: rec.view, run: summariseRun(rec) });
}
