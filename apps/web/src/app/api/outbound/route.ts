import { listOutbound, type OutboundStatus } from '@/server/live/store';

export const dynamic = 'force-dynamic';

/** Outbound messages, newest first. ?case= and ?status= filter. */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return Response.json(listOutbound({ caseRef: q.get('case') ?? undefined, status: (q.get('status') as OutboundStatus) ?? undefined }));
}
