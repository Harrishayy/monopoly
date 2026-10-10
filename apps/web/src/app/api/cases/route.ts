import { inboxCases, listCases, summarise } from '@/server/cases';
import { ACTIVE_TRACK } from '@/server/config';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const track = q.get('track') ?? ACTIVE_TRACK;
  try {
    return Response.json((await (q.get('examples') === '1' ? listCases(track) : inboxCases(track))).map(summarise));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
