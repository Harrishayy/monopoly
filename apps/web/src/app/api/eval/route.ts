import { z } from 'zod';
import { listEvals, startEval } from '@/server/batches';

const Body = z.object({ mode: z.enum(['model', 'rules']).default('rules'), only: z.array(z.string()).optional() });

/** Starts scoring every labelled cut. Rules-only is free and takes seconds; model mode calls the API per cut. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  if (body.data.mode === 'model' && !process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 400 });
  return Response.json({ evalId: await startEval(body.data) }, { status: 202 });
}

/** Evals started here, then the last `pnpm eval` result. */
export async function GET() {
  return Response.json(await listEvals());
}
