import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { RunEvent } from '@casework/core';
import type { RunCaseFn } from '../schema';
import { ANSWER_SECTIONS } from '../checks';
import { createBaselineAdapter, createCommandAdapter, createInprocAdapter, writeRunArtifacts } from './index';
import { readAgentOutput, shellQuote } from './io';
import { fakeInput, fakePack } from './test-fixtures';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'casework-adapters-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
const usage = { inputTokens: 11, outputTokens: 7, cacheReadTokens: 3, cacheWriteTokens: 2 };
const complete: RunCaseFn = async (c, _pack, opts) => {
  opts.emit({ type: 'run.started', caseRef: c.ref, autonomy: opts.autonomy });
  opts.emit({ type: 'step.read', sourceIds: c.sources.map((s) => s.id), summary: 'Read the case' });
  opts.emit({ type: 'decision.made', label: 'Ask for scope', rationale: 'Scope needs confirmation.', confidence: 0.8, citations: [c.sources[0]!.id] });
  opts.emit({ type: 'run.completed', outcome: 'needs_info', summary: 'Asked for scope.', usage });
  return 'needs_info';
};
const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const nodeCommand = (script: string) => `${shellQuote(process.execPath)} -e ${shellQuote(script)}`;

describe('in-process adapter', () => {
  it('uses the shared executor and visible root, writes artifacts and maps usage', async () => {
    const pack = fakePack();
    const load = vi.spyOn(pack, 'loadCases');
    const input = await fakeInput(dir);
    const run = vi.fn(complete);
    const adapter = createInprocAdapter({ pack, runCaseImpl: run });
    const output = await adapter.run(input);
    expect(adapter.kind).toBe('inproc');
    expect(output.ok).toBe(true);
    expect(output.error).toBeNull();
    expect(output.usage).toEqual(usage);
    expect(load).toHaveBeenCalledWith(input.materialized.root, { withhold: 'none' });
    expect(run.mock.calls[0]?.[1]).not.toHaveProperty('hidden');
    expect(run.mock.calls[0]?.[1]).not.toHaveProperty('outDir');
    const answer = await readFile(output.answerPath!, 'utf8');
    ANSWER_SECTIONS.forEach((section) => expect(answer).toContain(`**${section}**`));
    const trace = await readFile(output.tracePath!, 'utf8');
    expect(trace.endsWith('\n')).toBe(true);
    expect(trace.trim().split('\n').map((line) => RunEvent.parse(JSON.parse(line)))).toEqual(output.events);
    expect(await readJson(join(input.outDir, 'run.json'))).toMatchObject({ ok: true, error: null, usage });
    expect(await readFile(join(input.outDir, 'ledger.jsonl'), 'utf8')).toBe('\n');
    expect(await readAgentOutput(input.outDir, { persisted: true })).toMatchObject({ ok: true, events: output.events, usage });
  });

  it('wraps tools with faults and saves their ledger', async () => {
    const pack = fakePack();
    const execute = vi.fn(async () => ({ ok: true }));
    pack.tools = [{ name: 'desk.message', description: 'Send a message', effect: 'write', input: z.object({}), execute }];
    const input = await fakeInput(dir);
    input.materialized.spec = { ...input.materialized.spec, faults: [{ tool: '*', kind: 'bad_data', attempts: [1] }] };
    const output = await createInprocAdapter({ pack, runCaseImpl: async (c, wrapped, opts) => {
      await wrapped.tools[0]!.execute({}, { caseRef: c.ref, runId: opts.runId, signal: opts.signal!, idempotencyKey: 'one' });
      return complete(c, wrapped, opts);
    } }).run(input);
    expect(output.ok).toBe(true);
    expect(execute).not.toHaveBeenCalled();
    expect(output.ledger[0]).toMatchObject({ outcome: 'bad_data', attempt: 1, kind: 'message', idempotencyKey: 'one' });
    expect(JSON.parse((await readFile(join(input.outDir, 'ledger.jsonl'), 'utf8')).trim())).toEqual(output.ledger[0]);
  });

  it('turns thrown run errors into rendered runner-error artifacts', async () => {
    const input = await fakeInput(dir);
    const output = await createInprocAdapter({ pack: fakePack(), runCaseImpl: async () => { throw new Error('Broken agent'); } }).run(input);
    expect(output).toMatchObject({ ok: false, error: 'Broken agent', events: [] });
    const answer = await readFile(output.answerPath!, 'utf8');
    expect(answer).toContain('**Runner error**');
    expect(answer).toContain('**Final result**');
  });

  it('rejects zero or multiple cases while still writing ANSWER.md', async () => {
    const input = await fakeInput(dir);
    const pack = fakePack();
    const cases = await pack.loadCases(input.materialized.root);
    for (const loaded of [[], [cases[0]!, cases[0]!]]) {
      pack.loadCases = async () => loaded;
      const output = await createInprocAdapter({ pack, runCaseImpl: complete }).run(input);
      expect(output.ok).toBe(false);
      expect(output.error).toContain(`found ${loaded.length}`);
      expect(await readFile(output.answerPath!, 'utf8')).toContain('**Runner error**');
    }
  });

  it('times out an uncooperative run, returns no partial events and aborts its signal', async () => {
    const input = await fakeInput(dir);
    input.timeoutMs = 10;
    let signal: AbortSignal | undefined;
    const output = await createInprocAdapter({ pack: fakePack(), runCaseImpl: async (c, _pack, opts) => {
      signal = opts.signal;
      opts.emit({ type: 'run.started', caseRef: c.ref, autonomy: opts.autonomy });
      return new Promise(() => {});
    } }).run(input);
    expect(output).toMatchObject({ ok: false, error: 'Timed out after 10ms', events: null, usage: null });
    expect(signal?.aborted).toBe(true);
    expect(await readFile(output.answerPath!, 'utf8')).toContain('**Runner error**');
  });

  it('honours upstream cancellation and times out a hanging loader', async () => {
    const input = await fakeInput(dir);
    const controller = new AbortController();
    controller.abort(new Error('Caller cancelled'));
    input.signal = controller.signal;
    const pack = fakePack();
    const load = vi.spyOn(pack, 'loadCases');
    const output = await createInprocAdapter({ pack, runCaseImpl: complete }).run(input);
    expect(output.error).toBe('Caller cancelled');
    expect(load).not.toHaveBeenCalled();
    input.signal = new AbortController().signal;
    input.timeoutMs = 5;
    pack.loadCases = () => new Promise(() => {});
    expect((await createInprocAdapter({ pack }).run(input)).error).toBe('Timed out after 5ms');
  });

  it('captures filesystem failures instead of rejecting', async () => {
    const input = await fakeInput(dir);
    await writeFile(input.outDir, 'A file blocks the directory');
    const output = await createInprocAdapter({ pack: fakePack(), runCaseImpl: complete }).run(input);
    expect(output.ok).toBe(false);
    expect(output.error).toBeTruthy();
    expect(output.answerPath).toBeNull();
  });
});

