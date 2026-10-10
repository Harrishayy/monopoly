import { randomUUID } from 'node:crypto';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { Assessment, Autonomy, Case, NextStep, Outcome, RunEvent, Usage } from '../schema';
import type { AgentTool, RuleContext, TrackPack } from '../track';
import { guard } from './guard';
import { buildHandover } from './handover';
import { decideModel, defaultModelClient, fromApiName, toApiName, type ModelClient } from './model';
import { withRetry } from './retry';

/** Events without the fields the emitter fills in. */
export type EmitInput = RunEvent extends infer E
  ? E extends RunEvent
    ? Omit<E, 'runId' | 'seq' | 'at'>
    : never
  : never;

export interface RunOptions {
  runId: string;
  autonomy: Autonomy;
  emit: (event: EmitInput) => void;
  signal?: AbortSignal;
  /** Model turns before giving up and using the playbook. */
  maxTurns?: number;
  /** The moment to decide for. Defaults to the latest source time. */
  asOf?: string;
  /** Messages API client. `undefined` uses ANTHROPIC_API_KEY if set; `null` forces the playbook. */
  model?: ModelClient | null;
}

/** Common fields every action tool takes (see the pack's tools). */
const ActionArgs = z
  .object({
    channel: z.string().optional(),
    message: z.string().optional(),
    reason: z.string().optional(),
    citations: z.array(z.string()).optional(),
    confidence: z.number().optional(),
    remainingWork: z.array(z.string()).optional(),
    queue: z.string().optional(),
    options: z.array(z.string()).optional(),
  })
  .passthrough();
type ActionArgs = z.infer<typeof ActionArgs>;

interface Attempt {
  tool: string;
  args: ActionArgs;
  ok: boolean;
  why?: string;
  ruleId?: string;
}

/**
 * Runs one case and decides its next step.
 * 1. run.started → step.read (every source) → case.assessed (the pack's deterministic read).
 * 2. Tool-use loop with MODEL_DECIDE. Every call goes through guard() then withRetry(). Refusals and
 *    failures go back to the model as tool errors so it can choose again or escalate.
 * 3. If there is no model, or it fails, the pack's top playbook suggestion is taken instead.
 * 4. decision.made → (escalation.created) → next.proposed → run.completed.
 * Never throws: an unexpected error ends in an escalation with the context gathered so far.
 */
