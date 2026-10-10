import { getCase } from '@/server/cases';
import { emitLive } from '@/server/live/intake';
import { setCaseHidden } from '@/server/live/store';

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const c = await getCase(ref);
  return c ? Response.json(c) : Response.json({ error: `No case ${ref}` }, { status: 404 });
}

/** Deletes a live case from the console. It is only hidden: everything stays on record and PATCH brings it back. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  return hide(decodeURIComponent((await params).ref), true);
}

/** `{ "hidden": false }` restores a deleted case (the console's Undo). */
export async function PATCH(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const body = (await req.json().catch(() => null)) as { hidden?: unknown } | null;
  if (typeof body?.hidden !== 'boolean') return Response.json({ error: 'Send { "hidden": true | false }' }, { status: 400 });
  return hide(decodeURIComponent((await params).ref), body.hidden);
}

function hide(ref: string, hidden: boolean) {
  if (!ref.startsWith('LIVE-')) return Response.json({ error: 'Only live cases can be deleted; example cases come from the data folder.' }, { status: 400 });
  if (!setCaseHidden(ref, hidden)) return Response.json({ error: `No case ${ref}` }, { status: 404 });
  emitLive({ kind: 'case.hidden', caseRef: ref, hidden });
  return Response.json({ ref, hidden });
}
