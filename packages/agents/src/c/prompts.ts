import type { IssueResponse, ReviewIssue } from './types';

const REVIEW_CHECKS = `Check, against the records and the manuals:
- Is every fact in the message and rationale supported by the cited records? Are the citations real?
- Is it the right next step for the stage, to the right recipient, through a sensible channel?
- Does it act without authority or approval, promise anything unconfirmed, share personal data with the wrong party, or rely on noise?
- Does it ignore a conflict, a failed action, a safety risk, or a date a party promised that has not arrived?
- Is it premature (acting before a needed approval or answer) or late (waiting when action is overdue)?
- Is the escalation needed? Escalating when the playbook covers the case is a mistake. Not escalating a case that needs a person is a serious mistake.
- Is the question or chase needed? Asking for information the next step does not need, or chasing someone who has already answered, is a mistake too.`;

const REVIEW_RULES = `Rules for your review:
- Each issue is one specific problem a careful operations lead would catch. Cite the evidence ids or manual section that show it in refs. An issue you cannot cite is not an issue.
- blocking: the action, the recipient or a stated fact should change, or the plan would cause harm or break a rule. A message that tells someone something the records do not support (an attachment that is not there, a contact that did not happen, an unconfirmed date) is blocking. minor: wording or style. Extra caution is never blocking on its own.
- suggestion: the action that would fix it, concretely (action and recipient), not "be more careful".
- Do not rewrite the plan. Do not raise issues about details the next step does not depend on.
Verdict: "approve" when there is no blocking issue. "revise" when at least one issue is blocking. "escalate" only when no autonomous action is safe and a person must decide now; say why in escalationReason.`;

export const REVIEW_INSTRUCTIONS = `You are a strict, experienced operations lead reviewing another agent's proposed next action for the case above. You did not write it. Return your review.
${REVIEW_CHECKS}
${REVIEW_RULES}`;

/** The second review sees the leader's answers, so it can withdraw issues the records settle. */
export function reReviewInstructions(previous: ReviewIssue[], responses: IssueResponse[]): string {
  const lines = previous.map((i) => {
    const r = responses.find((x) => x.issueId === i.id);
    const answer = r ? `${r.verdict.toUpperCase()}: ${r.evidence}${r.refs.length ? ` [${r.refs.join(', ')}]` : ''}` : 'no answer';
    return `- ${i.id} (${i.severity}, ${i.tag}) ${i.claim} [${i.refs.join(', ')}]\n  Leader's answer: ${answer}`;
  });
  return `You reviewed an earlier version of this plan and raised the issues below. The leader answered each one and revised the plan; the proposal above is the revised version.
${lines.join('\n')}

Review the revised proposal.
- Where the leader accepted an issue, check the revision actually fixes it.
- Where the leader rejected an issue, weigh their evidence against the records. If the records support them, drop the issue. If they do not, keep it with the same id and say in claim why the evidence does not hold.
- Raise a new issue only if the revision introduced it or it is blocking and you missed it before.
${REVIEW_CHECKS}
${REVIEW_RULES}`;
}

export function respondInstructions(issues: ReviewIssue[]): string {
  return `A reviewer raised these blocking issues with your proposed action (shown above):
${issues.map((i) => `- ${i.id} (${i.tag}) ${i.claim} [${i.refs.join(', ')}]\n  Suggested fix: ${i.suggestion}`).join('\n')}

Answer each issue by its id, then return your plan.
- accept: the reviewer is right. Say what you changed, and change the plan so it no longer has the problem.
- reject: the reviewer is wrong. Give the evidence, quoting or citing the records or the manual. "I disagree" is not evidence. Do not give in just because you were challenged: a revision that fixes a correct plan into a wrong one is a failure.
Then return the full decision in \`decision\`, revised where you accepted an issue and unchanged where you rejected it.`;
}
