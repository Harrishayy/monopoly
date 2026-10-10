/**
 * Reality Test runner. Runs every case in --in unattended and writes ANSWERS/<n>/.
 *   pnpm reality --track property --in data/challenges --out ANSWERS
 * <n> is the supplied case number (folder 007 → ANSWERS/7).
 * Practice on the public examples with outcomes hidden:
 *   pnpm reality --in data/public --out .casework/practice --withhold outcomes
 * Each case's folder is written as soon as it finishes, so a crash keeps finished work.
 * Never hand-edit the output; fix the system and re-run.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { renderAnswers, runView, RunEvent, type Case } from '@casework/core';
import { runCase, type EmitInput } from '@casework/core/agent';
import { getPack } from '@casework/tracks';

const root = resolve(import.meta.dirname, '../../..');
const { values } = parseArgs({
  options: {
    track: { type: 'string', default: process.env.TRACK ?? 'property' },
    in: { type: 'string', default: 'data/challenges' },
    out: { type: 'string', default: 'ANSWERS' },
    withhold: { type: 'string', default: 'none' },
    concurrency: { type: 'string', default: process.env.REALITY_CONCURRENCY ?? '6' },
  },
});

const pack = getPack(values.track!);
const inDir = resolve(root, values.in!);
const outDir = resolve(root, values.out!);
const limit = Math.max(1, Number(values.concurrency));

async function runOne(c: Case, n: number) {
  const runId = randomUUID();
  const events: RunEvent[] = [];
  let seq = 0;
  const emit = (e: EmitInput) => events.push(RunEvent.parse({ ...e, runId, seq: seq++, at: new Date().toISOString() }));
  let error: string | undefined;
  try {
    await runCase(c, pack, { runId, autonomy: pack.autonomy, emit });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const view = runView(events);
  const { answer, reasoning } = renderAnswers(view, c, n);
  const dir = join(outDir, String(n));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'ANSWER.md'), error ? `${answer}\n**Runner error**\n${error}\n` : answer);
  await writeFile(join(dir, 'REASONING.md'), reasoning);
  await writeFile(join(dir, 'trace.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return { n, ref: c.ref, outcome: view.outcome ?? 'incomplete', next: view.next?.action ?? 'none', decidedBy: view.next?.decidedBy ?? 'none', error };
}

async function main() {
  const withhold = values.withhold === 'outcomes' ? 'outcomes' : 'none';
  const cases = await pack.loadCases(inDir, { withhold });
  if (!cases.length) {
    console.error(`No ${pack.label} cases found in ${inDir}. Nothing written. See data/README.md for the expected layout.`);
    process.exit(1);
  }
  console.log(`Running ${cases.length} ${pack.vocabulary.cases.toLowerCase()} with concurrency ${limit}…`);
  const results: Awaited<ReturnType<typeof runOne>>[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, cases.length) }, async () => {
      while (next < cases.length) {
        const i = next++;
        const r = await runOne(cases[i]!, caseNumber(cases[i]!, i));
        results.push(r);
        console.log(`#${r.n} ${r.ref} → ${r.outcome} · ${r.next} (${r.decidedBy})${r.error ? ` (${r.error})` : ''}`);
      }
    }),
  );
  results.sort((a, b) => a.n - b.n);
  console.table(results.map(({ n, ref, outcome, next, decidedBy }) => ({ n, ref, outcome, next, decidedBy })));
  const fallbacks = results.filter((r) => r.decidedBy !== 'model').length;
  if (fallbacks) console.warn(`${fallbacks} of ${results.length} cases were decided by the rules-only playbook (model unavailable or failed). Re-run them once the model is reachable.`);
}

/** Case refs end in the supplied folder number (PM-007 → 7); fall back to position. */
function caseNumber(c: Case, i: number) {
  const m = c.ref.match(/(\d+)$/);
  return m ? Number(m[1]) : i + 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
