import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createBaselineAdapter } from '../adapters';
import { shellQuote } from '../adapters/io';
import { fakePack } from '../adapters/test-fixtures';
import { ANSWER_SECTIONS } from '../checks';
import * as grading from '../grade';
import { readRawCase, scenarioSlug } from '../materialize';
import { EvalSuite, ScenarioResult, type EvalRunOptions, type JudgeOptions, type LedgerEntry } from '../schema';
import { fixtureSuite, FIXTURE_DATA_DIR } from '../testing/fixtures';
import { regradeRun, rehearse, runEval } from './index';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'casework-orchestration-')); });
afterEach(async () => { vi.restoreAllMocks(); await rm(dir, { recursive: true, force: true }); });
const judge: JudgeOptions = { enabled: false, model: 'unused', effort: 'high', samples: 1, concurrency: 1, fallbacks: false, cacheDir: null };
function options(): EvalRunOptions {
  return { suite: EvalSuite.parse(fixtureSuite), suiteName: 'all', adapter: createBaselineAdapter('escalate', { pack: fakePack() }),
    dataDir: FIXTURE_DATA_DIR, outRoot: join(dir, 'evals'), concurrency: 2, repeat: 1, timeoutMs: 2000, judge, compare: 'none' };
}
async function readResults(runDir: string): Promise<ScenarioResult[]> {
  return (await readFile(join(runDir, 'results.jsonl'), 'utf8')).trim().split('\n').map((line) => ScenarioResult.parse(JSON.parse(line)));
}

it('bounds concurrency, grades every repeat and continues after a grading failure', async () => {
  const opts = options();
  opts.repeat = 2;
  const baseline = opts.adapter;
  let running = 0;
  let maxRunning = 0;
  opts.adapter = { ...baseline, async run(input) {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    try { return await baseline.run(input); } finally { running--; }
  } };
  const progress: string[] = [];
  opts.onProgress = (line) => progress.push(line);
  const grade = vi.spyOn(grading, 'gradeScenario').mockRejectedValueOnce(new Error('One grading failure'));
  const output = await runEval(opts);
  const results = await readResults(output.runDir);
  expect(maxRunning).toBe(2);
  expect(results).toHaveLength(8);
  expect(grade).toHaveBeenCalledTimes(8);
  const failed = results.filter((result) => result.agentError);
  expect(failed).toHaveLength(1);
  expect(failed[0]).toMatchObject({ agentError: 'Grading failed: One grading failure', judge: { error: 'Grading failed: One grading failure' },
    scores: { completed: false, outcome: 0, judgement: 0, engineering: 0 } });
  expect(results.filter((result) => result.scores.completed)).toHaveLength(7);
  expect(progress).toHaveLength(8);
  expect(progress.at(-1)).toMatch(/^\[8\/8\] FX-.* r[12] → .* · outcome \d\.\d\d · judgement \d\.\d\d \(\d+\.\ds\)$/);
  expect(results.map((result) => `${result.scenarioId}:${result.repeat}`)).toEqual([...results].sort((a, b) => a.scenarioId.localeCompare(b.scenarioId) || a.repeat - b.repeat).map((result) => `${result.scenarioId}:${result.repeat}`));
});

it('persists run configuration and leak findings before rejecting execution', async () => {
  const opts = options();
  opts.suiteName = 'smoke';
  opts.suite.scenarios[0]!.hiddenFacts.push({ text: 'A hidden detail', marker: 'Case' });
  const run = vi.spyOn(opts.adapter, 'run');
  await expect(runEval(opts)).rejects.toThrow(/Leak audit failed:[\s\S]*FX-001@005[\s\S]*hidden_fact/);
  expect(run).not.toHaveBeenCalled();
  const runDir = join(opts.outRoot, (await readdir(opts.outRoot))[0]!);
  const config = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8'));
  expect(config.scenarioIds).toEqual(['FX-001@005']);
  const hidden = JSON.parse(await readFile(join(runDir, 'hidden', 'FX-001_005.json'), 'utf8'));
  expect(hidden.leak.ok).toBe(false);
  opts.outRoot = join(dir, 'allowed');
  opts.allowLeaks = true;
  const permitted = await runEval(opts);
  expect((await readResults(permitted.runDir))).toHaveLength(1);
  expect(run).toHaveBeenCalledTimes(1);
});

