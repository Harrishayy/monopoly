import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { EvalSuite, type HiddenContinuation, type RawCase, type ScenarioSpec } from '../schema';
import { fixtureSuite } from '../testing/fixtures';
import { renderHistoryMd, renderIndexMd } from './index';

export const suite = EvalSuite.parse(fixtureSuite);
export const publicDir = resolve(import.meta.dirname, '../../../../data/public');
export const hasPublicData = existsSync(publicDir);

/** Discover numbered public folders without knowledge of track names. */
export async function publicFolders(): Promise<{ trackDir: string; folder: string }[]> {
  if (!hasPublicData) return [];
  const tracks = (await readdir(publicDir, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const folders = await Promise.all(tracks.map(async (track) => {
    const trackDir = join(publicDir, track.name);
    return (await readdir(trackDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^\d{3}$/.test(entry.name) && existsSync(join(trackDir, entry.name, 'index.md')))
      .map((entry) => ({ trackDir, folder: entry.name }));
  }));
  return folders.flat().sort((a, b) => a.trackDir.localeCompare(b.trackDir) || a.folder.localeCompare(b.folder));
}

/** Compare raw content while ignoring where attachment bytes are stored. */
export function rawContent(raw: RawCase): unknown {
  return { ...raw, attachments: raw.attachments.map(({ fileName, text }) => ({ fileName, text })) };
}

/** Render the complete text available in an in-memory visible case. */
export function visibleText(raw: RawCase): string {
  return renderIndexMd(raw) + '\n\n' + renderHistoryMd(raw)
    + raw.attachments.map(({ fileName, text }) => `\n\n[attachment ${fileName}]\n${text ?? '[no text]'}`).join('');
}

/** Build a neutral spec at a chosen event using the fixture suite defaults. */
export function specAt(cutAfter: string): ScenarioSpec {
  return { ...structuredClone(suite.scenarios[0]!), cutAfter, question: undefined, hiddenFacts: [] };
}

/** Add scenario identity and an unchanged event map to a cut continuation. */
export function continuation(visible: RawCase, hidden: Omit<HiddenContinuation, 'scenarioId' | 'renumbering'>): HiddenContinuation {
  return { scenarioId: 'FX-001@005', ...hidden,
    renumbering: Object.fromEntries(visible.history.events.map((event) => [event.number, event.number])),
  };
}
