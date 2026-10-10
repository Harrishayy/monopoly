/** Harness adapter for agent B: runs its pipeline on the materialized case and grades its own ANSWER.md. */
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { RunEvent, type Outcome } from '@casework/core';
import {
  ExampleBank, defaultCaller, domainActionOf, getAgents, renderAnswer, renderReasoning, runCase, traceLines,
  type CaseResult,
} from '@casework/agents';
import type { AgentAdapter, AgentRunOutput, TokenUsage } from '@casework/evals';

const GENERIC_TOOL: Record<string, string> = { escalate_to_human: 'case.escalate', wait: 'case.wait', close_case: 'case.close' };

function outcomeOf(action: CaseResult['final']['action']): Outcome {
  if (action === 'escalate_to_human') return 'escalated';
  if (action === 'request_information' || action === 'chase') return 'needs_info';
  if (action === 'wait') return 'declined';
  return 'resolved';
}

/**
 * B cites "E012", "A1" or an index section ("S:initial-request"); the harness expects
 * "<case>:event-012", "<case>:<file name>" or "<case>:case".
 */
function citationIds(r: CaseResult): string[] {
  const files = new Map(r.caseFile.attachments.map((a) => [a.id, basename(a.name)]));
  return r.final.citations.map((id) => {
    const event = /^E(\d{3})$/.exec(id);
    if (event) return `case:event-${event[1]}`;
    if (id.startsWith('S:')) return 'case:case';
    const file = files.get(id);
    return file ? `case:${file}` : id;
  });
}

function usageOf(r: CaseResult): TokenUsage {
  const sum = (key: 'inputTokens' | 'outputTokens' | 'cacheReadTokens') => r.calls.reduce((n, c) => n + (c[key] ?? 0), 0);
  return { inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens'), cacheReadTokens: sum('cacheReadTokens'), cacheWriteTokens: 0 };
}

/** Express B's single decision as the shared event stream so trace checks and decision scoring apply. */
export function eventsFromResult(r: CaseResult, toolNames: Set<string>): RunEvent[] {
  const runId = `agent-b-${r.caseFile.name}`;
  const at = new Date(Date.parse(r.startedAt) + r.ms).toISOString();
  const f = r.final;
  const domain = domainActionOf(r);
  const tool = toolNames.has(domain) ? domain : GENERIC_TOOL[f.action];
  const drafts: Record<string, unknown>[] = [
    { type: 'run.started', caseRef: r.caseFile.name, autonomy: 'suggest' },
    { type: 'decision.made', label: f.actionLabel || domain, rationale: f.rationale, confidence: f.confidence, citations: citationIds(r) },
  ];
  const calls = [
    ...(tool ? [{ tool, args: { recipient: f.recipient, channel: f.channel, message: f.message, reason: f.rationale } }] : []),
    ...(f.alsoSend ?? []).flatMap((m) => m.domainAction && toolNames.has(m.domainAction)
      ? [{ tool: m.domainAction, args: { recipient: m.recipient, channel: m.channel, message: m.message } }] : []),
  ];
  calls.forEach(({ tool: name, args }, i) => drafts.push(
    { type: 'tool.called', callId: `call-${i + 1}`, tool: name, args },
    { type: 'tool.succeeded', callId: `call-${i + 1}`, result: { recorded: true }, ms: 0 },
  ));
  drafts.push({ type: 'run.completed', outcome: outcomeOf(f.action), summary: f.actionLabel || domain, usage: usageOf(r) });
  return drafts.map((d, seq) => RunEvent.parse({ runId, seq, at, ...d }));
}

export async function createAgentBAdapter(opts: { track: string; toolNames: string[]; log?: (line: string) => void }): Promise<AgentAdapter> {
  getAgents(['b']);
  const bank = await ExampleBank.build('all');
  opts.log?.(`agent B few-shot memory: ${bank.size} labelled moments (the case under test is always excluded)`);
  const caller = defaultCaller();
  const tools = new Set(opts.toolNames);
  return {
    name: 'agent-b', kind: 'command',
    async run(input): Promise<AgentRunOutput> {
      const started = Date.now();
      const out = input.outDir;
      await mkdir(out, { recursive: true });
      const r = await runCase(input.materialized.caseDir, {
        caller, track: opts.track, withhold: 'none', timeoutMs: input.timeoutMs,
        examples: (c) => bank.render(c),
      });
      const events = eventsFromResult(r, tools);
      const answerPath = join(out, 'ANSWER.md');
      const reasoningPath = join(out, 'REASONING.md');
      const tracePath = join(out, 'trace.jsonl');
      await Promise.all([
        writeFile(answerPath, renderAnswer(r)),
        writeFile(reasoningPath, renderReasoning(r)),
        writeFile(tracePath, events.map((e) => JSON.stringify(e)).join('\n') + '\n'),
        writeFile(join(out, 'agent-trace.jsonl'), traceLines(r)),
        writeFile(join(out, 'ledger.jsonl'), '\n'),
      ]);
      const error = r.final.decidedBy === 'fallback' ? `fallback answer: ${r.failures.join('; ')}` : null;
      return { ok: !error, error, events, ledger: [], ms: Date.now() - started, usage: usageOf(r), answerPath, reasoningPath, tracePath };
    },
  };
}
