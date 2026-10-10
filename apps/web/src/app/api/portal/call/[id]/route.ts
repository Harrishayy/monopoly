import { z } from 'zod';
import { caseForConversation, saveTypedDetails } from '@/server/live/channels/voice';

export const dynamic = 'force-dynamic';

const Id = z.string().regex(/^[\w-]{1,128}$/);
const field = (max: number) => z.string().trim().max(max).optional();
const Typed = z.object({ name: field(120), email: z.union([z.literal(''), z.email().max(200)]).optional(), phone: field(40), address: field(240) });

/** The case reference a portal call has been filed under, once the voice agent has logged it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Id.safeParse((await params).id);
  if (!id.success) return Response.json({ error: 'bad id' }, { status: 400 });
  return Response.json({ caseRef: caseForConversation(id.data) ?? null });
}

/** Details the caller typed during or after the call, so names and emails are spelled right on the case. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Id.safeParse((await params).id);
  const body = Typed.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return Response.json({ error: 'Check the details and try again.' }, { status: 400 });
  if (!Object.values(body.data).some(Boolean)) return Response.json({ error: 'Nothing to save.' }, { status: 400 });
  try {
    return Response.json({ caseRef: saveTypedDetails(id.data, body.data).caseRef });
  } catch (err) {
    console.error('[portal] typed details failed:', err);
    return Response.json({ error: 'We could not save that. Please try again.' }, { status: 500 });
  }
}
