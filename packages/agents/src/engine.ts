import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Autonomy, Case, Outcome, Source, TrackPack } from '@casework/core';
import { runCase, type EmitInput } from '@casework/core/agent';
import type { Agent, AgentId } from './agent';
import { agentB } from './b';
import { getAgents } from './registry';

/**
 * The one way anything runs a case. The live product (calls, emails, portal) and the Reality Test
 * runner both call `getEngine(id).run(case, pack, ctx)` and receive the same RunEvent stream, so
 * the console, replay and ANSWERS/ are all views of identical work. What differs is only around it:
 * the product persists events and gates outbound messages; the runner renders ANSWER.md.
 */

export type EngineId = AgentId;

export interface EngineContext {
  runId: string;
  autonomy: Autonomy;
  emit: (e: EmitInput) => void;
  /** The decision moment (evaluation cuts). Defaults to now / the last event. */
  asOf?: string;
  /** Hide history events from this number on (evaluation cuts). */
  cutBefore?: number;
  /** The case folder when the case was loaded from one. Live cases have none. */
  dir?: string;
  signal?: AbortSignal;
  /** No model calls: rules / playbook only. */
  offline?: boolean;
}

export interface Engine {
  id: EngineId;
  label: string;
  run(c: Case, pack: TrackPack, ctx: EngineContext): Promise<void>;
  /**
   * Optional batch writer for ANSWERS/<n>/ when the engine has a richer native render than the
   * shared event view (agent B shows its ledger, withheld items and every model call). Same decisions.
   */
  answers?(dirs: string[], outDir: string, opts: AnswersOptions): Promise<{ name: string; action: string; decidedBy: string; failures: string[] }[]>;
}

export interface AnswersOptions {
  track: string;
  withhold: 'none' | 'outcomes';
  concurrency?: number;
  offline?: boolean;
  log?: (line: string) => void;
}

/** Agent A: deterministic assessment + guarded tool-use loop (packages/core). Streams rich events. */
const engineA: Engine = {
  id: 'a',
  label: 'Agent A · rules + guarded tool loop',
  async run(c, pack, ctx) {
    await runCase(c, pack, {
      runId: ctx.runId,
      autonomy: ctx.autonomy,
      emit: ctx.emit,
      signal: ctx.signal,
      ...(ctx.asOf ? { asOf: ctx.asOf } : {}),
      ...(ctx.offline ? { model: null } : {}),
    });
  },
};

function outcomeOf(action: string): Outcome {
  if (/escalat|handover/.test(action)) return 'escalated';
  if (/request_information|\.ask$|ask_/.test(action)) return 'needs_info';
  return 'resolved';
}

/**
 * Any folder-based agent (B, and any later one in the registry) as an engine: it decides on the case
 * folder and is reported as the same events agent A emits. Live cases are materialised first.
 */
function folderEngine(id: EngineId, label: string, agent: () => Promise<Agent>): Engine {
  return {
    id,
    label,
    async run(c, pack, ctx) {
      ctx.emit({ type: 'run.started', caseRef: c.ref, autonomy: ctx.autonomy });
      const tmp = ctx.dir ? undefined : await materialise(c);
      try {
        const dir = ctx.dir ?? tmp!;
        ctx.emit({ type: 'step.read', sourceIds: c.sources.map((s) => s.id), summary: `Agent B reads the case${ctx.cutBefore ? ` up to event ${ctx.cutBefore - 1}` : ''}, builds its fact ledger and decides.` });
        const d = await (await agent()).decide({ dir, track: pack.id, cutBefore: ctx.cutBefore, asOf: ctx.asOf, withhold: 'outcomes', offline: ctx.offline });
        ctx.emit({
          type: 'next.proposed',
          next: {
            action: d.action,
            recipient: d.recipient || '—',
            channel: d.channel || '—',
            message: d.message,
            reason: d.reason,
            citations: [],
            confidence: Math.min(1, Math.max(0, d.confidence ?? 0.5)),
            boundaries: [],
            remainingWork: d.failures,
            decidedBy: d.decidedBy === 'model' || d.decidedBy === 'gate' ? 'model' : 'playbook',
          },
        });
        // Agents that report token usage (optional on AgentDecision) are counted on the cost page.
        const u = (d as { usage?: Partial<Record<'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens', number>> }).usage;
        ctx.emit({
          type: 'run.completed',
          outcome: outcomeOf(d.action),
          summary: d.reason.slice(0, 280),
          usage: { inputTokens: u?.inputTokens ?? 0, outputTokens: u?.outputTokens ?? 0, cacheReadTokens: u?.cacheReadTokens ?? 0, cacheWriteTokens: u?.cacheWriteTokens ?? 0 },
        });
      } finally {
        if (tmp) await rm(tmp, { recursive: true, force: true }).catch(() => {});
      }
    },
    async answers(dirs, outDir, o) {
      const res = await (await agent()).answer(dirs, outDir, o);
      return res.map(({ name, decision: d }) => ({ name, action: d.action, decidedBy: d.decidedBy, failures: d.failures }));
    },
  };
}

