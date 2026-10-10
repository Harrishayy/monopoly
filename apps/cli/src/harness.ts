/** Run, grade, report and rehearse evaluation suites from the repository root. */
import { realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';
import { getPack } from '@casework/tracks';
import { getEvalSuite } from '@casework/tracks/evals';
import {
  SuiteName, createBaselineAdapter, createCommandAdapter, createInprocAdapter,
  defaultDataDir, defaultOutRoot, expandScenarios, judgeOptionsFromEnv, lintAnswersDir,
  loadSuite, materializeScenario, regradeRun, rehearse, renderConsoleSummary, repoRoot,
  resolvePreviousRun, runEval, scenarioSlug, selectScenarios, validateSuite, writeRunReport,
  type AgentAdapter, type AnswersLint, type JudgeEffort, type RunSummary,
} from '@casework/evals';

const usage = `Usage: pnpm harness [run|grade|report|scenarios|rehearse|lint|help] [flags]

Subcommands:
  run                    Run and grade selected scenarios (default).
  grade <runDir>         Regrade saved outputs using the current suite.
  report <runDir>        Rebuild the saved summary and Markdown report.
  scenarios             Materialize selections, audit leaks and validate the suite.
  rehearse              Time the Reality Test command, lint and grade its answers.
  lint [dir]            Read-only ANSWERS checks (default: ANSWERS).
  help, --help, -h       Show this usage text.

Selection and paths:
  --suite <name>         smoke|dev|holdout|robustness|escalation|all (default: smoke;
                        rehearse defaults to holdout).
  --scenarios <id,id>    Explicit scenario IDs; overrides --suite selection.
  --track <id>          Track pack (default: TRACK or property).
  --data <dir>          Case data (default: defaultDataDir()).
  --out <dir>           Run output (default: .casework/evals); scenarios default
                        to .casework/scenarios/<suite>.
                        All relative paths are resolved from the repository root.

Run options:
  --agent <name>        runCase|baseline:escalate|baseline:reckless|baseline:replay|cmd
                        (default: runCase).
  --cmd <command>       Required for cmd; supports {root} {case} {out} {track}.
  --repeat <n>          Runs per scenario (default: 1).
  --concurrency <n>     Parallel cases (default: REALITY_CONCURRENCY or 4).
  --timeout-ms <n>      Per-case timeout in milliseconds (default: 600000).
  --allow-leaks         Run despite leak findings; leaks still give exit code 1.
  --fail-on-critical    Exit 1 when the summary has critical failures.

Grading and comparison (run/grade; grading also applies to rehearse):
  --judge on|off        Enable the judge (default: on).
  --judge-model <id>    Override the judge model.
  --judge-samples <n>   Override judge sample count (positive integer).
  --judge-effort <name> low|medium|high|xhigh|max.
  --compare <value>     last|none|<runDir> (default: last; also used by report).
  --reality-cmd <cmd>   Rehearse command; supports {track} {in} {out} {concurrency}.

Exit codes: 0 success; 1 execution, leak or lint failure; 2 invalid usage.
`;

const options = {
  help: { type: 'boolean', short: 'h' },
  suite: { type: 'string' }, scenarios: { type: 'string' }, agent: { type: 'string' },
  cmd: { type: 'string' }, track: { type: 'string' }, data: { type: 'string' },
  out: { type: 'string' }, judge: { type: 'string' }, 'judge-model': { type: 'string' },
  'judge-samples': { type: 'string' }, 'judge-effort': { type: 'string' },
  repeat: { type: 'string' }, concurrency: { type: 'string' }, 'timeout-ms': { type: 'string' },
  compare: { type: 'string' }, 'allow-leaks': { type: 'boolean' },
  'fail-on-critical': { type: 'boolean' }, 'reality-cmd': { type: 'string' },
} as const satisfies ParseArgsOptionsConfig;

class UsageError extends Error {}

function integer(value: string, flag: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new UsageError(`${flag} must be a positive integer.`);
  }
  return Number(value);
}

