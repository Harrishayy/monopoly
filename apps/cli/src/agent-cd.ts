/**
 * Harness adapters for agents C and D: each runs its own pipeline on the materialized case and writes its own ANSWER.md.
 * A fallback answer is graded like any other; only an exception counts as a runner error. The route is kept in agent-cost.json.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { RunEvent, type Outcome } from '@casework/core';
import {
  ExampleBank, cModels, decideCase, defaultCaller, getAgents, loadForD, renderAnswerC, renderAnswerD,
  renderReasoningC, renderReasoningD, runCaseC, traceLinesC, traceLinesD, type DResult,
} from '@casework/agents';
import { estimateCostUsd, type AgentAdapter, type AgentRunOutput, type TokenUsage } from '@casework/evals';
import { eventsFromResult } from './agent-b';

/** Same mapping as agent B's adapter: escalate, ask or chase, wait, otherwise act. */
function outcomeOfAction(action: string): Outcome {
  if (action === 'case.escalate') return 'escalated';
  if (action.endsWith('.ask') || action.endsWith('.chase')) return 'needs_info';
  if (action === 'case.wait') return 'declined';
  return 'resolved';
}

const tokens = (u: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }): TokenUsage =>
  ({ inputTokens: u.inputTokens, outputTokens: u.outputTokens, cacheReadTokens: u.cacheReadTokens ?? 0, cacheWriteTokens: u.cacheWriteTokens ?? 0 });

async function writeOutputs(out: string, files: { answer: string; reasoning: string; events: RunEvent[]; agentTrace: string; cost: unknown }) {
  await mkdir(out, { recursive: true });
  const answerPath = join(out, 'ANSWER.md');
  const reasoningPath = join(out, 'REASONING.md');
  const tracePath = join(out, 'trace.jsonl');
  await Promise.all([
    writeFile(answerPath, files.answer),
    writeFile(reasoningPath, files.reasoning),
    writeFile(tracePath, files.events.map((e) => JSON.stringify(e)).join('\n') + '\n'),
    writeFile(join(out, 'agent-trace.jsonl'), files.agentTrace),
    writeFile(join(out, 'agent-cost.json'), JSON.stringify(files.cost, null, 2) + '\n'),
    writeFile(join(out, 'ledger.jsonl'), '\n'),
  ]);
  return { answerPath, reasoningPath, tracePath };
}

export async function createAgentCAdapter(opts: { track: string; toolNames: string[]; log?: (line: string) => void }): Promise<AgentAdapter> {
  getAgents(['c']);
  const bank = await ExampleBank.build('all');
  const models = cModels();
  opts.log?.(`agent C models: read ${models.read}, decide ${models.decide}, review ${models.critic}; few-shot memory: ${bank.size} labelled moments (the case under test is always excluded)`);
  const caller = defaultCaller();
  const tools = new Set(opts.toolNames);
  return {
    name: 'agent-c', kind: 'command',
    async run(input): Promise<AgentRunOutput> {
      const started = Date.now();
      const r = await runCaseC(input.materialized.caseDir, {
        caller, track: opts.track, withhold: 'none', timeoutMs: input.timeoutMs,
        examples: (c) => bank.render(c), models,
      });
      const events = eventsFromResult(r, tools).map((e) => ({ ...e, runId: e.runId.replace('agent-b', 'agent-c') }));
      const usage = tokens(r.calls.reduce((s, c) => ({
        inputTokens: s.inputTokens + (c.inputTokens ?? 0), outputTokens: s.outputTokens + (c.outputTokens ?? 0),
        cacheReadTokens: s.cacheReadTokens + (c.cacheReadTokens ?? 0),
      }), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 }));
      const costUsd = r.calls.reduce((s, c) => s + (estimateCostUsd(c.model, tokens({ inputTokens: c.inputTokens ?? 0, outputTokens: c.outputTokens ?? 0, cacheReadTokens: c.cacheReadTokens ?? 0 })) ?? 0), 0);
      const paths = await writeOutputs(input.outDir, {
        answer: renderAnswerC(r), reasoning: renderReasoningC(r), events, agentTrace: traceLinesC(r),
        cost: { costUsd, calls: r.calls.length, route: r.final.decidedBy, disputed: r.disputed.length },
      });
      return { ok: true, error: null, events, ledger: [], ms: Date.now() - started, usage, ...paths };
    },
  };
}