const CHANNEL: Record<Source['kind'], string> = { call: 'Phone call', email: 'Email', sms: 'SMS', doc: 'Document', crm: 'CRM record', ticket: 'Ticket', note: 'Note' };

const utc = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;

/**
 * Writes a case that never had a folder (a live call or email) in the organisers' layout,
 * index.md + history.md, so a folder-based engine reads it exactly like a supplied case.
 */
export async function materialise(c: Case): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'casework-'));
  const dir = join(root, c.ref.replace(/\D/g, '').padStart(3, '0') || '001');
  await mkdir(dir, { recursive: true });
  const events = [...c.sources].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const first = events[0];
  const created = first?.receivedAt ?? new Date().toISOString();
  const from = (s: Source) => String((s.meta as { name?: string; contact?: string }).name ?? (s.meta as { contact?: string }).contact ?? c.customer.name);
  await writeFile(
    join(dir, 'index.md'),
    [
      `# Case ${c.ref}: ${c.title}`,
      '',
      '## Case details',
      '',
      '- **Source role:** Tenant',
      '- **Status:** Open',
      `- **Created:** ${utc(created)}`,
      `- **Updated:** ${utc(events.at(-1)?.receivedAt ?? created)}`,
      `- **Tenant:** ${c.customer.name}${c.customer.id ? ` (${c.customer.id})` : ''}`,
      '',
      '## Initial request',
      '',
      first?.body ?? c.title,
      '',
      '## History',
      '',
      '[Read the complete event history](history.md).',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(dir, 'history.md'),
    [
      `# Case ${c.ref} history`,
      '',
      `Total events: ${events.length}`,
      '',
      ...events.flatMap((s, i) => {
        const n = String(i + 1).padStart(3, '0');
        return [
          `<a id="event-${n}"></a>`,
          `## ${utc(s.receivedAt)} — event ${n}`,
          '',
          `- **Channel:** ${CHANNEL[s.kind] ?? 'Note'}`,
          `- **From:** ${s.kind === 'crm' ? 'Agency / system' : from(s)}`,
          `- **To:** ${s.kind === 'crm' ? 'Not specified' : 'Agency'}`,
          '',
          s.title && s.kind === 'email' ? `Subject: ${s.title}\n\n${s.body}` : s.body,
          '',
        ];
      }),
    ].join('\n'),
  );
  return dir;
}

const g = globalThis as unknown as { __caseworkEngines?: Map<EngineId, Engine> };
const engines: Map<EngineId, Engine> = (g.__caseworkEngines ??= new Map());

/** Agent B gets few-shot memory when a builder is supplied (the web app builds it once). */
let bAgent: () => Promise<Agent> = async () => agentB();
export function configureEngineB(build: () => Promise<Agent>) {
  let p: Promise<Agent> | undefined;
  bAgent = () => (p ??= build().catch(() => agentB()));
  engines.delete('b');
}

/** The engine to run. Default comes from ENGINE (a | b), else agent A. */
/** The engine to run: 'a' natively, 'b' with its configured memory, any other registry agent through its folder adapter. */
export function getEngine(id: EngineId | undefined = (process.env.ENGINE as EngineId | undefined)): Engine {
  const key: EngineId = id ?? 'a';
  let e = engines.get(key);
  if (!e) {
    if (key === 'a') e = engineA;
    else if (key === 'b') e = folderEngine('b', 'Agent B · fixed pipeline', () => bAgent());
    else {
      const agent = getAgents([key])[0]!;
      e = folderEngine(key, agent.label, async () => agent);
    }
    engines.set(key, e);
  }
  return e;
}
