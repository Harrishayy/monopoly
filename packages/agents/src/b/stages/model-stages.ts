import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { type Caller, MODELS, structured } from '../llm/client';
import { type CaseFile, Critique, Decision, type ModelCall, SameTurnMessage, Situation } from '../types';
import { renderEvent } from './dossier';
import { type DomainAction, genericOf } from '../knowledge/actions';
import { CRITIC_INSTRUCTIONS, decideInstructions, DIGEST_INSTRUCTIONS, reviseInstructions, SITUATE_INSTRUCTIONS } from './prompts';

export interface StageContext {
  caller: Caller;
  /** The track's action list, when it has one. */
  actions?: DomainAction[];
  /** Similar past moments and what the team did, as plain text. */
  examples?: string;
  system: string;
  /** Dossier and images, shared (and cached) across stages. */
  caseBlocks: Anthropic.ContentBlockParam[];
  calls: ModelCall[];
  signal?: AbortSignal;
  /** Per-stage model overrides; unset stages use MODELS. */
  models?: StageModels;
}

export interface StageModels {
  read?: string;
  decide?: string;
  critic?: string;
}

export const modelFor = (ctx: StageContext, stage: keyof StageModels) =>
  ctx.models?.[stage] ?? (stage === 'read' ? MODELS.read() : stage === 'critic' ? MODELS.critic() : MODELS.decide());

const text = (t: string): Anthropic.ContentBlockParam => ({ type: 'text', text: t });

export function situate(ctx: StageContext): Promise<Situation> {
  return structured(
    ctx.caller,
    {
      stage: 'situate',
      model: modelFor(ctx, 'read'),
      system: ctx.system,
      content: [...ctx.caseBlocks, text(SITUATE_INSTRUCTIONS)],
      schema: Situation,
      maxTokens: 20_000,
      signal: ctx.signal,
    },
    ctx.calls,
  );
}

/** With an action list the model must pick one of its names; the generic verb is derived from it. */
export function decisionSchema(actions?: DomainAction[]): z.ZodType<Decision> {
  if (!actions?.length) return Decision.extend({ alsoSend: z.array(SameTurnMessage).describe(ALSO_SEND).default([]) }) as unknown as z.ZodType<Decision>;
  const names = actions.map((a) => a.name) as [string, ...string[]];
  const messages = sameTurnActions(actions);
  const companion = messages.length
    ? SameTurnMessage.extend({ domainAction: z.enum(messages as [string, ...string[]]).describe('A message action from the list, by its exact name') })
    : SameTurnMessage;
  return Decision.extend({
    domainAction: z.enum(names).describe('The action from the list, by its exact name'),
    alsoSend: z.array(companion).describe(ALSO_SEND).default([]),
  }) as unknown as z.ZodType<Decision>;
}

const ALSO_SEND = 'At most two messages to OTHER parties that belong in the same turn as the main action, e.g. acknowledging or giving safety advice to the person who reported it while asking the decision-maker. Messages only. Empty array when the main action stands alone.';

/** Only plain messages (update, ask, chase) may ride along with the main action. */
const sameTurnActions = (actions: DomainAction[]) => actions.map((a) => a.name).filter((n) => /\.(update|ask|chase)$/.test(n));

function sameTurn(d: Decision, actions?: DomainAction[]): Decision['alsoSend'] {
  const allowed = actions?.length ? new Set(sameTurnActions(actions)) : undefined;
  return (d.alsoSend ?? [])
    .filter((m) => m.message.trim() && m.recipient.trim() && (!allowed || (m.domainAction && allowed.has(m.domainAction))))
    .filter((m) => !d.domainAction || m.domainAction !== d.domainAction)
    .slice(0, 2);
}

export async function decide(ctx: StageContext, situation: Situation | undefined, stage = 'decide', extra?: string): Promise<Decision> {
  const situationJson = situation ? JSON.stringify(situation, null, 1) : '(not available: read the records directly)';
  const d = await structured(
    ctx.caller,
    {
      stage,
      model: modelFor(ctx, 'decide'),
      system: ctx.system,
      content: [...ctx.caseBlocks, text(decideInstructions(situationJson, ctx.actions, ctx.examples)), ...(extra ? [text(extra)] : [])],
      schema: decisionSchema(ctx.actions),
      maxTokens: 12_000,
      signal: ctx.signal,
    },
    ctx.calls,
  );
  // The domain action is the decision; keep the generic verb consistent with it.
  const action = d.domainAction ? genericOf(d.domainAction) : d.action;
  return { ...d, action, alsoSend: action === 'wait' ? [] : sameTurn(d, ctx.actions) };
}

export function critique(ctx: StageContext, decision: Decision, hardIssues: string[]): Promise<Critique> {
  const proposal = `Proposed next action:\n<proposal>\n${JSON.stringify(decision, null, 1)}\n</proposal>${
    hardIssues.length ? `\nAutomatic checks raised:\n${hardIssues.map((h) => `- ${h}`).join('\n')}` : ''
  }`;
  return structured(
    ctx.caller,
    {
      stage: 'critic',
      model: modelFor(ctx, 'critic'),
      system: ctx.system,
      content: [...ctx.caseBlocks, text(proposal), text(CRITIC_INSTRUCTIONS)],
      schema: Critique,
      maxTokens: 6000,
      signal: ctx.signal,
    },
    ctx.calls,
  );
}

export function revise(ctx: StageContext, situation: Situation | undefined, problems: string[]): Promise<Decision> {
  return decide(ctx, situation, 'revise', reviseInstructions(problems));
}

const Digest = z.object({ summary: z.string() });

/** Summarise the oldest events of a very large case in blocks, so the rest fits verbatim. */
export async function digestEvents(
  caller: Caller,
  system: string,
  c: CaseFile,
  keepLast: number,
  calls: ModelCall[],
  signal?: AbortSignal,
): Promise<{ upTo: string; text: string } | undefined> {
  const older = c.events.slice(0, Math.max(0, c.events.length - keepLast));
  if (!older.length) return undefined;
  const chunks: string[][] = [[]];
  let size = 0;
  for (const e of older) {
    const r = renderEvent(e);
    if (size + r.length > 120_000 && chunks.at(-1)!.length) {
      chunks.push([]);
      size = 0;
    }
    chunks.at(-1)!.push(r);
    size += r.length;
  }
  const parts = await Promise.all(
    chunks.map((ch) =>
      structured(
        caller,
        {
          stage: 'digest',
          model: MODELS.read(),
          system,
          content: [text(`Events from case ${c.name}:\n\n${ch.join('\n\n')}`), text(DIGEST_INSTRUCTIONS)],
          schema: Digest,
          maxTokens: 6000,
          signal,
        },
        calls,
      ),
    ),
  );
  return { upTo: older.at(-1)!.id, text: parts.map((p) => p.summary).join('\n\n') };
}
