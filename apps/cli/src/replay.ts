/**
 * Re-emits a stored run without calling any model, for demos and UI work.
 *   pnpm replay ANSWERS/7/trace.jsonl [--speed 2]
 */
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { RunEvent, runView } from '@casework/core';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { speed: { type: 'string', default: '1' } },
});
const file = positionals[0];
if (!file) {
  console.error('Usage: pnpm replay <trace.jsonl> [--speed 2]');
  process.exit(1);
}

const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
const events = lines.map((l) => RunEvent.parse(JSON.parse(l)));
const speed = Number(values.speed) || 1;
for (const [i, e] of events.entries()) {
  const prev = events[i - 1];
  const gap = prev ? Math.min(2000, new Date(e.at).getTime() - new Date(prev.at).getTime()) : 0;
  await new Promise((r) => setTimeout(r, gap / speed));
  console.log(`${String(e.seq).padStart(3)} ${e.type}`);
}
const v = runView(events);
console.log(`\nOutcome: ${v.outcome ?? 'incomplete'} · ${v.steps.length} steps · mascot ${v.mascot}`);
