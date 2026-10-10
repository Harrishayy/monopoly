import 'server-only';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Autonomy, Case, Outcome } from '@casework/core';
import type { EmitInput } from '@casework/core/agent';
import { agentB, ExampleBank, type Agent } from '@casework/agents';
import { DATA_DIR, DATA_WITHHOLD } from './config';

/** Agent B reads case folders, not loaded cases: find the folder this case came from. */
async function caseDir(c: Case): Promise<string | undefined> {
  const num = c.ref.split('-').at(-1)!;
  const tracks = await readdir(DATA_DIR, { withFileTypes: true }).catch(() => []);
  for (const t of tracks) {
    if (!t.isDirectory()) continue;
    const dir = join(DATA_DIR, t.name, num);
    const index = join(dir, 'index.md');
    if (!existsSync(index)) continue;
    const head = (await readFile(index, 'utf8')).split('\n', 1)[0] ?? '';
    if (head.includes(c.title)) return dir;
  }
  return undefined;
}

/**
 * Agent B with its few-shot memory: labelled moments from every case, retrieved by similarity.
 * The bank skips the case being decided, so a decision point never sees its own label. Built once per server.
 */
const g = globalThis as unknown as { __caseworkAgentB?: Promise<Agent> };
const agent = () =>
  (g.__caseworkAgentB ??= ExampleBank.build('all')
    .then((bank) => agentB({ examples: (c) => bank.render(c) }))
    .catch(() => agentB()));

function outcomeOf(action: string): Outcome {
  if (/escalat|handover/.test(action)) return 'escalated';
  if (/request_information|\.ask$|ask_/.test(action)) return 'needs_info';
  return 'resolved';
}

/**
 * Runs agent B (packages/agents, fixed pipeline) on one case and reports it as the same run events
 * agent A emits, so the case workspace shows both the same way. B returns one decision, so the
 * stream is short: started, read, next step, completed.
 */
export async function runAgentB(c: Case, opts: { runId: string; track: string; autonomy: Autonomy; cutBefore?: number; asOf?: string; offline?: boolean }, emit: (e: EmitInput) => void) {
  emit({ type: 'run.started', caseRef: c.ref, autonomy: opts.autonomy });
  const dir = await caseDir(c);
  if (!dir) throw new Error(`Agent B needs the case folder for ${c.ref}; none found under ${DATA_DIR}.`);
  emit({ type: 'step.read', sourceIds: [], summary: `Agent B reads the case folder${opts.cutBefore ? `, up to event ${opts.cutBefore - 1}` : ''}, builds its fact ledger, and decides three times.` });
  const d = await (await agent()).decide({ dir, track: opts.track, cutBefore: opts.cutBefore, asOf: opts.asOf, withhold: DATA_WITHHOLD, offline: opts.offline });
  emit({
    type: 'next.proposed',
    next: {
      action: d.action,
      recipient: d.recipient || '—',
      channel: d.channel || '—',
      message: d.message,
      reason: d.decidedBy === 'model' ? d.reason : `${d.reason}\n\n(Agent B · decided by ${d.decidedBy})`,
      citations: [],
      confidence: Math.min(1, Math.max(0, d.confidence ?? 0.5)),
      boundaries: [],
      remainingWork: d.failures,
      decidedBy: d.decidedBy === 'model' || d.decidedBy === 'gate' ? 'model' : 'playbook',
    },
  });
  emit({ type: 'run.completed', outcome: outcomeOf(d.action), summary: d.reason.slice(0, 280), usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 } });
}