function nonempty(value: string | undefined, flag: string): string | undefined {
  if (value !== undefined && !value.trim()) throw new UsageError(`${flag} must not be empty.`);
  return value;
}

// Never echo credentials from commands, exceptions or persisted result messages.
function safeText(value: string): string {
  let text = value;
  for (const [key, secret] of Object.entries(process.env)) {
    if (/key|token|secret|password|credential/i.test(key) && secret) text = text.replaceAll(secret, '[redacted]');
  }
  return text
    .replace(/\bsk-ant-[A-Za-z0-9_-]+|\bsk-[A-Za-z0-9]{20,}/g, '[redacted]')
    .replace(/\b([A-Z_]*(?:API_KEY|AUTH_TOKEN|PASSWORD|SECRET))\s*=\s*[^\s]+/gi, '$1=[redacted]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[redacted]');
}

const print = (text: string) => console.log(safeText(text));
const stderr = (text: string) => console.error(safeText(text));
const message = (error: unknown) => error instanceof Error ? error.message : 'Unexpected evaluation failure.';

async function existingPath(path: string): Promise<string> {
  try { return await realpath(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const parent = dirname(path);
    if (parent === path) return path;
    return resolve(await existingPath(parent), relative(parent, path));
  }
}

async function writableOutput(path: string, root: string): Promise<string> {
  const answers = await existingPath(join(root, 'ANSWERS'));
  const output = await existingPath(path);
  // Also reject ancestors: writing a challenge/run beneath them could touch ANSWERS.
  const contains = (a: string, b: string) => a === b || b.startsWith(a + sep);
  if (contains(answers, output) || contains(output, answers)) {
    throw new UsageError('Evaluation output must be outside ANSWERS and its parent directories. Use .casework/.');
  }
  return path;
}

function printLint(lint: AnswersLint, dir: string): void {
  for (const row of lint.rows) print(`#${row.n} · ${row.ok ? 'ok' : `FAIL · ${row.problems.join('; ')}`}`);
  print(`Lint: ${lint.rows.length} cases · ${lint.rows.filter((row) => row.ok).length} ok · ${lint.rows.filter((row) => !row.ok).length} failed`);
  if (!lint.rows.length) stderr(`No numeric case directories found in ${dir}. Expected <n>/ANSWER.md, REASONING.md and trace.jsonl.`);
}

function printSummary(summary: RunSummary, comparison: Parameters<typeof renderConsoleSummary>[1], runDir: string, failOnCritical: boolean): void {
  print(renderConsoleSummary(summary, comparison));
  print(resolve(runDir, 'report.md'));
  if (summary.counts.completed < summary.counts.results || summary.counts.leaks > 0
    || (failOnCritical && summary.counts.critical > 0)) process.exitCode = 1;
}

async function main(): Promise<void> {
  let parsed: ReturnType<typeof parseCli>;
  try { parsed = parseCli(); } catch {
    throw new UsageError('Invalid flags. Use `pnpm harness help` for supported flags and values.');
  }
  const { values, positionals } = parsed;
  if (values.help) { print(usage); return; }
  const command = positionals[0] ?? 'run';
  if (command === 'help') { print(usage); return; }
  if (!['run', 'grade', 'report', 'scenarios', 'rehearse', 'lint'].includes(command)) {
    throw new UsageError('Unknown subcommand. Expected run, grade, report, scenarios, rehearse, lint or help.');
  }
  const args = positionals.slice(1);
  if (command === 'grade' || command === 'report') {
    if (args.length !== 1 || !args[0]?.trim()) throw new UsageError(`${command} requires exactly one <runDir>.`);
  } else if (args.length > (command === 'lint' ? 1 : 0)) {
    throw new UsageError(`Unexpected positional arguments for ${command}.`);
  }
  const root = repoRoot();
  const suiteName = values.suite ?? (command === 'rehearse' ? 'holdout' : 'smoke');
  if (!SuiteName.safeParse(suiteName).success) throw new UsageError(`--suite must be ${SuiteName.options.join('|')}.`);
  const judgeFlag = values.judge ?? 'on';
  if (judgeFlag !== 'on' && judgeFlag !== 'off') throw new UsageError('--judge must be on|off.');
  const efforts: JudgeEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
  if (values['judge-effort'] !== undefined && !efforts.includes(values['judge-effort'] as JudgeEffort)) {
    throw new UsageError(`--judge-effort must be ${efforts.join('|')}.`);
  }
  const agentName = values.agent ?? 'runCase';
  if (!['runCase', 'baseline:escalate', 'baseline:reckless', 'baseline:replay', 'cmd'].includes(agentName)) {
    throw new UsageError('--agent must be runCase|baseline:escalate|baseline:reckless|baseline:replay|cmd.');
  }
  nonempty(values.cmd, '--cmd');
  if (agentName === 'cmd' && !values.cmd) throw new UsageError('--agent cmd requires --cmd <command>.');
  const concurrency = integer(values.concurrency ?? process.env.REALITY_CONCURRENCY ?? '4', '--concurrency');
  const repeat = integer(values.repeat ?? '1', '--repeat');
  const timeoutMs = integer(values['timeout-ms'] ?? '600000', '--timeout-ms');
  if (values['judge-samples'] !== undefined) integer(values['judge-samples'], '--judge-samples');
  for (const flag of ['track', 'data', 'out', 'compare', 'judge-model', 'reality-cmd'] as const) {
    nonempty(values[flag], `--${flag}`);
  }
  const scenarioIds = values.scenarios?.split(',').map((id) => id.trim());
  if (scenarioIds?.some((id) => !id)) throw new UsageError('--scenarios requires comma-separated, nonempty IDs.');
  if (command === 'lint') {
    const dir = resolve(root, nonempty(args[0], 'lint directory') ?? 'ANSWERS');
    const lint = await lintAnswersDir(dir);
    printLint(lint, dir);
    if (!lint.ok) process.exitCode = 1;
    return;
  }
  const track = nonempty(values.track ?? process.env.TRACK ?? 'property', '--track')!;
  let pack: ReturnType<typeof getPack>;
  try { pack = getPack(track); } catch { throw new UsageError('Unknown --track. Expected claims|property|banking|logistics.'); }
  const suite = loadSuite(getEvalSuite(track));
  const dataDir = resolve(root, nonempty(values.data, '--data') ?? defaultDataDir());
  const outRoot = resolve(root, nonempty(values.out, '--out') ?? defaultOutRoot());
  const compareValue = nonempty(values.compare, '--compare') ?? 'last';
  const compare = ['last', 'none'].includes(compareValue) ? compareValue : resolve(root, compareValue);
  let judge: ReturnType<typeof judgeOptionsFromEnv>;
  try {
    judge = judgeOptionsFromEnv(process.env, {
      enabled: judgeFlag === 'on',
      ...(values['judge-model'] === undefined ? {} : { model: nonempty(values['judge-model'], '--judge-model')! }),
      ...(values['judge-samples'] === undefined ? {} : { samples: integer(values['judge-samples'], '--judge-samples') }),
      ...(values['judge-effort'] === undefined ? {} : { effort: values['judge-effort'] as JudgeEffort }),
    });
  } catch (error) {
    if (error instanceof UsageError) throw error;
    throw new UsageError('Invalid judge settings. Check judge effort, samples and concurrency; counts must be positive integers.');
  }
  if (command === 'grade' || command === 'report') {
    const runDir = await writableOutput(resolve(root, args[0]!), root);
    const result = command === 'grade'
      ? await regradeRun(runDir, { suite, judge, compare, onProgress: print })
      : await writeRunReport(runDir, { suite, previousRunDir: await resolvePreviousRun(dirname(runDir), compare, relative(dirname(runDir), runDir)) });
    printSummary(result.summary, result.comparison, runDir, values['fail-on-critical'] ?? false);
    return;
  }
  let selected: ReturnType<typeof selectScenarios>;
  try { selected = selectScenarios(expandScenarios(suite), suite, { suite: suiteName as SuiteName, ids: scenarioIds }); } catch (error) {
    throw new UsageError(message(error));
  }
  if (command === 'scenarios') {
    const outDir = await writableOutput(resolve(root, nonempty(values.out, '--out') ?? `.casework/scenarios/${suiteName}`), root);
    const validation = await validateSuite(suite, dataDir);
    for (const error of validation.errors) stderr(`Suite error: ${error}`);
    for (const warning of validation.warnings) stderr(`Suite warning: ${warning}`);
    print(`Suite validation: ${validation.errors.length} errors · ${validation.warnings.length} warnings`);
    if (!validation.ok) process.exitCode = 1;
    print('id · visible events · visible attachments · leak');
    for (const scenario of selected) {
      const materialized = await materializeScenario({ scenario, suite, dataDir, outDir: join(outDir, scenarioSlug(scenario.id)) });
      print(`${scenario.id} · ${materialized.visibleEvents.length} · ${materialized.visibleAttachments.length} · ${materialized.leak.ok ? 'ok' : materialized.leak.findings.map((finding) => `${finding.kind}: ${finding.detail}`).join('; ')}`);
      if (!materialized.leak.ok) process.exitCode = 1;
    }
    print(`Scenarios: ${selected.length} · ${outDir}`);
  }
  if (!selected.length) {
    stderr(`No scenarios selected for ${scenarioIds ? '--scenarios' : `suite ${suiteName}`}. Choose another --suite or supply --scenarios id,id.`);
    process.exitCode = 1;
    return;
  }
  if (command === 'scenarios') return;
  await writableOutput(outRoot, root);
  if (command === 'rehearse') {
    await writableOutput(resolve(outRoot, '..', 'rehearsals'), root);
    const result = await rehearse({ suite, suiteName: scenarioIds ? 'custom' : suiteName as SuiteName,
      scenarioIds, dataDir, outRoot, track, concurrency, judge,
      command: nonempty(values['reality-cmd'], '--reality-cmd'), onProgress: print });
    print(`Rehearsal: ${selected.length} cases · ${(result.ms / 1000).toFixed(2)}s · concurrency ${concurrency}`);
    printLint(result.lint, join(result.dir, 'ANSWERS'));
    printSummary(result.summary, null, result.dir, values['fail-on-critical'] ?? false);
    if (!result.lint.ok) process.exitCode = 1;
    return;
  }
  const adapter = agentName === 'runCase' ? createInprocAdapter({ pack })
    : agentName === 'cmd' ? createCommandAdapter({ command: values.cmd!, name: 'cmd' })
      : createBaselineAdapter(agentName.slice('baseline:'.length) as 'escalate' | 'reckless' | 'replay', { pack });
  const errors = new Map<string, string>();
  const observed: AgentAdapter = { ...adapter, async run(input) {
    try {
      const result = await adapter.run(input);
      if (result.error) errors.set(`${input.scenario.id} r${input.repeat}`, result.error);
      return result;
    } catch (error) {
      errors.set(`${input.scenario.id} r${input.repeat}`, message(error));
      throw error;
    }
  } };
  const result = await runEval({ suite, suiteName: scenarioIds ? 'custom' : suiteName as SuiteName,
    scenarioIds, adapter: observed, dataDir, outRoot, concurrency, repeat, timeoutMs, judge, compare,
    allowLeaks: values['allow-leaks'], onProgress: (line) => {
      const key = line.match(/^\[\d+\/\d+\] (.+ r\d+) →/)?.[1];
      const error = key ? errors.get(key) : undefined;
      print(`${line}${error ? ` · Runner error: ${safeText(error).replace(/\s+/g, ' ').slice(0, 200)}` : ''}`);
    } });
  printSummary(result.summary, result.comparison, result.runDir, values['fail-on-critical'] ?? false);
}

function parseCli() {
  return parseArgs({ options, allowPositionals: true, strict: true });
}

main().catch((error: unknown) => {
  stderr(`harness: ${message(error)}`);
  if (error instanceof UsageError) stderr('Use `pnpm harness help` for usage.');
  process.exitCode = error instanceof UsageError ? 2 : 1;
});
