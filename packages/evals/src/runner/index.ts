import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import pLimit from 'p-limit';
import { errorMessage, readAgentOutput, runShell, shellQuote } from '../adapters/io';
import { lintAnswersDir } from '../checks';
import { gradeScenario } from '../grade';
import { materializeScenario, readRawCase, remapSpec, renderHistoryMd, renderIndexMd, scenarioSlug } from '../materialize';
import { gitInfo, repoRoot } from '../paths';
import { writeRunReport } from '../report';
import {
  HiddenContinuation, LeakAudit, RunConfig, ScenarioResult,
  type AgentRunOutput, type ConcreteScenario, type EvalRunOptions, type EvalRunResult, type EvalSuite,
  type GradeInput, type MaterializedScenario, type RegradeOptions, type RehearseOptions, type RehearseResult,
} from '../schema';
import { expandScenarios, rubricVersion, selectScenarios } from '../suite';

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

function selected(opts: Pick<EvalRunOptions, 'suite' | 'suiteName' | 'scenarioIds'>): ConcreteScenario[] {
  return selectScenarios(expandScenarios(opts.suite), opts.suite, {
    suite: opts.suiteName === 'custom' ? 'all' : opts.suiteName, ids: opts.scenarioIds,
  });
}

function configFor(runId: string, scenarios: ConcreteScenario[], opts: Pick<EvalRunOptions, 'suite' | 'suiteName' | 'dataDir' | 'concurrency' | 'repeat' | 'timeoutMs' | 'judge' | 'models'>, agent: string): RunConfig {
  const git = gitInfo();
  return {
    runId, createdAt: new Date().toISOString(), suite: opts.suiteName, scenarioIds: scenarios.map((s) => s.id),
    agent, track: opts.suite.track, dataDir: resolve(opts.dataDir), gitSha: git.sha, gitDirty: git.dirty,
    models: opts.models ?? { decide: process.env.MODEL_DECIDE ?? null, fast: process.env.MODEL_FAST ?? null, judge: opts.judge.enabled ? opts.judge.model : null },
    judge: { enabled: opts.judge.enabled, samples: opts.judge.samples, effort: opts.judge.effort },
    rubricVersion: rubricVersion(opts.suite), concurrency: opts.concurrency, repeat: opts.repeat, timeoutMs: opts.timeoutMs,
  };
}

function failedAgent(error: unknown): AgentRunOutput {
  return { ok: false, error: errorMessage(error), events: null, ledger: [], ms: 0, usage: null, answerPath: null, reasoningPath: null, tracePath: null };
}

async function gradeSafely(input: GradeInput): Promise<ScenarioResult> {
  try { return await gradeScenario(input); } catch (error) {
    const message = `Grading failed: ${errorMessage(error)}`;
    return {
      runId: input.runId, scenarioId: input.scenario.id, baseId: input.scenario.baseId, variant: input.scenario.variant,
      repeat: input.repeat, title: input.materialized.spec.title, tags: input.materialized.spec.tags, agent: input.agentName,
      expectedDecision: input.materialized.spec.expected.decision, ms: input.agent.ms,
      agentError: [input.agent.error, message].filter(Boolean).join('; '), agentUsage: input.agent.usage,
      checks: [{ id: 'completed', ok: false, severity: 'critical', tag: 'robustness', message }], items: [],
      judge: { verdict: null, model: input.judge.model, samples: input.judge.samples, agreement: null, cached: false,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: null, error: message },
      scores: { completed: false, critical: true, outcome: 0, judgement: 0, engineering: 0, usability: null, decisionObserved: null, decisionMatch: null },
      topIssue: message, fixArea: null, artifactsDir: input.artifactsDir,
    };
  }
}