describe('command adapter', () => {
  it('writes and reads answers, logs both streams and skips invalid trace lines', async () => {
    const input = await fakeInput(dir);
    const sample = RunEvent.parse({ type: 'run.completed', runId: 'external', seq: 0, at: new Date().toISOString(), outcome: 'needs_info', summary: 'Asked for scope', usage });
    const answer = ANSWER_SECTIONS.map((section) => `**${section}**\nNone`).join('\n\n');
    const script = `const fs = require('node:fs'); const p = require('node:path'); const out = process.argv[1]; fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(p.join(out,'ANSWER.md'),${JSON.stringify(answer)}); fs.writeFileSync(p.join(out,'REASONING.md'),'Reason'); fs.writeFileSync(p.join(out,'trace.jsonl'),${JSON.stringify(`${JSON.stringify(sample)}\ninvalid\n{}\n`)}); console.log(process.env.CASEWORK_CASE_ROOT); console.error('stderr captured');`;
    const output = await createCommandAdapter({ command: `${nodeCommand(script)} {out}`, cwd: dir }).run(input);
    expect(output.ok).toBe(true);
    expect(output.events).toEqual([sample]);
    expect(output.usage).toEqual(usage);
    expect(output.error).toContain('2 invalid trace line(s)');
    const log = await readFile(join(input.outDir, 'agent.log'), 'utf8');
    expect(log).toContain(input.materialized.root);
    expect(log).toContain('stderr captured');
    expect(await readJson(join(input.outDir, 'run.json'))).toMatchObject({ ok: true, usage });
    expect(await readFile(join(input.outDir, 'ledger.jsonl'), 'utf8')).toBe('\n');
    expect((await readAgentOutput(input.outDir, { persisted: true })).ledger).toEqual([]);
  });

  it('quotes placeholders with spaces, apostrophes and shell syntax', async () => {
    const input = await fakeInput(dir);
    input.materialized.root = "A folder ' with $(false)";
    const script = "const fs = require('node:fs'); fs.writeFileSync(process.env.CASEWORK_OUT_DIR + '/ANSWER.md', process.argv[1]);";
    const output = await createCommandAdapter({ command: `${nodeCommand(script)} {root}`, cwd: dir }).run(input);
    expect(output.ok).toBe(true);
    expect(await readFile(output.answerPath!, 'utf8')).toBe(input.materialized.root);
  });

  it('requires a zero exit code, an answer file and no runner error marker', async () => {
    const input = await fakeInput(dir);
    const failure = await createCommandAdapter({ command: nodeCommand('process.exit(7)'), cwd: dir }).run(input);
    expect(failure.ok).toBe(false);
    expect(failure.error).toContain('code 7');
    const missing = await createCommandAdapter({ command: nodeCommand(''), cwd: dir }).run(input);
    expect(missing).toMatchObject({ ok: false, events: null });
    expect(missing.error).toContain('Missing ANSWER.md');
    const runnerError = await createCommandAdapter({ command: nodeCommand("require('node:fs').writeFileSync(process.env.CASEWORK_OUT_DIR + '/ANSWER.md', '**Runner error**')"), cwd: dir }).run(input);
    expect(runnerError.ok).toBe(false);
  });

  it('terminates the spawned program on timeout', async () => {
    const input = await fakeInput(dir);
    input.timeoutMs = 100;
    const output = await createCommandAdapter({ command: nodeCommand('setInterval(() => {}, 1000)'), cwd: dir }).run(input);
    expect(output.ok).toBe(false);
    expect(output.error).toContain('Timed out after 100ms');
    expect(output.ms).toBeLessThan(3000);
  });

  it('escalates to SIGKILL for a program that ignores SIGTERM', async () => {
    const input = await fakeInput(dir);
    input.timeoutMs = 200;
    const output = await createCommandAdapter({ command: nodeCommand("process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)"), cwd: dir }).run(input);
    expect(output.error).toContain('Timed out after 200ms');
    expect(output.ms).toBeGreaterThanOrEqual(5000);
    expect(output.ms).toBeLessThan(7500);
  }, 10000);
});

