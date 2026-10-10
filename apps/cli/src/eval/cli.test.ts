import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const cliDir = resolve(import.meta.dirname, '../..');
const root = resolve(cliDir, '../..');

function run(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/harness.ts', ...args], {
    cwd: cliDir, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, TRACK: 'property', REALITY_CONCURRENCY: '4', JUDGE_EFFORT: 'high', JUDGE_SAMPLES: '1', JUDGE_CONCURRENCY: '4', ...env },
  });
}

test('help documents every command, defaults and command placeholders', () => {
  for (const args of [['help'], ['--help'], ['-h']]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    for (const text of ['run', 'grade', 'report', 'scenarios', 'rehearse', 'lint', '--judge-effort', '--reality-cmd', '{root}', '600000']) {
      assert.ok(result.stdout.includes(text), text);
    }
  }
});

test('usage errors exit 2 before creating outputs', () => {
  const cases = [
    ['unknown'], ['--unknown'], ['run', '--suite', 'unknown'], ['run', '--agent', 'unknown'],
    ['run', '--agent', 'cmd'], ['run', '--judge', 'maybe'], ['run', '--judge-effort', 'extreme'],
    ['run', '--repeat', '0'], ['run', '--concurrency', '1.5'], ['run', '--timeout-ms', 'NaN'],
    ['run', '--judge-samples', '-1'], ['run', '--scenarios', ','], ['run', '--scenarios', 'missing-id'],
    ['run', '--track', 'missing-track'], ['run', '--out', ''], ['run', 'extra'], ['grade'],
    ['report', 'one', 'two'], ['lint', '--suite', 'unknown'], ['lint', '--judge', 'maybe'],
  ];
  for (const args of cases) {
    const result = run(args);
    assert.equal(result.status, 2, `${args.join(' ')}: ${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /harness:/);
    assert.match(result.stderr, /help/);
  }
});

test('invalid environment settings do not echo their values', () => {
  const sentinel = 'private-value-must-stay-hidden';
  for (const env of [{ REALITY_CONCURRENCY: sentinel }, { JUDGE_EFFORT: sentinel }]) {
    const result = run(['run', '--judge', 'off'], env);
    assert.equal(result.status, 2);
    assert.ok(!`${result.stdout}${result.stderr}`.includes(sentinel));
  }
});

test('exceptions redact credentials and have exit code 1', () => {
  const sentinel = 'private-value-must-stay-hidden';
  const result = run(['grade', sentinel, '--judge', 'off'], { ANTHROPIC_API_KEY: sentinel });
  assert.equal(result.status, 1);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(sentinel));
  assert.match(result.stderr, /\[redacted\]/);
});

test('lint resolves relative paths from the repo root and leaves files unchanged', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'casework-cli-lint-'));
  try {
    await writeFile(join(dir, 'README.md'), 'Read-only fixture.\n');
    const result = run(['lint', resolve(root, dir)]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Lint: 0 cases/);
    assert.match(result.stderr, /No numeric case directories/);
    assert.deepEqual(await readdir(dir), ['README.md']);
    assert.equal(await readFile(join(dir, 'README.md'), 'utf8'), 'Read-only fixture.\n');
    const relativeResult = run(['lint', '.casework/missing-cli-lint-fixture']);
    assert.equal(relativeResult.status, 1);
    assert.ok(relativeResult.stderr.includes(join(root, '.casework/missing-cli-lint-fixture')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('evaluation writes cannot target ANSWERS, including symlink aliases', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'casework-cli-link-'));
  try {
    await symlink(join(root, 'ANSWERS'), join(dir, 'answers'));
    for (const args of [
      ['run', '--out', 'ANSWERS'], ['scenarios', '--out', 'ANSWERS/subdir'],
      ['report', 'ANSWERS'], ['run', '--out', join(dir, 'answers')],
    ]) {
      const result = run([...args, '--judge', 'off']);
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /outside ANSWERS/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
