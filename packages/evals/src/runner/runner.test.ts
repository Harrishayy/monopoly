import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBaselineAdapter } from '../adapters';
import { fakePack } from '../adapters/test-fixtures';
import { EvalSuite, ScenarioResult, type JudgeOptions } from '../schema';
import { NotImplementedYet } from '../stub';
import { fixtureSuite, FIXTURE_DATA_DIR } from '../testing/fixtures';
import { makeRunId, resolvePreviousRun, runEval } from './index';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'casework-runner-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
const judge: JudgeOptions = { enabled: false, model: 'unused', effort: 'high', samples: 1, concurrency: 1, fallbacks: false, cacheDir: null };

it('formats UTC run ids and bounds the sanitized agent slug', () => {
  expect(makeRunId(new Date('2026-10-10T13:14:15+02:00'), 'smoke', 'CMD: A Fancy_Agent!')).toBe('20261010-111415-smoke-cmd-a-fancy-agent');
  const id = makeRunId(new Date('2026-01-02T03:04:05Z'), 'all', 'A'.repeat(60));
  expect(id).toBe(`20260102-030405-all-${'a'.repeat(40)}`);
  expect(makeRunId(new Date(0), 'dev', '💡')).toBe('19700101-000000-dev-agent');
});

describe('resolvePreviousRun', () => {
  async function previous() {
    const path = join(dir, 'previous');
    await mkdir(path);
    await writeFile(join(path, 'results.jsonl'), '');
    return path;
  }
  it('returns null for none, absent latest, invalid latest and the current run', async () => {
    expect(await resolvePreviousRun(dir, 'none')).toBeNull();
    expect(await resolvePreviousRun(dir, 'last')).toBeNull();
    await writeFile(join(dir, 'latest'), 'missing\n');
    expect(await resolvePreviousRun(dir, 'last')).toBeNull();
    await previous();
    await writeFile(join(dir, 'latest'), 'previous\n');
    expect(await resolvePreviousRun(dir, 'last', 'previous')).toBeNull();
  });
  it('resolves latest and explicit relative or absolute paths to an absolute directory', async () => {
    const path = await previous();
    await writeFile(join(dir, 'latest'), 'previous\n');
    expect(await resolvePreviousRun(dir, 'last', 'current')).toBe(resolve(path));
    expect(await resolvePreviousRun(dir, 'previous')).toBe(resolve(path));
    expect(await resolvePreviousRun(dir, path)).toBe(resolve(path));
  });
  it('requires a directory and a results file for explicit comparisons', async () => {
    await expect(resolvePreviousRun(dir, 'missing')).rejects.toThrow('containing results.jsonl');
    await mkdir(join(dir, 'no-results'));
    await expect(resolvePreviousRun(dir, 'no-results')).rejects.toThrow('containing results.jsonl');
    await mkdir(join(dir, 'no-results', 'results.jsonl'));
    await expect(resolvePreviousRun(dir, 'no-results')).rejects.toThrow('containing results.jsonl');
    await writeFile(join(dir, 'not-a-dir'), '');
    await writeFile(join(dir, 'latest'), 'not-a-dir');
    expect(await resolvePreviousRun(dir, 'last')).toBeNull();
  });
});

it('runs the fixture suite end to end through the escalate baseline', async (context) => {
  const suite = EvalSuite.parse(fixtureSuite);
  try {
    const output = await runEval({ suite, suiteName: 'all', adapter: createBaselineAdapter('escalate', { pack: fakePack() }),
      dataDir: FIXTURE_DATA_DIR, outRoot: join(dir, 'evals'), concurrency: 2, repeat: 1, timeoutMs: 2000, judge, compare: 'none' });
    const results = (await readFile(join(output.runDir, 'results.jsonl'), 'utf8')).trim().split('\n').map((line) => ScenarioResult.parse(JSON.parse(line)));
    expect(results).toHaveLength(4);
    expect(results.every((result) => result.scores.completed && !result.agentError)).toBe(true);
    expect(results.map((result) => result.scenarioId)).toEqual([...results.map((result) => result.scenarioId)].sort((a, b) => a.localeCompare(b)));
    for (const entry of ['run.json', 'scenarios', 'hidden', 'agent', 'grades', 'summary.json', 'report.md']) expect(await stat(join(output.runDir, entry))).toBeTruthy();
    for (const result of results) {
      const artifactDir = join(output.runDir, result.artifactsDir);
      for (const file of ['ANSWER.md', 'REASONING.md', 'trace.jsonl', 'ledger.jsonl', 'run.json']) expect((await stat(join(artifactDir, file))).isFile()).toBe(true);
    }
    expect((await readFile(join(dir, 'evals', 'latest'), 'utf8')).trim()).toBe(output.summary.runId);
  } catch (error) {
    if (error instanceof NotImplementedYet) context.skip(`Parallel dependency is pending: ${error.message}`);
    else throw error;
  }
});
