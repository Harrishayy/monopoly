import { z } from 'zod';
import { prepareVideoDemo, videoDemoState } from '@/server/live/demo-video';

export const dynamic = 'force-dynamic';

/** Current video-demo case. */
export function GET() {
  return Response.json(videoDemoState());
}

const Body = z.object({ reset: z.boolean().optional() });

/** Seeds the prerun heating email chain. `{ reset: true }` rebuilds it for a clean take. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  return Response.json(prepareVideoDemo({ reset: body.data.reset }), { status: 201 });
}
