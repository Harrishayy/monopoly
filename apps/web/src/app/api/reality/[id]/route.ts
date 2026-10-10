import { cancelBatch, getBatch } from '@/server/batches';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = getBatch(id);
  return b ? Response.json(b) : Response.json({ error: `No batch ${id}` }, { status: 404 });
}

/** Cancels a running batch. Cases already started finish; no new ones start. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return cancelBatch(id) ? new Response(null, { status: 204 }) : Response.json({ error: 'Not running' }, { status: 409 });
}
