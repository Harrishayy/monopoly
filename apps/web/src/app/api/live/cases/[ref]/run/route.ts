import { runLiveCase } from '@/server/live/intake';

/** Runs the agent again on a live case as it stands now; its proposal goes through the outbound gate. */
export async function POST(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const runId = runLiveCase(decodeURIComponent(ref));
  if (!runId) return Response.json({ error: `No live case ${ref}` }, { status: 404 });
  return Response.json({ runId }, { status: 202 });
}
