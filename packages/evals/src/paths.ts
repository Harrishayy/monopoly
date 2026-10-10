import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function isFile(path: string): boolean {
  try { return statSync(path).isFile(); } catch { return false; }
}

function isDirectory(path: string): boolean {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function directories(path: string): string[] {
  try {
    return readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch { return []; }
}

/** Walk upwards from a path to the directory containing pnpm-workspace.yaml. */
export function repoRoot(from: string = process.cwd()): string {
  let current = resolve(from);
  if (isFile(current)) current = dirname(current);
  while (true) {
    if (isFile(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) throw new Error(`Could not find pnpm-workspace.yaml in any parent of ${resolve(from)}`);
    current = parent;
  }
}

/** Prefer populated public case data, then the legacy data folder, then the public path. */
export function defaultDataDir(root: string = repoRoot()): string {
  const publicDir = join(root, 'data/public');
  const hasCases = directories(publicDir).some((track) =>
    directories(join(publicDir, track)).some((folder) => /^\d{3}$/.test(folder) && isFile(join(publicDir, track, folder, 'index.md'))),
  );
  if (hasCases) return publicDir;
  const legacyDir = join(root, 'HackatonPublicCases');
  return isDirectory(legacyDir) ? legacyDir : publicDir;
}

/** Return the default evaluation output directory under the repository root. */
export function defaultOutRoot(root: string = repoRoot()): string {
  return join(root, '.casework/evals');
}

/** Read the short git revision and worktree status, returning nulls if unavailable. */
export function gitInfo(root?: string): { sha: string | null; dirty: boolean | null } {
  try {
    const cwd = root ?? repoRoot();
    const opts = { cwd, encoding: 'utf8' as const, stdio: ['ignore', 'pipe', 'ignore'] as ['ignore', 'pipe', 'ignore'] };
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], opts).trim();
    const status = execFileSync('git', ['status', '--porcelain'], opts);
    return { sha, dirty: status.length > 0 };
  } catch {
    return { sha: null, dirty: null };
  }
}