it('restores saved metadata, traces and ledger for regrading without invoking the adapter', async () => {
  const opts = options();
  const run = vi.spyOn(opts.adapter, 'run');
  const output = await runEval(opts);
  const rows = await readResults(output.runDir);
  const first = rows[0]!;
  const artifactDir = join(output.runDir, first.artifactsDir);
  const usage = { inputTokens: 50, outputTokens: 9, cacheReadTokens: 1, cacheWriteTokens: 2 };
  await writeFile(join(artifactDir, 'run.json'), JSON.stringify({ ok: true, error: null, ms: 1234, usage }));
  const ledger: LedgerEntry = { tool: 'desk.message', kind: 'message', args: { text: 'Scope question' }, idempotencyKey: 'saved-key', attempt: 1, outcome: 'ok', at: '2026-01-01T00:00:00Z' };
  await writeFile(join(artifactDir, 'ledger.jsonl'), JSON.stringify(ledger) + '\n');
  const progress: string[] = [];
  const grade = vi.spyOn(grading, 'gradeScenario');
  await regradeRun(output.runDir, { suite: opts.suite, judge, compare: 'none', onProgress: (line) => progress.push(line) });
  expect(run).toHaveBeenCalledTimes(4);
  expect(progress.some((line) => line.includes('visible text changed'))).toBe(false);
  const restored = grade.mock.calls.find(([input]) => input.scenario.id === first.scenarioId)![0];
  expect(restored.agent).toMatchObject({ ok: true, ms: 1234, usage, ledger: [ledger] });
  const updated = (await readResults(output.runDir)).find((row) => row.scenarioId === first.scenarioId)!;
  expect(updated.agentUsage).toEqual(usage);
  expect(updated.ms).toBe(1234);
});

it('restores the appended visible event as the cut when regrading a perturbed scenario', async () => {
  const opts = options();
  opts.scenarioIds = ['FX-001@005~scope-update'];
  const output = await runEval(opts);
  const original = (await readResults(output.runDir))[0]!;
  expect(original.agentError).toBeNull();
  expect(original.scores.completed).toBe(true);
  const raw = await readRawCase(join(output.runDir, 'scenarios', scenarioSlug(original.scenarioId), opts.suite.trackFolder), '001');
  const appended = raw.history.events.at(-1)!;
  expect(appended.number).toBe('006');
  expect(appended.body).toContain('Please include the second unit');
  const grade = vi.spyOn(grading, 'gradeScenario');
  await regradeRun(output.runDir, { suite: opts.suite, judge, compare: 'none' });
  const restored = grade.mock.calls[0]![0].materialized;
  expect(Object.values(restored.hidden.renumbering)).not.toContain(appended.number);
  expect(restored.spec.cutAfter).toBe(appended.number);
  expect(restored.visibleEvents.at(-1)).toBe(appended.number);
  const regraded = (await readResults(output.runDir))[0]!;
  expect(regraded.scores).toEqual(original.scores);
  expect(regraded.items).toEqual(original.items);
});

it('warns about current visible text changes and missing scenarios while grading the stored case', async () => {
  const opts = options();
  const output = await runEval(opts);
  const changed = EvalSuite.parse(fixtureSuite);
  changed.scenarios = [changed.scenarios[0]!];
  changed.scenarios[0]!.question = 'A new visible question for the case.';
  const progress: string[] = [];
  const grade = vi.spyOn(grading, 'gradeScenario');
  await regradeRun(output.runDir, { suite: changed, judge, compare: 'none', onProgress: (line) => progress.push(line) });
  expect(progress).toContain('Skipping FX-002@002: missing from the current suite');
  expect(progress.some((line) => line.startsWith('Warning: visible text changed for FX-001@005'))).toBe(true);
  const stored = grade.mock.calls.find(([input]) => input.scenario.variant === 'base')![0].materialized;
  expect(stored.visibleText).not.toContain('A new visible question for the case.');
  expect(stored.spec.question).toBe('A new visible question for the case.');
  expect(await readResults(output.runDir)).toHaveLength(3);
});

it('compares with the latest run and updates the latest pointer only after reporting', async () => {
  const opts = options();
  opts.suiteName = 'smoke';
  const first = await runEval(opts);
  const second = await runEval({ ...opts, adapter: createBaselineAdapter('reckless', { pack: fakePack() }), compare: 'last' });
  expect(second.comparison?.previousRunId).toBe(first.summary.runId);
  expect((await readFile(join(opts.outRoot, 'latest'), 'utf8')).trim()).toBe(second.summary.runId);
  expect(JSON.parse(await readFile(join(second.runDir, 'comparison.json'), 'utf8')).previousRunId).toBe(first.summary.runId);
});

