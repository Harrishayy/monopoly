import { z } from 'zod';
import { BATCH_INPUTS, listBatches, startBatch } from '@/server/batches';

const Body = z.object({
  dir: z.enum(BATCH_INPUTS),
  mode: z.enum(['model', 'rules']).default('model'),
  withhold: z.enum(['none', 'outcomes']).default('none'),
});

/**
 * Runs a folder of cases in the browser session, sharing the agent with apps/cli/src/reality.ts.
 * Results stay in memory; `pnpm reality` is what writes ANSWERS/.
 */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  const res = await startBatch(body.data);
  if (typeof res !== 'string') return Response.json(res, { status: 400 });
  return Response.json({ batchId: res }, { status: 202 });
}

/** Batches started here, then folders the CLI wrote (ANSWERS/, .casework/practice/). */
export async function GET() {
  return Response.json({ batches: await listBatches(), inputs: BATCH_INPUTS });
}
