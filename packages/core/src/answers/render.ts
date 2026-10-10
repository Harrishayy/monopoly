import type { Case } from '../schema';
import type { RunView } from '../run/view';

const OUTCOME_LABEL: Record<string, string> = {
  resolved: 'Resolved',
  escalated: 'Escalated',
  needs_info: 'Needs info',
  failed: 'Failed',
  declined: 'Declined',
};

const list = (items: string[], empty: string) =>
  items.length ? items.map((t, i) => `${i + 1}. ${t}`).join('\n') : empty;

/**
 * Renders ANSWERS/<n>/ANSWER.md and REASONING.md from a finished run.
 * Covers what the rules ask for: received, actions, outputs, escalated, failed, final result.
 * Never hand-edit the output; re-run the CLI instead.
 */
export function renderAnswers(view: RunView, c: Case, n: number): { answer: string; reasoning: string } {
  const outcome = view.outcome ? OUTCOME_LABEL[view.outcome] : 'Incomplete';
  const received = c.sources.map((s) => `${s.title} (${s.kind})`).join(', ') || 'No sources';
  const actions = view.toolCalls.map((t) => {
    const tries = t.attempts.length > 1 ? ` after ${t.attempts.length} attempts` : '';
    return `\`${t.tool}\` → ${t.status}${tries}`;
  });
  const failures = view.toolCalls.flatMap((t) =>
    t.attempts.filter((a) => !a.ok).map((a) => `\`${t.tool}\`: ${a.error}`),
  );
  const lastDecision = view.decisions.at(-1);

  const answer = `# Case ${n} · ${c.ref} · ${outcome}

**What the system received**
${received}

**Actions taken**
${list(actions, 'None')}

**Actions refused**
${list(view.blocked.map((b) => `${b.action} (rule: ${b.ruleId})`), 'None')}

**Escalated**
${view.handover ? `To ${view.handover.queue}. ${view.handover.reason}` : 'No'}

**What failed**
${list(failures, 'Nothing')}

**Final result**
${view.summary ?? 'The run did not complete.'}${lastDecision ? ` Confidence ${lastDecision.confidence.toFixed(2)}.` : ''}
`;

  const steps = view.decisions
    .map(
      (d, i) =>
        `## Step ${i + 1} · ${d.label}\n${d.rationale}\n\nSources: ${d.citations.map((s) => `[${s}]`).join(' ') || 'none'} · Confidence ${d.confidence.toFixed(2)}`,
    )
    .join('\n\n');

  const reasoning = `# Reasoning · ${c.ref}

${steps || '_No decisions were recorded._'}

## Handover
${
  view.handover
    ? [
        `Reason: ${view.handover.reason}`,
        '',
        'Facts:',
        ...view.handover.facts.map((f) => `- ${f.text} [${f.sourceId}]`),
        '',
        'Options offered:',
        ...view.handover.options.map((o) => `- ${o.label}${o.recommended ? ' (recommended)' : ''} · ${o.effect}`),
      ].join('\n')
    : 'None'
}

## Trace
See trace.jsonl in this folder (${view.lastSeq + 1} events).
`;

  return { answer, reasoning };
}
