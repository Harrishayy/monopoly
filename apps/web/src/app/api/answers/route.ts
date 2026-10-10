import { readAnswerFile } from '@/server/batches';

/** ?path=ANSWERS/7/ANSWER.md → the file the CLI wrote. Only ANSWER.md, REASONING.md and trace.jsonl. */
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path') ?? '';
  const text = await readAnswerFile(path);
  if (text === undefined) return Response.json({ error: `Not found: ${path}` }, { status: 404 });
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