async function writeResults(runDir: string, results: ScenarioResult[]): Promise<void> {
  results.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId) || a.repeat - b.repeat);
  await writeFile(join(runDir, 'results.jsonl'), results.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

async function storeHidden(runDir: string, materialized: MaterializedScenario): Promise<void> {
  await writeJson(join(runDir, 'hidden', `${scenarioSlug(materialized.scenario.id)}.json`), { ...materialized.hidden, leak: materialized.leak });
}

/** Build a UTC timestamped run id with a lowercase, bounded adapter slug. */
export function makeRunId(date: Date, suite: string, agent: string): string {
  const iso = date.toISOString();
  const timestamp = iso.slice(0, 10).replaceAll('-', '') + '-' + iso.slice(11, 19).replaceAll(':', '');
  const slug = agent.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '') || 'agent';
  return `${timestamp}-${suite}-${slug}`;
}

/** Resolve a previous run containing results.jsonl, treating an unusable latest pointer as absent. */
export async function resolvePreviousRun(outRoot: string, compare: string, currentRunId?: string): Promise<string | null> {
  if (compare === 'none') return null;
  let candidate: string;
  if (compare === 'last') {
    const pointer = await readFile(join(outRoot, 'latest'), 'utf8').catch(() => null);
    if (!pointer?.trim()) return null;
    candidate = resolve(outRoot, pointer.trim());
    if (currentRunId && candidate === resolve(outRoot, currentRunId)) return null;
  } else {
    candidate = isAbsolute(compare) ? resolve(compare) : resolve(outRoot, compare);
  }
  const [dir, results] = await Promise.all([stat(candidate).catch(() => null), stat(join(candidate, 'results.jsonl')).catch(() => null)]);
  if (!dir?.isDirectory() || !results?.isFile()) {
    if (compare === 'last') return null;
    throw new Error(`Comparison run must be a directory containing results.jsonl: ${candidate}`);
  }
  return candidate;
}

