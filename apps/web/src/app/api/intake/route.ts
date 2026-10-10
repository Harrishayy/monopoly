import { z } from 'zod';
import { ingest } from '@/server/live/intake';

const Body = z.object({
  channel: z.enum(['call', 'email', 'sms', 'note']).default('note'),
  contact: z.string().optional(),
  name: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  externalId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

/** Opens or updates a live case from any channel (the customer portal form posts here). */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  return Response.json(ingest({ ...body.data, meta: { ...body.data.meta, via: 'portal' } }), { status: 201 });
}