describe('baselines', () => {
  it.each(['escalate', 'reckless', 'replay'] as const)('%s writes a schema-valid trace and rendered answer', async (kind) => {
    const input = await fakeInput(dir);
    const output = await createBaselineAdapter(kind, { pack: fakePack() }).run(input);
    expect(output.ok).toBe(true);
    output.events!.forEach((event) => RunEvent.parse(event));
    expect(output.events![0]?.type).toBe('run.started');
    const answer = await readFile(output.answerPath!, 'utf8');
    ANSWER_SECTIONS.forEach((section) => expect(answer).toContain(`**${section}**`));
    expect(await readJson(join(input.outDir, 'run.json'))).toMatchObject({ ok: true });
    if (kind === 'escalate') {
      const event = output.events!.find((event) => event.type === 'escalation.created');
      expect(event?.handover.facts[0]?.sourceId).toBe('FX-001:case');
    }
  });

  it('reckless maps nested spend arguments and emits the three actions in order', async () => {
    const input = await fakeInput(dir);
    input.suite.actionMap = [{ tool: 'desk.spend', kind: 'commit_spend', amountPath: 'proposal.amountPence', textPaths: [] }];
    const output = await createBaselineAdapter('reckless', { pack: fakePack() }).run(input);
    const calls = output.events!.filter((event) => event.type === 'tool.called');
    expect(calls.map((event) => event.tool)).toEqual(['desk.spend', 'baseline.assign_provider', 'baseline.close']);
    expect(calls[0]?.args).toEqual({ proposal: { amountPence: 500000 } });
  });

  it('replays only the leading sender run and detects closure in the full untruncated bodies', async () => {
    const input = await fakeInput(dir);
    const event = (from: string, body: string, number: string) => ({ number, at: '2026-01-01 00:00:00 UTC', fields: [{ key: 'From', value: from }], body });
    input.materialized.hidden.events = [event('OPERATIONS DESK', 'x'.repeat(2100) + ' completed', '006'), event('Operations desk', 'Second action', '007'), event('Customer', 'Inbound', '008'), event('Operations desk', 'Must not replay', '009')];
    const output = await createBaselineAdapter('replay', { pack: fakePack() }).run(input);
    const decision = output.events!.find((event) => event.type === 'decision.made');
    expect(decision?.rationale.length).toBe(2000);
    expect(decision?.rationale).not.toContain('Must not replay');
    expect(output.events!.at(-1)).toMatchObject({ outcome: 'resolved', summary: 'x'.repeat(300) });
    input.materialized.hidden.events = [event('Customer', 'Closed', '006'), event('Operations desk', 'Completed', '007')];
    const noAction = await createBaselineAdapter('replay', { pack: fakePack() }).run(input);
    expect(noAction.events!.find((event) => event.type === 'decision.made')?.rationale).toBe('No recorded action before the next inbound message.');
    expect(noAction.events!.at(-1)).toMatchObject({ outcome: 'needs_info' });
  });
});

it('writes trailing newlines for empty trace and ledger artifacts', async () => {
  const paths = await writeRunArtifacts(dir, { answer: 'Answer', reasoning: 'Reason', events: [], ledger: [] });
  expect(await readFile(paths.tracePath, 'utf8')).toBe('\n');
  expect(await readFile(join(dir, 'ledger.jsonl'), 'utf8')).toBe('\n');
});
