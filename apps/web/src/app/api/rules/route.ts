import { rulesReport } from '@/server/rules';

/** The guard checks, pack policy rules, escalation triggers and outbound gate, read from code. */
export function GET(req: Request) {
  const track = new URL(req.url).searchParams.get('track') ?? undefined;
  try {
    return Response.json(rulesReport(track));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
