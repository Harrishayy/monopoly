import { listCases, summarise } from '@/server/cases';
import { ACTIVE_TRACK } from '@/server/config';

export async function GET(req: Request) {
  const track = new URL(req.url).searchParams.get('track') ?? ACTIVE_TRACK;
  try {
    return Response.json((await listCases(track)).map(summarise));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
