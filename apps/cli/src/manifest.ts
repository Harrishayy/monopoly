import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isRunKind, RUN_KINDS, RUN_MANIFEST_FILE, RunManifest, type RunKind } from '@casework/core';

/** --kind, --name and --note, shared by every command that writes a run folder. */
export const manifestOptions = {
  kind: { type: 'string' },
  name: { type: 'string' },
  note: { type: 'string' },
} as const;

export function runKind(flag: string | undefined, fallback: RunKind): RunKind {
  if (flag === undefined) return fallback;
  if (!isRunKind(flag)) throw new Error(`--kind must be one of ${RUN_KINDS.join(', ')}`);
  return flag;
}

/** Writes <dir>/run.json so the UI can tell smoke, split and Reality Test runs apart. */
export async function writeManifest(dir: string, m: RunManifest) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, RUN_MANIFEST_FILE), JSON.stringify(RunManifest.parse(m), null, 2) + '\n');
}
