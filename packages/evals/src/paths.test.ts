import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDataDir, defaultOutRoot, gitInfo, repoRoot } from './paths';

const { git } = vi.hoisted(() => ({ git: vi.fn() }));
vi.mock('node:child_process', () => ({ execFileSync: git }));

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'casework-paths-'));
  git.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

function file(path: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, '');
}

describe('repoRoot', () => {
  it('walks up from a nested directory and accepts an existing file path', () => {
    file(join(root, 'pnpm-workspace.yaml'));
    const nested = join(root, 'packages/example/src/file.ts');
    file(nested);
    expect(repoRoot(join(nested, '..'))).toBe(root);
    expect(repoRoot(nested)).toBe(root);
    expect(repoRoot(root)).toBe(root);
  });

  it('uses the working directory by default', () => {
    file(join(root, 'pnpm-workspace.yaml'));
    vi.spyOn(process, 'cwd').mockReturnValue(join(root, 'packages/example'));
    expect(repoRoot()).toBe(root);
  });

  it('throws a clear error when there is no workspace marker', () => {
    expect(() => repoRoot(root)).toThrow(`Could not find pnpm-workspace.yaml in any parent of ${root}`);
  });
});

describe('default data and output paths', () => {
  it('prefers public data when a track subfolder has an NNN/index.md', () => {
    file(join(root, 'data/public/Fixture Track/001/index.md'));
    mkdirSync(join(root, 'HackatonPublicCases'));
    expect(defaultDataDir(root)).toBe(join(root, 'data/public'));
  });

  it('falls back to the legacy folder when public data has no case folders', () => {
    file(join(root, 'data/public/Fixture Track/not-a-case/index.md'));
    file(join(root, 'data/public/001/index.md'));
    mkdirSync(join(root, 'HackatonPublicCases'));
    expect(defaultDataDir(root)).toBe(join(root, 'HackatonPublicCases'));
  });

  it('does not treat empty numbered folders or an index directory as case data', () => {
    mkdirSync(join(root, 'data/public/Fixture Track/001/index.md'), { recursive: true });
    mkdirSync(join(root, 'HackatonPublicCases'));
    expect(defaultDataDir(root)).toBe(join(root, 'HackatonPublicCases'));
  });

  it('returns the public path when neither source has case data', () => {
    file(join(root, 'HackatonPublicCases'));
    expect(defaultDataDir(root)).toBe(join(root, 'data/public'));
  });

  it('uses the discovered root for data and output paths', () => {
    file(join(root, 'pnpm-workspace.yaml'));
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    expect(defaultDataDir()).toBe(join(root, 'data/public'));
    expect(defaultOutRoot()).toBe(join(root, '.casework/evals'));
    expect(defaultOutRoot(root)).toBe(join(root, '.casework/evals'));
  });
});

describe('gitInfo', () => {
  it.each([['', false], [' M src/example.ts\n', true]])('reads revision and status (%j)', (status, dirty) => {
    git.mockReturnValueOnce('abc1234\n').mockReturnValueOnce(status);
    expect(gitInfo(root)).toEqual({ sha: 'abc1234', dirty });
    expect(git).toHaveBeenNthCalledWith(1, 'git', ['rev-parse', '--short', 'HEAD'], expect.objectContaining({ cwd: root, encoding: 'utf8' }));
    expect(git).toHaveBeenNthCalledWith(2, 'git', ['status', '--porcelain'], expect.objectContaining({ cwd: root }));
  });

  it('returns nulls when git is unavailable or status fails', () => {
    git.mockImplementationOnce(() => { throw new Error('Git unavailable'); });
    expect(gitInfo(root)).toEqual({ sha: null, dirty: null });
    git.mockReturnValueOnce('abc1234\n').mockImplementationOnce(() => { throw new Error('Status unavailable'); });
    expect(gitInfo(root)).toEqual({ sha: null, dirty: null });
  });

  it('never throws when the default workspace root cannot be found', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    expect(gitInfo()).toEqual({ sha: null, dirty: null });
    expect(git).not.toHaveBeenCalled();
  });
});
