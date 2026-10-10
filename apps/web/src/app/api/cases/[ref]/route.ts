import { getCase } from '@/server/cases';

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const c = await getCase(ref);
  return c ? Response.json(c) : Response.json({ error: `No case ${ref}` }, { status: 404 });
}
