import 'server-only';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { REPO_ROOT } from '../config';

/**
 * Reads a root `.env` key. Route workers and `instrumentation` do not always inherit what
 * `next.config` loaded; voice and email both go through this so a key written by `pnpm email:setup`
 * or `pnpm tunnel` is visible without a restart loop.
 */
export function liveEnv(name: string, fresh = false): string | undefined {
  if (fresh || !process.env[name]) {
    try {
      const parsed = parseEnv(readFileSync(resolve(/* turbopackIgnore: true */ REPO_ROOT, '.env'), 'utf8'));
      for (const [k, v] of Object.entries(parsed)) if (v && (!process.env[k] || (fresh && k === name))) process.env[k] = v;
    } catch {
      // No .env: leave the variable unset.
    }
  }
  return process.env[name] || undefined;
}
