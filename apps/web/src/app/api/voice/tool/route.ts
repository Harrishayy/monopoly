import { logIssue, type LogIssueArgs } from '@/server/live/channels/voice';

/** The ElevenLabs agent's in-call `log_issue` tool. Opens or updates the caller's case while they talk. */
export async function POST(req: Request) {
  const args = (await req.json().catch(() => null)) as LogIssueArgs | null;
  if (!args || (!args.issue && !args.details)) return Response.json({ error: 'issue or details required' }, { status: 400 });
  try {
    const r = logIssue(args);
    return Response.json({ reference: r.caseRef, message: r.say });
  } catch (err) {
    console.error('[voice] log_issue failed:', err);
    return Response.json({ message: 'The note could not be saved right now. Tell the caller a coordinator will call them back.' }, { status: 500 });
  }
}

/** Lets the tunnel script check the route is reachable. */
export function GET() {
  return Response.json({ ok: true });
}
