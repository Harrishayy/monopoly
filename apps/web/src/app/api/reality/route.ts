/** Starts a Reality Test batch from the UI. Shares code with apps/cli/src/reality.ts. */
export function POST() {
  return Response.json({ error: 'Not built yet. Use `pnpm reality --track <track> --in <dir>` for now.' }, { status: 501 });
}
