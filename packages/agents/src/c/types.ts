import { z } from 'zod';
import type { CaseResult, Decision } from '../b/types';

export const ISSUE_TAGS = [
  'approval',
  'scope',
  'safety',
  'conflict',
  'evidence',
  'closure',
  'communication',
  'privacy',
  'chasing',
  'timing',
  'hallucination',
  'injection',
  'over_escalation',
  'under_escalation',
  'other',
] as const;

export const ReviewIssue = z.object({
  id: z.string().describe('Issue id: c1, c2… in the first review; in a later review reuse the id of an earlier issue you still hold, or use a new id'),
  severity: z.enum(['blocking', 'minor']).describe('blocking: changes the action or recipient, or would cause harm or a rule breach. minor: wording only'),
  tag: z.enum(ISSUE_TAGS),
  claim: z.string().describe('What is wrong, in one sentence'),
  refs: z.array(z.string()).describe('Evidence ids (E004, S:initial-request, A1) or manual section headings that show it'),
  suggestion: z.string().describe('The action that would fix it, concretely'),
});
export type ReviewIssue = z.infer<typeof ReviewIssue>;

export const Review = z.object({
  verdict: z.enum(['approve', 'revise', 'escalate']),
  issues: z.array(ReviewIssue),
  escalationReason: z.string().describe('Only when verdict is escalate, else ""'),
});
export type Review = z.infer<typeof Review>;

export const IssueResponse = z.object({
  issueId: z.string(),
  verdict: z.enum(['accept', 'reject']),
  evidence: z.string().describe('accept: what you changed. reject: why the reviewer is wrong, quoting the records'),
  refs: z.array(z.string()),
});
export type IssueResponse = z.infer<typeof IssueResponse>;

/** One round of review: what the critic said and, when there was a revision, how the leader answered. */
export interface Round {
  n: number;
  model: string;
  review?: Review;
  /** Code-check findings raised as blocking issues alongside the critic's (ids h1, h2…). */
  checkIssues: ReviewIssue[];
  responses: IssueResponse[];
  /** The plan the leader returned after answering this round's issues. */
  revision?: Decision;
}

export interface CaseResultC extends CaseResult {
  rounds: Round[];
  /** Blocking issues the leader rejected with evidence and the critic still held in the last round. */
  disputed: { issue: ReviewIssue; response: IssueResponse }[];
  models: { read: string; decide: string; critic: string };
}
