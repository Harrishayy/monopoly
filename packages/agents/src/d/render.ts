import type { Case, TrackPack } from '@casework/core';
import type { DResult, Proposal } from './types';

const ROUTE_TEXT: Record<DResult['route'], string> = {
  forced: 'Forced handover: a trigger that always needs a person was found, so code escalated without asking a model.',
  easy: 'All votes agreed on a reversible step and nothing was flagged.',
  supervised: 'The votes split, the step was irreversible, or the rules flagged something, so the supervisor model chose between the candidates.',
  majority: 'Chosen by majority among the steps the guard accepted, preferring the cautious step on a tie.',
  retried: 'Every vote was refused by the guard; a retry with the guard’s reasons produced an allowed step.',
  fallback: 'No model step could be used, so the rules-only playbook decided.',
};

const recipientOf = (pack: TrackPack, action: string) => pack.tools.find((t) => t.name === action)?.recipient ?? action.split('.')[0] ?? '';

const money = (usd: number) => `$${usd.toFixed(4)}`;

export function renderAnswer(r: DResult, c: Case, pack: TrackPack, n: number): string {
  const f = r.final;
  const out = [
    `# Case ${n}: ${c.title}`,
    '',
    `**Next step:** \`${f.action}\` → ${recipientOf(pack, f.action)} by ${f.channel}`,
    `**As of:** ${r.asOf}`,
    '',
    '## Message',
    '',
    f.message ? quote(f.message) : '_No message: internal step._',
    '',
  ];
  if (r.companion) out.push('## Sent at the same moment', '', `\`${r.companion.action}\` → ${recipientOf(pack, r.companion.action)}`, '', quote(r.companion.message), '');
  out.push('## Why', '', f.explanation, '', `Sources: ${f.citations.map((x) => `\`${x}\``).join(', ') || 'none'}`, '');
  if (f.action === 'case.escalate') {
    out.push('## Handover to a person', '', `**Why a person is needed:** ${f.triggerId ?? 'see reason'}`);
    for (const t of r.forced) out.push(`- ${t.label} (${t.id}), ${t.queue}: "${t.quote}" [${t.sourceId}]. First step: ${t.firstStep}`);
    if (f.reviewNote) out.push('', `**Recommended next step:** ${f.reviewNote}`);
    out.push('');
  } else if (f.reviewNote || r.warnings.length) {
    out.push('## For a person to glance at', '', ...(f.reviewNote ? [f.reviewNote] : []), ...r.warnings.map((t) => `- ${t.label} in \`${t.sourceId}\`: not acted on. ${t.firstStep}`), '');
  }
  if (f.missingFact) out.push('## Information requested', '', f.missingFact, '');
  if (r.boundaries.length) out.push('## Boundaries', '', ...r.boundaries.map((b) => `- ${b}`), '');
  if (f.remainingWork.length) out.push('## Still open', '', ...f.remainingWork.map((w) => `- ${w}`), '');
  out.push(
    '## Status',
    '',
    `Decided by agent D (${r.route}). ${ROUTE_TEXT[r.route]}`,
    'No live channel is connected: the step was recorded to the outbox, and nothing was delivered.',
  );
  if (r.failures.length) out.push('', '**What failed**', '', ...r.failures.map((x) => `- ${x}`));
  return out.join('\n') + '\n';
}

export function renderReasoning(r: DResult, c: Case, n: number): string {
  const out = [
    `# Case ${n}: reasoning`,
    '',
    `Case \`${c.ref}\`: ${c.sources.length} sources received, decision as of ${r.asOf}. Stage according to the rules: ${r.stage ?? 'not available'}.`,
    '',
    `## Route: ${r.route}`,
    '',
    ROUTE_TEXT[r.route],
    '',
  ];
  if (r.forced.length) {
    out.push('## Forced triggers', '', ...r.forced.map((t) => `- **${t.label}** (${t.id}) in \`${t.sourceId}\`: "${t.quote}"`), '');
  }
  if (r.warnings.length) {
    out.push('## Warnings (not acted on)', '', ...r.warnings.map((t) => `- **${t.label}** (${t.id}) in \`${t.sourceId}\`: "${t.quote}". ${t.firstStep}`), '');
  }
  if (r.votes.length) {
    out.push('## Votes', '', '| # | Action | Explanation |', '|---|---|---|');
    r.votes.forEach((v, i) => out.push(`| ${i + 1} | \`${v.action}\` | ${cell(v.explanation)} |`));
    out.push('');
  }
  if (r.supervision) {
    const s = r.supervision;
    out.push('## Supervisor review', '');
    for (const x of s.review) out.push(`- Candidate ${x.candidate}: right: ${x.right}. Wrong: ${x.wrong}.`);
    out.push('', s.chosenCandidate !== null ? `Chose candidate ${s.chosenCandidate}.` : `Proposed a different step. Missed fact: ${s.missedFact ?? 'not stated'}.`, '');
  }
  if (r.refusals.length) {
    out.push('## Refused by the guard', '', '| By | Action | Rule | Why |', '|---|---|---|---|');
    for (const x of r.refusals) out.push(`| ${x.by} | \`${x.action}\` | \`${x.ruleId}\` | ${cell(x.why)} |`);
    out.push('');
  }
  out.push('## Decision', '', `\`${r.final.action}\`: ${r.final.explanation}`, '');
  if (r.final.alternatives.length) out.push('Other defensible steps considered:', '', ...r.final.alternatives.map((a) => `- \`${a.action}\`: ${a.whyNot}`), '');
  out.push(
    '## Model calls',
    '',
    r.calls.length ? '| Role | Model | OK | Seconds | Input | Output | Cache read | Est. cost |' : 'None.',
    ...(r.calls.length ? ['|---|---|---|---|---|---|---|---|'] : []),
    ...r.calls.map((x) => `| ${x.role} | ${x.model} | ${x.ok ? 'yes' : `no: ${cell(x.error ?? '')}`} | ${(x.ms / 1000).toFixed(1)} | ${x.usage.inputTokens} | ${x.usage.outputTokens} | ${x.usage.cacheReadTokens} | ${money(x.usage.costUsd)} |`),
    '',
    `Total estimated cost: ${money(r.usage.costUsd)} · ${(r.ms / 1000).toFixed(1)}s`,
  );
  if (r.failures.length) out.push('', '## What failed', '', ...r.failures.map((x) => `- ${x}`));
  return out.join('\n') + '\n';
}

export function traceLines(r: DResult): string {
  const lines: object[] = [
    { type: 'case', caseRef: r.caseRef, asOf: r.asOf, stage: r.stage },
    ...r.forced.map((t) => ({ type: 'trigger', ...t })),
    ...r.warnings.map((t) => ({ type: 'warning', ...t })),
    ...r.calls.map((x) => ({ type: 'model', ...x })),
    ...r.votes.map((v, i) => ({ type: 'vote', n: i + 1, proposal: v })),
    ...(r.supervision ? [{ type: 'supervision', ...r.supervision }] : []),
    ...r.refusals.map((x) => ({ type: 'refusal', ...x })),
    { type: 'decision', route: r.route, final: r.final, companion: r.companion, usage: r.usage, ms: r.ms, failures: r.failures },
  ];
  return lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
}

const quote = (s: string) => s.split('\n').map((l) => `> ${l}`).join('\n');
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

export function summaryLine(p: Proposal): string {
  return `${p.action}: ${p.explanation}`;
}
