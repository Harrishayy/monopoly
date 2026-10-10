import 'server-only';
import { resolve } from 'node:path';

/** `next dev` runs from apps/web; everything is resolved from the repo root at runtime. */
export const REPO_ROOT = resolve(/* turbopackIgnore: true */ process.cwd(), '../..');
export const DATA_DIR = resolve(/* turbopackIgnore: true */ REPO_ROOT, process.env.DATA_DIR ?? './data/public');
/** Example cases include how they ended; hide that unless DATA_WITHHOLD=none (e.g. for the Reality Test folder). */
export const DATA_WITHHOLD = process.env.DATA_WITHHOLD === 'none' ? 'none' : 'outcomes';
export const ACTIVE_TRACK = process.env.TRACK ?? 'property';
