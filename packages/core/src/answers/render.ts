import type { Case } from '../schema';
import type { RunView } from '../run/view';

const OUTCOME_LABEL: Record<string, string> = {
  resolved: 'Next step taken',
  escalated: 'Escalated',
  needs_info: 'Needs info',
  failed: 'Failed',
  declined: 'Declined',
};

const list = (items: string[], empty: string) =>
  items.length ? items.map((t, i) => `${i + 1}. ${t}`).join('\n') : empty;
const bullets = (items: string[], empty: string) => (items.length ? items.map((t) => `- ${t}`).join('\n') : empty);
const cite = (ids: string[]) => (ids.length ? ` [${ids.join(', ')}]` : '');
const quote = (text: string) => text.split('\n').map((l) => `> ${l}`).join('\n');

/**
 * Renders ANSWERS/<n>/ANSWER.md and REASONING.md from a finished run.
 * Covers what the rules ask for: received, actions, outputs, escalated, failed, final result.
 * Never hand-edit the output; re-run the CLI instead.
 */
export function renderAnswers(view: RunView, c: Case, n: number): { answer: string; reasoning: string } {
  const outcome = view.outcome ? OUTCOME_LABEL[view.outcome] : 'Incomplete';
  const docs = c.sources.filter((s) => s.kind === 'doc').length;
  const events = c.sources.filter((s) => /:event-\d+$/.test(s.id)).length;
  const received = `The case file, ${events} history event${events === 1 ? '' : 's'}${docs ? ` and ${docs} attachment${docs === 1 ? '' : 's'}` : ''}.`;
  const actions = view.toolCalls.map((t) => {
    const tries = t.attempts.length > 1 ? ` after ${t.attempts.length} attempts` : '';
    return `\`${t.tool}\` → ${t.status}${tries}`;
  });
  const failures = view.toolCalls.flatMap((t) =>
    t.attempts.filter((a) => !a.ok).map((a) => `\`${t.tool}\`: ${a.error}`),
  );
  const lastDecision = view.decisions.at(-1);
  const next = view.next;
  const a = view.assessment;

  const nextBlock = next
    ? `**Next step**
\`${next.action}\` · to ${next.recipient} · by ${next.channel}${next.decidedBy === 'playbook' ? ' · chosen by the rules-only playbook' : ''}

${next.reason}${cite(next.citations)}

${next.message ? `${quote(next.message)}\n` : ''}
**Do not claim or do**
${bullets(next.boundaries, 'Nothing beyond the step above.')}

**Remaining work**
${bullets(next.remainingWork, 'Nothing recorded.')}
`
    : '**Next step**\nNone was decided.\n';

  const answer = `# Case ${n} · ${c.ref} · ${outcome}

**Where the case stands**
${a ? `${a.stage}.${a.waitingOn ? ` Waiting on the ${a.waitingOn.party} since ${a.waitingOn.since.slice(0, 10)}.` : ''}` : 'Not assessed.'}

${nextBlock}
**What the system received**
${received}

**Actions taken**
${list(actions, 'None')}
${actions.length ? '\nActions are recorded to an outbox; no live channel is connected, so nothing was delivered.\n' : ''}
**Actions refused**
${list(view.blocked.map((b) => `${b.action}: ${b.why} (rule: ${b.ruleId})`), 'None')}

**Escalated**
${view.handover ? `To ${view.handover.queue}. ${view.handover.reason}` : 'No'}

**What failed**
${list(failures, 'Nothing')}

**Final result**
${view.summary ?? 'The run did not complete.'}${lastDecision ? ` Confidence ${lastDecision.confidence.toFixed(2)}.` : ''}
`;

  const assessment = a
    ? `## Assessment (rules, before the model)
As of ${a.asOf}. Stage: **${a.stage}**.${a.waitingOn ? ` Waiting on the ${a.waitingOn.party} since ${a.waitingOn.since}${cite(a.waitingOn.sourceIds)}.` : ''}

Facts:
${bullets(a.facts.map((f) => `${f.text}${cite(f.sourceIds)}`), '- None')}

Flags:
${bullets(a.flags.map((f) => `${f.mustEscalate ? '**Must escalate:** ' : ''}${f.text}${cite(f.sourceIds)}`), '- None')}

Playbook suggestions:
${bullets(a.suggested.map((s) => `\`${s.action}\`: ${s.why}`), '- None')}

Barred by rule:
${bullets(a.barred.map((b) => `\`${b.action}\`: ${b.why} (${b.ruleId})`), '- None')}

Set aside as noise:
${bullets(a.noise.map((x) => `${x.sourceId}: ${x.why}`), '- None')}
`
    : '## Assessment\nNot available.\n';

  const steps = view.decisions
    .map(
      (d, i) =>
        `## Decision ${i + 1} · ${d.label}\n${d.rationale}\n\nSources: ${d.citations.map((s) => `[${s}]`).join(' ') || 'none'} · Confidence ${d.confidence.toFixed(2)}`,
    )
    .join('\n\n');

  const refused = view.blocked.length
    ? `## Refused along the way\n${bullets(view.blocked.map((b) => `\`${b.action}\`: ${b.why} (${b.ruleId})`), '')}\n`
    : '';

  const reasoning = `# Reasoning · ${c.ref}

${assessment}
${refused}
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
See trace.jsonl in this folder (${view.lastSeq + 1} events).${view.usage ? ` Model tokens: ${view.usage.inputTokens} in, ${view.usage.outputTokens} out, ${view.usage.cacheReadTokens} read from cache.` : ''}
`;

  return { answer, reasoning };
}
