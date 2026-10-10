/**
 * Prepares the 60-second video case and opens the operator sheet.
 *
 *   pnpm demo          # already running on :3100
 *   pnpm demo:video
 */
const BASE = process.env.DEMO_URL || 'http://localhost:3100';

async function main() {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/demo/video`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reset: true }) });
  } catch {
    throw new Error(`Nothing is listening on ${BASE}. Start the app with \`pnpm demo\`, then run this again.`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `Prepare failed (${res.status})`);
  console.log(`seeded ${body.caseRef}: ${body.title}`);
  console.log(`open ${BASE}/demo  →  Prepare and begin  →  start Loom on Architecture`);
  const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  const { spawn } = await import('node:child_process');
  spawn(open, [`${BASE}/demo`], { stdio: 'ignore', detached: true }).unref();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
