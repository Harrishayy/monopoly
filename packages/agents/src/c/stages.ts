import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { genericOf } from '../b/knowledge/actions';
import { structured } from '../b/llm/client';
import { decisionSchema, modelFor, type StageContext } from '../b/stages/model-stages';
import { decideInstructions } from '../b/stages/prompts';
import type { Decision, Situation } from '../b/types';
import { respondInstructions, REVIEW_INSTRUCTIONS, reReviewInstructions } from './prompts';
import { IssueResponse, Review, type ReviewIssue } from './types';

const text = (t: string): Anthropic.ContentBlockParam => ({ type: 'text', text: t });

const proposalBlock = (d: Decision, checks: string[]) =>
  text(
    `Proposed next action:\n<proposal>\n${JSON.stringify(d, null, 1)}\n</proposal>${
      checks.length ? `\nAutomatic checks raised:\n${checks.map((h) => `- ${h}`).join('\n')}` : ''
    }`,
  );

/** The critic: structured issues with citations. Round 2 sees the leader's answers to round 1. */
export function review(
  ctx: StageContext,
  decision: Decision,
  checks: string[],
  round: number,
  previous?: { issues: ReviewIssue[]; responses: IssueResponse[] },
): Promise<Review> {
  return structured(
    ctx.caller,
    {
      stage: `review-${round}`,
      model: modelFor(ctx, 'critic'),
      system: ctx.system,
      content: [...ctx.caseBlocks, proposalBlock(decision, checks), text(previous ? reReviewInstructions(previous.issues, previous.responses) : REVIEW_INSTRUCTIONS)],
      schema: Review,
      maxTokens: 8000,
      signal: ctx.signal,
    },
    ctx.calls,
  );
}

/** The leader answers each blocking issue (accept and fix, or reject with evidence) and returns its plan. */
export async function respond(
  ctx: StageContext,
  situation: Situation | undefined,
  decision: Decision,
  issues: ReviewIssue[],
  round: number,
): Promise<{ responses: IssueResponse[]; decision: Decision }> {
  const situationJson = situation ? JSON.stringify(situation, null, 1) : '(not available: read the records directly)';
  const schema = z.object({ responses: z.array(IssueResponse), decision: decisionSchema(ctx.actions) });
  const out = await structured(
    ctx.caller,
    {
      stage: `respond-${round}`,
      model: modelFor(ctx, 'decide'),
      system: ctx.system,
      content: [...ctx.caseBlocks, text(decideInstructions(situationJson, ctx.actions, ctx.examples)), proposalBlock(decision, []), text(respondInstructions(issues))],
      schema,
      maxTokens: 14_000,
      signal: ctx.signal,
    },
    ctx.calls,
  );
  const d = out.decision;
  return { responses: out.responses, decision: d.domainAction ? { ...d, action: genericOf(d.domainAction) } : d };
}
