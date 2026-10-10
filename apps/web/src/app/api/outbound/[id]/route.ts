import { z } from 'zod';
import { deliver, emitLive } from '@/server/live/intake';
import { getOutbound, setOutboundAddress, setOutboundBody, setOutboundStatus } from '@/server/live/store';

const Body = z.object({ action: z.enum(['approve', 'reject']), body: z.string().min(1).optional(), address: z.email().max(200).optional() });

/** A person approves (optionally after editing the text or the address) or rejects a held message. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  const o = getOutbound(decodeURIComponent(id));
  if (!o) return Response.json({ error: `No outbound ${id}` }, { status: 404 });
  if (o.status !== 'awaiting_approval' && o.status !== 'failed') return Response.json({ error: `Already ${o.status}` }, { status: 409 });
  if (body.data.action === 'reject') {
    setOutboundStatus(o.id, 'rejected');
    emitLive({ kind: 'outbound', caseRef: o.caseRef, id: o.id, status: 'rejected' });
    return Response.json({ ok: true, status: 'rejected' });
  }
  const msg = { ...o, ...(body.data.body && { body: body.data.body }), ...(body.data.address && { address: body.data.address }) };
  if (body.data.body) setOutboundBody(o.id, body.data.body);
  if (body.data.address) setOutboundAddress(o.id, body.data.address);
  const res = await deliver(o.id, msg);
  return Response.json(res, { status: res.ok ? 200 : 502 });
}
