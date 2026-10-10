import { basename, join } from 'node:path';
import { loadCase } from '../b/ingest/casefile';
import type { CaseFile } from '../b/types';
import { type Cut, loadCuts, loadSplit, PROPERTY_DIR } from './labels';
import type { Split } from './split';

/**
 * Few-shot memory: past moments (cut points) with what the team did next, retrieved by similarity to the
 * current case. Built only from the sets it is allowed to see, so evaluation stays honest.
 */

const STOP = new Set('the and for you your with this that have has are was were will would could can our from not but all any been into they them their please thanks thank there here what when then than just also about which regards dear hi hello kind best property tenant landlord agency system event'.split(' '));

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));

/** What a moment looks like: the title and the last few events, weighted towards the newest. */
export function signature(c: CaseFile): string[] {
  const last = c.events.slice(-4);
  return [...tokens(c.title), ...last.flatMap((e, i) => Array.from({ length: i + 1 }, () => tokens(`${e.from ?? ''} ${e.to ?? ''} ${e.body}`)).flat())];
}

interface Entry {
  cut: Cut;
  vec: Map<string, number>;
  norm: number;
}

export class ExampleBank {
  private constructor(
    private readonly entries: Entry[],
    private readonly idf: Map<string, number>,
  ) {}

  /** Index the cuts of the given sets. */
  static async build(sets: Split[] | 'all', dir = PROPERTY_DIR): Promise<ExampleBank> {
    const [cuts, split] = await Promise.all([loadCuts(), loadSplit()]);
    const chosen = cuts.filter((c) => sets === 'all' || sets.includes(split[c.case]!));
    const docs: { cut: Cut; toks: string[] }[] = [];
    for (const cut of chosen) {
      try {
        const c = await loadCase(join(dir, cut.case), { withhold: 'outcomes', cutBefore: cut.cutBefore, track: 'property' });
        docs.push({ cut, toks: signature(c) });
      } catch {
        /* A case that will not load just isn't in the bank. */
      }
    }
    const df = new Map<string, number>();
    for (const d of docs) for (const t of new Set(d.toks)) df.set(t, (df.get(t) ?? 0) + 1);
    const idf = new Map([...df].map(([t, n]) => [t, Math.log((docs.length + 1) / (n + 1)) + 1]));
    const entries = docs.map((d) => {
      const vec = weigh(d.toks, idf);
      return { cut: d.cut, vec, norm: norm(vec) };
    });
    return new ExampleBank(entries, idf);
  }

  get size() {
    return this.entries.length;
  }

  /** The k most similar moments from other cases, rendered for the prompt. */
  similar(c: CaseFile, k = 5): Cut[] {
    const q = weigh(signature(c), this.idf);
    const qn = norm(q);
    if (!qn) return [];
    const self = basename(c.dir);
    return this.entries
      .filter((e) => e.cut.case !== self)
      .map((e) => {
        let dot = 0;
        for (const [t, w] of q) dot += w * (e.vec.get(t) ?? 0);
        return { e, score: dot / (qn * e.norm || 1) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((x) => x.e.cut);
  }

  render(c: CaseFile, k = 5): string {
    return this.similar(c, k)
      .map((cut, i) => `${i + 1}. Situation: ${cut.situation}\n   Team's next action: ${cut.accept.join(' or ')}${cut.happened ? ` (${cut.happened})` : ''}${cut.prohibit.length ? `\n   Wrong at that moment: ${cut.prohibit.join(', ')}` : ''}`)
      .join('\n');
  }
}

function weigh(toks: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
  return new Map([...tf].map(([t, n]) => [t, (1 + Math.log(n)) * (idf.get(t) ?? 1)]));
}

const norm = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((a, b) => a + b * b, 0));
