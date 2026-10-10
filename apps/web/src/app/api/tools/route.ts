import { getPack } from '@casework/tracks';
import { ACTIVE_TRACK } from '@/server/config';

export function GET(req: Request) {
  const track = new URL(req.url).searchParams.get('track') ?? ACTIVE_TRACK;
  const pack = getPack(track);
  return Response.json(pack.tools.map((t) => ({ name: t.name, description: t.description, effect: t.effect })));
}