/** Materialize, execute, grade and report the selected scenarios with bounded concurrency. */
export async function runEval(opts: EvalRunOptions): Promise<EvalRunResult> {
  if (!Number.isInteger(opts.repeat) || opts.repeat < 1) throw new Error('repeat must be a positive integer');
  const limit = pLimit(opts.concurrency);
  const scenarios = selected(opts);
  const runId = makeRunId(new Date(), opts.suiteName, opts.adapter.name);
  const runDir = resolve(opts.outRoot, runId);
  await writeJson(join(runDir, 'run.json'), configFor(runId, scenarios, opts, opts.adapter.name));
  const materialized = await Promise.all(scenarios.map(async (scenario) => {
    const result = await materializeScenario({ scenario, suite: opts.suite, dataDir: opts.dataDir, outDir: join(runDir, 'scenarios', scenarioSlug(scenario.id)) });
    await storeHidden(runDir, result);
    return result;
  }));
  const leaks = materialized.filter((m) => !m.leak.ok);
  if (leaks.length && !opts.allowLeaks) {
    throw new Error(`Leak audit failed:\n${leaks.map((m) => `${m.scenario.id}: ${m.leak.findings.map((f) => `${f.kind}: ${f.detail}`).join('; ')}`).join('\n')}`);
  }
  await mkdir(join(runDir, 'grades'), { recursive: true });
  const jobs = materialized.flatMap((m) => Array.from({ length: opts.repeat }, (_, i) => ({ materialized: m, repeat: i + 1 })));
  const controller = new AbortController();
  let finished = 0;
  const results = await Promise.all(jobs.map((job) => limit(async () => {
    const started = Date.now();
    const scenario = job.materialized.scenario;
    const outDir = join(runDir, 'agent', scenarioSlug(scenario.id), `r${job.repeat}`);
    let agent: AgentRunOutput;
    try {
      agent = await opts.adapter.run({ scenario, materialized: job.materialized, suite: opts.suite, outDir, signal: controller.signal, timeoutMs: opts.timeoutMs, repeat: job.repeat });
    } catch (error) { agent = failedAgent(error); }
    const result = await gradeSafely({ runId, scenario, materialized: job.materialized, suite: opts.suite, agentName: opts.adapter.name,
      repeat: job.repeat, agent, judge: opts.judge, artifactsDir: relative(runDir, outDir) });
    await writeJson(join(runDir, 'grades', `${scenarioSlug(scenario.id)}.r${job.repeat}.json`), result);
    const outcome = agent.events?.findLast((event) => event.type === 'run.completed');
    const label = result.agentError ? 'error' : outcome?.type === 'run.completed' ? outcome.outcome : 'incomplete';
    opts.onProgress?.(`[${++finished}/${jobs.length}] ${scenario.id} r${job.repeat} → ${label} · outcome ${result.scores.outcome.toFixed(2)} · judgement ${result.scores.judgement.toFixed(2)} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return result;
  })));
  await writeResults(runDir, results);
  const previous = await resolvePreviousRun(opts.outRoot, opts.compare, runId);
  const { summary, comparison } = await writeRunReport(runDir, { suite: opts.suite, previousRunDir: previous });
  await writeFile(join(opts.outRoot, 'latest'), runId + '\n');
  return { runDir, summary, comparison };
}

async function restoreMaterialized(runDir: string, scenario: ConcreteScenario, suite: EvalSuite): Promise<MaterializedScenario> {
  const slug = scenarioSlug(scenario.id);
  const root = join(runDir, 'scenarios', slug);
  const trackDir = join(root, suite.trackFolder);
  const folders = (await readdir(trackDir, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^\d{3}$/.test(entry.name));
  if (folders.length !== 1) throw new Error(`Expected one stored case folder for ${scenario.id}; found ${folders.length}`);
  const folder = folders[0]!.name;
  const raw = await readRawCase(trackDir, folder);
  const stored = await readJson(join(runDir, 'hidden', `${slug}.json`));
  const hidden = HiddenContinuation.parse(stored);
  const leak = LeakAudit.parse((stored as { leak: unknown }).leak);
  const spec = remapSpec(scenario.spec, hidden.renumbering);
  spec.cutAfter = raw.history.events.at(-1)?.number ?? '000';
  const visibleText = renderIndexMd(raw) + '\n\n' + renderHistoryMd(raw)
    + raw.attachments.map(({ fileName, text }) => `\n\n[attachment ${fileName}]\n${text ?? '[no text]'}`).join('');
  return { scenario, spec, root, caseDir: join(trackDir, folder), folder,
    visibleEvents: raw.history.events.map((event) => event.number), visibleAttachments: raw.attachments.map((a) => a.fileName), visibleText, hidden, leak };
}

/** Regrade stored outputs against the current suite, warning when visible case material has changed. */
export async function regradeRun(runDir: string, opts: RegradeOptions): Promise<EvalRunResult> {
  runDir = resolve(runDir);
  const config = RunConfig.parse(await readJson(join(runDir, 'run.json')));
  const prior = await Promise.all((await readdir(join(runDir, 'grades'))).filter((name) => name.endsWith('.json')).sort()
    .map(async (name) => ScenarioResult.parse(await readJson(join(runDir, 'grades', name)))));
  const current = new Map(expandScenarios(opts.suite).map((scenario) => [scenario.id, scenario]));
  const restored = new Map<string, MaterializedScenario>();
  const temp = await mkdtemp(join(tmpdir(), 'casework-regrade-'));
  const results: ScenarioResult[] = [];
  try {
    for (const old of prior) {
      const scenario = current.get(old.scenarioId);
      if (!scenario) { opts.onProgress?.(`Skipping ${old.scenarioId}: missing from the current suite`); continue; }
      let materialized = restored.get(scenario.id);
      if (!materialized) {
        materialized = await restoreMaterialized(runDir, scenario, opts.suite);
        const fresh = await materializeScenario({ scenario, suite: opts.suite, dataDir: config.dataDir, outDir: join(temp, scenarioSlug(scenario.id)), folderOverride: materialized.folder });
        if (fresh.visibleText !== materialized.visibleText) opts.onProgress?.(`Warning: visible text changed for ${scenario.id}`);
        restored.set(scenario.id, materialized);
      }
      const outDir = join(runDir, 'agent', scenarioSlug(scenario.id), `r${old.repeat}`);
      let agent: AgentRunOutput;
      try { agent = await readAgentOutput(outDir, { persisted: true }); } catch (error) { agent = failedAgent(error); }
      const result = await gradeSafely({ runId: config.runId, scenario, materialized, suite: opts.suite,
        agentName: config.agent, repeat: old.repeat, agent, judge: opts.judge, artifactsDir: relative(runDir, outDir) });
      await writeJson(join(runDir, 'grades', `${scenarioSlug(scenario.id)}.r${old.repeat}.json`), result);
      results.push(result);
      opts.onProgress?.(`Regraded ${scenario.id} r${old.repeat}`);
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
  await writeJson(join(runDir, 'run.json'), { ...config, rubricVersion: rubricVersion(opts.suite),
    judge: { enabled: opts.judge.enabled, samples: opts.judge.samples, effort: opts.judge.effort },
    models: { ...config.models, judge: opts.judge.enabled ? opts.judge.model : null } });
  await writeResults(runDir, results);
  const previous = await resolvePreviousRun(dirname(runDir), opts.compare, config.runId);
  const { summary, comparison } = await writeRunReport(runDir, { suite: opts.suite, previousRunDir: previous });
  return { runDir, summary, comparison };
}

/** Run and time a challenge-shaped release, then lint, grade and report its answer folders. */
export async function rehearse(opts: RehearseOptions): Promise<RehearseResult> {
  const suiteName = opts.suiteName ?? 'holdout';
  const scenarios = selected({ ...opts, suiteName });
  const runId = makeRunId(new Date(), suiteName, 'reality');
  const dir = resolve(opts.outRoot, '..', 'rehearsals', runId);
  await writeJson(join(dir, 'run.json'), configFor(runId, scenarios, { ...opts, suiteName, repeat: 1, timeoutMs: 60000 }, 'reality'));
  const materialized: MaterializedScenario[] = [];
  const manifest: Record<string, string> = {};
  for (const [i, scenario] of scenarios.entries()) {
    const folder = String(i + 1).padStart(3, '0');
    const m = await materializeScenario({ scenario, suite: opts.suite, dataDir: opts.dataDir, outDir: join(dir, 'cases'), folderOverride: folder });
    materialized.push(m);
    manifest[String(i + 1)] = scenario.id;
    await storeHidden(dir, m);
  }
  await writeJson(join(dir, 'manifest.json'), manifest);
  const values: Record<string, string> = { track: opts.track, in: join(dir, 'cases'), out: join(dir, 'ANSWERS'), concurrency: String(opts.concurrency) };
  const command = (opts.command ?? 'corepack pnpm reality --track {track} --in {in} --out {out} --concurrency {concurrency}')
    .replace(/\{(track|in|out|concurrency)\}/g, (_, key: string) => shellQuote(values[key]!));
  const started = Date.now();
  const execution = await runShell(command, { cwd: repoRoot(), env: { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' }, logPath: join(dir, 'reality.log') });
  const ms = Date.now() - started;
  if (execution.error) opts.onProgress?.(`Reality command: ${execution.error}`);
  await writeJson(join(dir, 'timing.json'), { ms, cases: scenarios.length, concurrency: opts.concurrency });
  const lint = await lintAnswersDir(join(dir, 'ANSWERS'));
  const results: ScenarioResult[] = [];
  for (const [i, m] of materialized.entries()) {
    const outDir = join(dir, 'ANSWERS', String(i + 1));
    let agent: AgentRunOutput;
    try { agent = await readAgentOutput(outDir, { ms: scenarios.length ? ms / scenarios.length : 0, ledger: false }); } catch (error) { agent = failedAgent(error); }
    const result = await gradeSafely({ runId, scenario: m.scenario, materialized: m, suite: opts.suite,
      agentName: 'reality', repeat: 1, agent, judge: opts.judge, artifactsDir: relative(dir, outDir) });
    await writeJson(join(dir, 'grades', `${scenarioSlug(m.scenario.id)}.r1.json`), result);
    results.push(result);
    opts.onProgress?.(`Rehearsed ${i + 1}: ${m.scenario.id} → outcome ${result.scores.outcome.toFixed(2)}`);
  }
  await writeResults(dir, results);
  const { summary } = await writeRunReport(dir, { suite: opts.suite });
  return { dir, ms, lint, summary };
}
