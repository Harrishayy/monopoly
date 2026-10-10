import { toolRegistry } from '@/server/tools';

/** Tools, policy rules, always-escalate triggers and per-tool health. */
export function GET(req: Request) {
  const track = new URL(req.url).searchParams.get('track') ?? undefined;
  try {
    return Response.json(toolRegistry(track));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
