import type { RawCase } from '../schema';

const writtenFolders = new WeakMap<RawCase, string>();
const LAST_NUMBER = Symbol('last visible event number');

/** Remember the on-disk folder associated with a raw case. */
export function rememberFolder(raw: RawCase, directory: string): void {
  writtenFolders.set(raw, directory);
}

/** Return a case's known folder, without inspecting organiser source paths. */
export function writtenFolder(raw: RawCase): string | undefined {
  return writtenFolders.get(raw);
}

/** Retain the edited last number, including events with no original number. */
export function rememberLastNumber(map: Record<string, string | null>, number: string): void {
  // Original-event maps alone cannot encode a trailing appended event. Keep this
  // metadata out of the persisted original-number record and remap before JSON.
  Object.defineProperty(map, LAST_NUMBER, { value: number });
}

/** Read the edited last number associated with an original-event map. */
export function editedLastNumber(map: Record<string, string | null>): string | undefined {
  return (map as Record<string, string | null> & { [LAST_NUMBER]?: string })[LAST_NUMBER];
}