/** D cites "PM-004:event-012" and "PM-004:attachment-1"; the harness expects attachment file names. */
function citationIdsD(r: DResult, files: Map<string, string>): string[] {
  return r.final.citations.map((id) => {
    const suffix = id.slice(id.lastIndexOf(':') + 1);
    if (/^event-\d{3}$/.test(suffix)) return `case:${suffix}`;
    if (suffix === 'case') return 'case:case';
    const file = files.get(id);
    return file ? `case:${file}` : id;
  });
}

function eventsFromD(r: DResult, files: Map<string, string>, toolNames: Set<string>): RunEvent[] {
  const runId = `agent-d-${r.caseRef}`;
  const at = new Date().toISOString();
  const f = r.final;
  const confidence = r.votes.length ? r.votes.filter((v) => v.action === f.action).length / r.votes.length : 0.5;
  const drafts: Record<string, unknown>[] = [
    { type: 'run.started', caseRef: r.caseRef, autonomy: 'suggest' },
    { type: 'decision.made', label: f.action, rationale: f.explanation, confidence, citations: citationIdsD(r, files) },
  ];
  const calls = [
    ...(toolNames.has(f.action) ? [{ tool: f.action, args: { channel: f.channel, message: f.message, reason: f.explanation } }] : []),
    ...(r.companion && toolNames.has(r.companion.action) ? [{ tool: r.companion.action, args: { message: r.companion.message } }] : []),
  ];
  calls.forEach(({ tool, args }, i) => drafts.push(
    { type: 'tool.called', callId: `call-${i + 1}`, tool, args },
    { type: 'tool.succeeded', callId: `call-${i + 1}`, result: { recorded: true }, ms: 0 },
  ));
  drafts.push({ type: 'run.completed', outcome: outcomeOfAction(f.action), summary: f.action, usage: tokens(r.usage) });
  return drafts.map((d, seq) => RunEvent.parse({ runId, seq, at, ...d }));
}

export async function createAgentDAdapter(opts: { track: string; toolNames: string[]; log?: (line: string) => void }): Promise<AgentAdapter> {
  getAgents(['d']);
  opts.log?.(`agent D voters: ${process.env.AGENT_D_MODEL}; supervisor: ${process.env.AGENT_D_SUPERVISOR_MODEL ?? 'default'}`);
  const tools = new Set(opts.toolNames);
  return {
    name: 'agent-d', kind: 'command',
    async run(input): Promise<AgentRunOutput> {
      const started = Date.now();
      const { c, pack, note } = await loadForD({ dir: input.materialized.caseDir, track: opts.track, withhold: 'none' });
      const r = await decideCase(c, pack, undefined);
      if (note) r.failures.unshift(`loader: ${note}`);
      const files = new Map(c.sources.flatMap((s) => {
        const file = (s.meta as { file?: string } | undefined)?.file;
        return s.kind === 'doc' && file ? [[s.id, basename(file)] as const] : [];
      }));
      const events = eventsFromD(r, files, tools);
      const n = Number(input.materialized.folder) || 1;
      const paths = await writeOutputs(input.outDir, {
        answer: renderAnswerD(r, c, pack, n), reasoning: renderReasoningD(r, c, n), events, agentTrace: traceLinesD(r),
        cost: { costUsd: r.usage.costUsd, calls: r.calls.length, route: r.route },
      });
      return { ok: true, error: null, events, ledger: [], ms: Date.now() - started, usage: tokens(r.usage), ...paths };
    },
  };
}
