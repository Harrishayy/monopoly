import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { guessRunKind, RUN_MANIFEST_FILE, RunManifest } from '@casework/core';
import type { RunTag } from '@/lib/api-types';

/** A run folder's run.json; without one, the kind is guessed from the folder name. */
export async function readRunTag(dir: string, folderName: string): Promise<RunTag & { manifest?: RunManifest }> {
  const raw = await readFile(join(dir, RUN_MANIFEST_FILE), 'utf8').catch(() => undefined);
  if (raw) {
    try {
      const m = RunManifest.safeParse(JSON.parse(raw));
      if (m.success) return { kind: m.data.kind, name: m.data.name, note: m.data.note, manifest: m.data };
    } catch {
      // Malformed run.json: fall through to the guess.
    }
  }
  return { kind: guessRunKind(folderName) };
}
