import { runView } from '@casework/core';
import { getRun } from '@/server/runs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = getRun(id);
  if (!rec) return Response.json({ error: `No run ${id}` }, { status: 404 });
  return Response.json({ ...runView(rec.events), done: rec.done, error: rec.error ?? null });
}