export async function runCase(c: Case, pack: TrackPack, opts: RunOptions): Promise<Outcome> {
  const { emit } = opts;
  const usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const attempts: Attempt[] = [];
  let assessment: Assessment | undefined;

  const execTool = async (name: string, rawArgs: unknown): Promise<Attempt> => {
    const tool = pack.tools.find((t) => t.name === name) as AgentTool | undefined;
    const ctx: RuleContext = { case: c, assessment };
    const g = guard({ tool: name, args: rawArgs }, tool, pack.policy, opts.autonomy, ctx);
    const args = ActionArgs.safeParse(rawArgs).data ?? {};
    if (!g.allow) {
      emit({ type: 'action.blocked', action: name, ruleId: g.ruleId, why: g.why });
      const a = { tool: name, args, ok: false, why: g.why, ruleId: g.ruleId };
      attempts.push(a);
      return a;
    }
    const callId = randomUUID();
    const idempotencyKey = `${opts.runId}:${callId}`;
    emit({ type: 'tool.called', callId, tool: name, args: rawArgs });
    const started = performance.now();
    try {
      const result = await withRetry(
        (signal) => tool!.execute(tool!.input.parse(rawArgs), { caseRef: c.ref, runId: opts.runId, idempotencyKey, signal }),
        {
          timeoutMs: tool!.timeoutMs ?? Number(process.env.TOOL_TIMEOUT_MS ?? 8000),
          signal: opts.signal,
          onFailure: (err, attempt, willRetry) => emit({ type: 'tool.failed', callId, error: err.message, attempt, willRetry }),
        },
      );
      emit({ type: 'tool.succeeded', callId, result, ms: performance.now() - started });
      const a = { tool: name, args, ok: true };
      attempts.push(a);
      return a;
    } catch (err) {
      const a = { tool: name, args, ok: false, why: err instanceof Error ? err.message : String(err) };
      attempts.push(a);
      return a;
    }
  };

  try {
    emit({ type: 'run.started', caseRef: c.ref, autonomy: opts.autonomy });

    let assessError: string | undefined;
    try {
      assessment = pack.assess?.(c, { asOf: opts.asOf });
    } catch (err) {
      assessError = err instanceof Error ? err.message : String(err);
    }
    emit({
      type: 'step.read',
      sourceIds: c.sources.map((s) => s.id),
      summary: assessment
        ? `${c.sources.length} sources. Stage: ${assessment.stage}. ${assessment.noise.length} noise events set aside.`
        : `${c.sources.length} sources.${assessError ? ` Assessment failed: ${assessError}` : ''}`,
    });
    if (assessment) emit({ type: 'case.assessed', assessment });

    // ---------------- model
    const model = opts.model === undefined ? defaultModelClient() : opts.model;
    let modelNote: string | undefined = model ? undefined : 'No model configured (ANTHROPIC_API_KEY not set)';
    if (model) {
      try {
        await modelLoop(model);
      } catch (err) {
        modelNote = `Model call failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // ---------------- playbook fallback
    let decidedBy: NextStep['decidedBy'] = 'model';
    let primary = attempts.find((a) => a.ok);
    if (!primary) {
      decidedBy = 'playbook';
      const reason = modelNote ?? 'The model did not settle on an allowed action';
      for (const pick of assessment?.suggested ?? []) {
        const a = await execTool(pick.action, playbookArgs(pick, assessment!, reason));
        if (a.ok) {
          primary = a;
          break;
        }
      }
      if (!primary) {
        primary = await execTool('case.escalate', escalateArgs(reason));
      }
    }

    const p = primary;
    const args = p.args;
    const citations = (args.citations ?? []).filter((id) => c.sources.some((s) => s.id === id));
    const confidence = clamp(args.confidence ?? (decidedBy === 'playbook' ? 0.5 : 0.7));
    const reasonText = args.reason ?? 'No reason given';
    emit({
      type: 'decision.made',
      label: `${p.tool}${decidedBy === 'playbook' ? ' (playbook)' : ''}`,
      rationale: decidedBy === 'playbook' && modelNote ? `${reasonText} [${modelNote}]` : reasonText,
      confidence,
      citations,
    });

    const mustEscalate = assessment?.flags.filter((f) => f.mustEscalate) ?? [];
    const escalated = p.ok && p.tool === 'case.escalate';
    if (escalated || !p.ok || mustEscalate.length) {
      emit({
        type: 'escalation.created',
        handover: buildHandover(c, assessment, {
          reason: escalated ? reasonText : !p.ok ? `No allowed action could be taken: ${p.why}` : `Needs a person: ${mustEscalate.map((f) => f.text).join('; ')}`,
          queue: args.queue,
          options: args.options,
          confidence,
          citations,
          tried: attempts.filter((a) => a.ok).map((a) => ({ text: a.tool, ok: true })),
          refused: attempts.filter((a) => a.ruleId).map((a) => ({ action: a.tool, ruleId: a.ruleId! })),
        }),
      });
    }

    const tool = pack.tools.find((t) => t.name === p.tool);
    emit({
      type: 'next.proposed',
      next: {
        action: p.tool,
        recipient: tool?.recipient ?? p.tool.split('.')[0] ?? 'Unknown',
        channel: args.channel ?? 'note',
        message: args.message ?? '',
        reason: reasonText,
        citations,
        confidence,
        boundaries: assessment?.boundaries ?? [],
        remainingWork: args.remainingWork ?? [],
        decidedBy,
      },
    });

    const outcome: Outcome = escalated || !p.ok || mustEscalate.length ? 'escalated' : 'resolved';
    emit({ type: 'run.completed', outcome, summary: summaryOf(p, tool, decidedBy), usage });
    return outcome;
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    emit({
      type: 'escalation.created',
      handover: buildHandover(c, assessment, {
        reason: `The run stopped unexpectedly: ${why}`,
        tried: attempts.map((a) => ({ text: a.tool, ok: a.ok })),
        refused: attempts.filter((a) => a.ruleId).map((a) => ({ action: a.tool, ruleId: a.ruleId! })),
      }),
    });
    emit({ type: 'run.completed', outcome: 'failed', summary: `Run failed and was handed to a person: ${why}`, usage });
    return 'failed';
  }

  // ---------------------------------------------------------------- helpers

  async function modelLoop(model: ModelClient) {
    const maxTurns = opts.maxTurns ?? 6;
    const apiTools: Anthropic.Tool[] = pack.tools.map((t) => {
      const { $schema: _, ...schema } = z.toJSONSchema(t.input, { io: 'input' }) as Record<string, unknown>;
      return { name: toApiName(t.name), description: t.description, input_schema: schema as Anthropic.Tool.InputSchema };
    });
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: casePrompt(c, assessment, pack) }];
    let nudged = false;
    for (let turn = 0; turn < maxTurns; turn++) {
      const res = await model(
        {
          model: decideModel(),
          max_tokens: 16_000,
          thinking: { type: 'adaptive' },
          system: [{ type: 'text', text: pack.systemPrompt, cache_control: { type: 'ephemeral' } }],
          tools: apiTools,
          messages,
        },
        opts.signal,
      );
      usage.inputTokens += res.usage.input_tokens;
      usage.outputTokens += res.usage.output_tokens;
      usage.cacheReadTokens += res.usage.cache_read_input_tokens ?? 0;
      usage.cacheWriteTokens += res.usage.cache_creation_input_tokens ?? 0;

      const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: res.content });
      if (!uses.length) {
        if (attempts.some((a) => a.ok) || nudged) return;
        nudged = true;
        messages.push({ role: 'user', content: 'Take the next step now by calling exactly one action tool.' });
        continue;
      }
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const u of uses) {
        const name = fromApiName(u.name);
        if (attempts.filter((a) => a.ok).length >= 2) {
          results.push({ type: 'tool_result', tool_use_id: u.id, content: 'Limit reached: at most one primary and one companion action per run.', is_error: true });
          continue;
        }
        const a = await execTool(name, u.input);
        results.push({
          type: 'tool_result',
          tool_use_id: u.id,
          content: a.ok ? 'Done. Recorded to the outbox.' : `Refused${a.ruleId ? ` (${a.ruleId})` : ''}: ${a.why}`,
          is_error: !a.ok,
        });
      }
      messages.push({ role: 'user', content: results });
      if (attempts.some((a) => a.ok)) return;
    }
  }

  function playbookArgs(pick: { action: string; why: string }, a: Assessment, note: string): ActionArgs & Record<string, unknown> {
    const cites = [...new Set([...(a.waitingOn?.sourceIds ?? []), ...a.facts.flatMap((f) => f.sourceIds)])].slice(-4);
    return {
      channel: pick.action.startsWith('case.') ? 'note' : 'email',
      message: `[Playbook draft, review before sending] ${pick.why}.`,
      reason: `${pick.why}. Stage: ${a.stage}.`,
      citations: cites.length ? cites : [c.sources[0]!.id],
      confidence: 0.5,
      remainingWork: [`Decided by rules only (${note}); a person should review the wording.`],
      ...(pick.action === 'case.wait' ? { recheckInDays: 2 } : {}),
      ...(pick.action === 'case.escalate' ? { queue: 'Case handler', options: ['Review the job and choose the next step'] } : {}),
    };
  }

  function escalateArgs(note: string): ActionArgs {
    return {
      channel: 'note',
      message: 'Please review this job; the agent could not take an allowed next step.',
      reason: note,
      citations: [c.sources[0]?.id ?? `${c.ref}:case`],
      confidence: 0.3,
      remainingWork: ['Choose and take the next step'],
      queue: 'Case handler',
      options: ['Review the job and choose the next step'],
    };
  }
}

function casePrompt(c: Case, a: Assessment | undefined, pack: TrackPack): string {
  const sources = c.sources
    .map((s) => {
      const m = s.meta as Record<string, unknown>;
      const route = m.from || m.to ? ` · ${m.from ?? '?'} → ${m.to ?? '?'}` : '';
      return `<source id="${s.id}" kind="${s.kind}" at="${s.receivedAt}">\n${s.title}${route}\n\n${s.body}\n</source>`;
    })
    .join('\n\n');
  const rules = pack.policy.mustEscalate.map((r) => `- ${r.describe} (${r.id})`).join('\n');
  return `<case ref="${c.ref}" title="${c.title}">
${sources}
</case>

<always_escalate>
${rules}
</always_escalate>

<assessment>
${a ? JSON.stringify(a, null, 1) : 'Not available. Work from the history alone.'}
</assessment>

It is now ${a?.asOf ?? c.sources.at(-1)?.receivedAt ?? 'unknown'}. Decide the agency's single best next step on this ${pack.vocabulary.case.toLowerCase()} and take it with one action tool call.`;
}

function summaryOf(p: Attempt, tool: AgentTool | undefined, decidedBy: NextStep['decidedBy']): string {
  if (!p.ok) return `Could not take an allowed step (${p.why}); handed to a person.`;
  const who = tool?.recipient ? ` → ${tool.recipient}` : '';
  return `Next step: ${p.tool}${who}. ${p.args.reason ?? ''}${decidedBy === 'playbook' ? ' (chosen by the rules-only playbook)' : ''}`.trim();
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
