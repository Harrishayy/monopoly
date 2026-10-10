/**
 * Shows how the property rules read one case: every event with its parties, signals and noise,
 * then the assessment. For tuning the deterministic layer without calling a model.
 *   pnpm --filter @casework/tracks inspect 033 --cut 9   # as it stood just before event 9
 *   pnpm --filter @casework/tracks inspect 033 --json    # assessment as JSON only
 */
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { assess } from './assess';
import { toEvents } from './events';
import { pack } from './index';

const root = resolve(import.meta.dirname, '../../../..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    in: { type: 'string', default: 'data/public' },
    cut: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

const id = (positionals[0] ?? '').padStart(3, '0');
const all = await pack.loadCases(resolve(root, values.in!), { withhold: 'outcomes' });
let c = all.find((x) => x.ref.endsWith(`-${id}`));
if (!c) {
  console.error(`No case ${id}`);
  process.exit(1);
}
const cut = values.cut ? Number(values.cut) : undefined;
if (cut) {
  c = {
    ...c,
    sources: c.sources.filter((s) => {
      const n = s.id.match(/:event-(\d+)$/)?.[1] ?? (s.meta as { event?: number }).event;
      return n === undefined || Number(n) < cut;
    }),
  };
}
const asOf = cut ? all.find((x) => x.ref === c!.ref)!.sources.find((s) => s.id.endsWith(`event-${String(cut).padStart(3, '0')}`))?.receivedAt : undefined;
const a = assess(c, { asOf });

if (!values.json) {
  for (const e of toEvents(c)) {
    const sig = [...e.signals].join(',');
    console.log(`${String(e.n).padStart(3)} ${e.at.slice(0, 16)} ${e.channel.padEnd(6)} ${e.from}→${e.to}${sig ? ` [${sig}]` : ''}${e.noise ? ` NOISE: ${e.noise}` : ''}  ${e.body.replace(/\s+/g, ' ').slice(0, 90)}`);
  }
  console.log('');
}
console.log(JSON.stringify(a, null, 1));
