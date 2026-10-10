import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Case, type TrackId } from '@casework/core';

/**
 * Default loader: reads every *.json file in <dataDir>/<track>/ that already matches the Case schema.
 * Replace per track once the real synthetic data format is known (use the pdf / xlsx skills for documents).
 */
export async function loadJsonCases(dataDir: string, track: TrackId): Promise<Case[]> {
  const dir = join(dataDir, track);
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const cases: Case[] = [];
  for (const f of files) {
    const raw = JSON.parse(await readFile(join(dir, f), 'utf8'));
    for (const item of Array.isArray(raw) ? raw : [raw]) {
      const parsed = Case.safeParse(item);
      if (parsed.success) cases.push(parsed.data);
      else console.warn(`[${track}] skipped a record in ${f}: ${parsed.error.issues[0]?.message}`);
    }
  }
  return cases;
}

/** Spend-limit rule factory shared by tracks that gate money-moving tools. */
export function spendLimit(id: string, tools: string[], limitPence: number, label: string) {
  return {
    id,
    describe: `${label} may not exceed £${(limitPence / 100).toFixed(2)} without a person`,
    appliesTo: tools,
    check(call: { args: unknown }) {
      const amount = (call.args as { amountPence?: number })?.amountPence;
      return typeof amount === 'number' && amount > limitPence
        ? { ok: false as const, why: `£${(amount / 100).toFixed(2)} is over the £${(limitPence / 100).toFixed(2)} limit` }
        : { ok: true as const };
    },
  };
}
