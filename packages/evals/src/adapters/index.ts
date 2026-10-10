import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TrackPack, Autonomy, RunEvent } from '@casework/core';
import { executeCase } from '@casework/core/agent';
import type { RunCaseFn, AgentAdapter, AgentRunInput, AgentRunOutput, BaselineKind, LedgerEntry } from '../schema';
import { repoRoot } from '../paths';
import { wrapTools } from '../sandbox';
import { baselineRunCase } from './baselines';
import { errorMessage, existingFile, readAgentOutput, runShell, shellQuote, usageFromEvents } from './io';

/** Write answer, reasoning, trace and ledger artifacts, returning the three answer paths. */
export async function writeRunArtifacts(outDir: string, result: { answer: string; reasoning: string; events: RunEvent[]; ledger: LedgerEntry[] }): Promise<{ answerPath: string; reasoningPath: string; tracePath: string }> {
  await mkdir(outDir, { recursive: true });
  const answerPath = join(outDir, 'ANSWER.md');
  const reasoningPath = join(outDir, 'REASONING.md');
  const tracePath = join(outDir, 'trace.jsonl');
  await Promise.all([
    writeFile(answerPath, result.answer), writeFile(reasoningPath, result.reasoning),
    writeFile(tracePath, result.events.map((event) => JSON.stringify(event)).join('\n') + '\n'),
    writeFile(join(outDir, 'ledger.jsonl'), result.ledger.map((entry) => JSON.stringify(entry)).join('\n') + '\n'),
  ]);
  return { answerPath, reasoningPath, tracePath };
}

function emptyOutput(): AgentRunOutput {
  return { ok: false, error: null, events: null, ledger: [], ms: 0, usage: null, answerPath: null, reasoningPath: null, tracePath: null };
}

async function finish(outDir: string, output: AgentRunOutput, started: number): Promise<AgentRunOutput> {
  output.ms = Date.now() - started;
  try {
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'run.json'), JSON.stringify({ ok: output.ok, error: output.error, ms: output.ms, usage: output.usage }, null, 2) + '\n');
  } catch (error) {
    output.ok = false;
    output.error = [output.error, errorMessage(error)].filter(Boolean).join('; ');
  }
  [output.answerPath, output.reasoningPath, output.tracePath] = await Promise.all([
    existingFile(join(outDir, 'ANSWER.md')), existingFile(join(outDir, 'REASONING.md')), existingFile(join(outDir, 'trace.jsonl')),
  ]);
  return output;
}

async function executeInproc(input: AgentRunInput, opts: { pack: TrackPack; autonomy?: Autonomy; runCaseImpl?: RunCaseFn }): Promise<AgentRunOutput> {
  const started = Date.now();
  const output = emptyOutput();
  const controller = new AbortController();
  const abort = () => controller.abort(input.signal.reason ?? new Error('Aborted'));
  input.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error(`Timed out after ${input.timeoutMs}ms`)), input.timeoutMs);
  if (input.signal.aborted) abort();
  let rejectAbort: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
      if (controller.signal.aborted) rejectAbort();
    });
    const work = async () => {
      if (controller.signal.aborted) throw controller.signal.reason;
      const cases = await opts.pack.loadCases(input.materialized.root, { withhold: 'none' });
      if (controller.signal.aborted) throw controller.signal.reason;
      if (cases.length !== 1) throw new Error(`Expected exactly one case in the materialized root; found ${cases.length}`);
      const wrapped = { ...opts.pack, tools: wrapTools(opts.pack.tools, {
        actionMap: input.suite.actionMap, faults: input.materialized.spec.faults, ledger: output.ledger,
      }) };
      return executeCase(cases[0]!, wrapped, {
        n: Number(input.materialized.folder), autonomy: opts.autonomy ?? opts.pack.autonomy,
        signal: controller.signal, runCaseImpl: opts.runCaseImpl,
      });
    };
    const result = await Promise.race([work(), cancelled]);
    output.events = result.events;
    output.error = result.error ?? null;
    output.ok = !result.error && result.events.some((event) => event.type === 'run.completed');
    output.usage = usageFromEvents(result.events);
    await writeRunArtifacts(input.outDir, { ...result, ledger: output.ledger });
  } catch (error) {
    output.ok = false;
    output.error = errorMessage(error);
    try {
      await writeRunArtifacts(input.outDir, {
        answer: `**Runner error**\n${output.error}\n`, reasoning: '', events: output.events ?? [], ledger: output.ledger,
      });
    } catch (writeError) { output.error += `; ${errorMessage(writeError)}`; }
  } finally {
    clearTimeout(timer);
    input.signal.removeEventListener('abort', abort);
    if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
  }
  return finish(input.outDir, output, started);
}

/** Create an adapter that runs only the materialized case through the shared executor. */
export function createInprocAdapter(opts: { pack: TrackPack; autonomy?: Autonomy; runCaseImpl?: RunCaseFn; name?: string }): AgentAdapter {
  return { name: opts.name ?? 'runCase', kind: 'inproc', run: (input) => executeInproc(input, opts) };
}

/** Create an external command adapter with quoted placeholders, cancellation and saved outputs. */
export function createCommandAdapter(opts: { command: string; name?: string; cwd?: string }): AgentAdapter {
  return {
    name: opts.name ?? `cmd:${opts.command}`, kind: 'command',
    async run(input) {
      const started = Date.now();
      let output = emptyOutput();
      try {
        const values: Record<string, string> = { root: input.materialized.root, case: input.materialized.caseDir, out: input.outDir, track: input.suite.track };
        const command = opts.command.replace(/\{(root|case|out|track)\}/g, (_, key: string) => shellQuote(values[key]!));
        const result = await runShell(command, {
          cwd: opts.cwd ?? repoRoot(), logPath: join(input.outDir, 'agent.log'), signal: input.signal, timeoutMs: input.timeoutMs,
          env: { ...process.env, CASEWORK_CASE_ROOT: input.materialized.root, CASEWORK_CASE_DIR: input.materialized.caseDir, CASEWORK_OUT_DIR: input.outDir },
        });
        output = await readAgentOutput(input.outDir, { exitOk: result.code === 0 && !result.error, error: result.error, ledger: false });
        await writeFile(join(input.outDir, 'ledger.jsonl'), '\n');
      } catch (error) { output.error = errorMessage(error); output.ok = false; }
      return finish(input.outDir, output, started);
    },
  };
}

/** Create a baseline whose event stream uses the same executor and renderer as a real run. */
export function createBaselineAdapter(kind: BaselineKind, opts: { pack: TrackPack }): AgentAdapter {
  return {
    name: `baseline:${kind}`, kind: 'baseline',
    async run(input) {
      // Construct inside the protected run so invalid runtime inputs become saved failures.
      return executeInproc(input, { pack: opts.pack, runCaseImpl: (c, pack, runOpts) => baselineRunCase(kind, input)(c, pack, runOpts) });
    },
  };
}
