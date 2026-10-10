import { getEval } from '@/server/batches';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getEval(id);
  return e ? Response.json(e) : Response.json({ error: `No eval ${id}` }, { status: 404 });
}
