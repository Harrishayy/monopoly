import { runEventStream } from '@/server/sse';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const last = req.headers.get('last-event-id');
  return runEventStream(id, last ? Number(last) : -1);
}