it('rejects invalid repeat or concurrency counts', async () => {
  await expect(runEval({ ...options(), repeat: 0 })).rejects.toThrow('repeat');
  await expect(runEval({ ...options(), concurrency: 0 })).rejects.toThrow();
});

it('materializes a shared challenge root, runs a local rehearsal command and grades its answers', async () => {
  const suite = EvalSuite.parse(fixtureSuite);
  const answer = ANSWER_SECTIONS.map((section) => `**${section}**\nNone`).join('\n\n');
  const script = `
    const fs = require('node:fs'), p = require('node:path');
    const [root, out, concurrency, track] = process.argv.slice(1);
    console.log('concurrency=' + concurrency + '; track=' + track + '; prompt=' + process.env.COREPACK_ENABLE_DOWNLOAD_PROMPT);
    for (const folder of fs.readdirSync(p.join(root, ${JSON.stringify(suite.trackFolder)}))) {
      const dir = p.join(out, String(Number(folder)));
      fs.mkdirSync(dir, {recursive:true});
      fs.writeFileSync(p.join(dir,'ANSWER.md'), ${JSON.stringify(answer)});
      fs.writeFileSync(p.join(dir,'REASONING.md'), 'Scope needs confirmation.');
      const base = {runId:'rehearsal', at:'2026-01-01T00:00:00Z'};
      const events = [ {...base, seq:0, type:'run.started', caseRef:'FX-' + folder, autonomy:'autonomous'},
        {...base, seq:1, type:'run.completed', outcome:'needs_info', summary:'Asked for confirmation.', usage:{inputTokens:0,outputTokens:0,cacheReadTokens:0,cacheWriteTokens:0}} ];
      fs.writeFileSync(p.join(dir,'trace.jsonl'), events.map(e => JSON.stringify(e)).join('\\n') + '\\n');
    }
  `;
  const output = await rehearse({ suite, suiteName: 'all', dataDir: FIXTURE_DATA_DIR, outRoot: join(dir, 'evals'), track: suite.track,
    concurrency: 2, judge, command: `${shellQuote(process.execPath)} -e ${shellQuote(script)} {in} {out} {concurrency} {track}` });
  expect(output.dir).toContain(join(dir, 'rehearsals'));
  expect(output.lint.ok).toBe(true);
  expect(output.lint.rows).toHaveLength(4);
  const folders = (await readdir(join(output.dir, 'cases', suite.trackFolder))).sort();
  expect(folders).toEqual(['001', '002', '003', '004']);
  const manifest = JSON.parse(await readFile(join(output.dir, 'manifest.json'), 'utf8'));
  expect(manifest).toMatchObject({ 1: 'FX-001@005', 2: 'FX-002@002', 3: 'FX-001@005~scope-update', 4: 'FX-001@005#esc' });
  const results = await readResults(output.dir);
  expect(results).toHaveLength(4);
  expect(results.every((row) => row.scores.completed)).toBe(true);
  expect(JSON.parse(await readFile(join(output.dir, 'timing.json'), 'utf8'))).toEqual({ ms: output.ms, cases: 4, concurrency: 2 });
  expect(await readFile(join(output.dir, 'reality.log'), 'utf8')).toContain('concurrency=2;');
  expect(await readFile(join(output.dir, 'reality.log'), 'utf8')).toContain('prompt=0');
  expect(await readFile(join(output.dir, 'report.md'), 'utf8')).toContain('Eval report');
  for (const scenarioId of Object.values(manifest) as string[]) {
    expect(JSON.parse(await readFile(join(output.dir, 'grades', `${scenarioSlug(scenarioId)}.r1.json`), 'utf8')).scenarioId).toBe(scenarioId);
  }
});

it('grades missing rehearsal answers as failures and records the command failure', async () => {
  const opts = options();
  const progress: string[] = [];
  const output = await rehearse({ ...opts, track: opts.suite.track, suiteName: 'holdout', command: 'exit 9', onProgress: (line) => progress.push(line) });
  expect(output.lint.ok).toBe(false);
  expect(progress).toContain('Reality command: Command exited with code 9');
  expect((await readResults(output.dir))[0]).toMatchObject({ scores: { completed: false, outcome: 0, judgement: 0, engineering: 0 } });
});
