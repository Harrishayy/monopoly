import { renderLedger } from '../facts/ledger';
import { renderHandover } from '../stages/gate';
import type { CaseResult, Decision } from '../types';

const ACTION_WORDS: Record<string, string> = {
  send_message: 'Send a message',
  request_information: 'Request information',
  chase: 'Chase',
  wait: 'Wait',
  escalate_to_human: 'Escalate to a person',
  update_record: 'Update the record',
  close_case: 'Close the case',
  other: 'Other action',
};

const quote = (s: string) =>
  s
    .trim()
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');
const list = (xs: string[], empty = '- None.') => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : empty);
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Short quote of each cited item, so a reader can check the evidence without opening the case. */
function evidence(r: CaseResult): string {
  const c = r.caseFile;
  return list(
    r.final.citations.map((id) => {
      const e = c.events.find((x) => x.id === id);
      if (e) return `**${id}** · ${e.at?.slice(0, 16).replace('T', ' ') ?? 'undated'} · ${e.from ?? '?'} → ${e.to ?? '?'}: “${e.body.replace(/\s+/g, ' ').slice(0, 200)}${e.body.length > 200 ? '…' : ''}”`;
      const s = c.sections.find((x) => x.id === id);
      if (s) return `**${id}** · ${s.heading}: “${s.body.replace(/\s+/g, ' ').slice(0, 200)}${s.body.length > 200 ? '…' : ''}”`;
      const a = c.attachments.find((x) => x.id === id);
      return a ? `**${id}** · attachment ${a.name}` : `**${id}**`;
    }),
  );
}

function received(r: CaseResult): string {
  const c = r.caseFile;
  const unreadable = c.attachments.filter((a) => !a.text?.trim() && a.kind !== 'image');
  return list([
    `Case record: ${c.sections.map((s) => s.heading).join(', ') || 'no sections'}.`,
    `History: ${c.events.length} events${c.events.length ? ` (${c.events[0]!.id}–${c.events.at(-1)!.id})` : ''}, decision moment ${c.asOf.slice(0, 16).replace('T', ' ')}.`,
    `Attachments: ${c.attachments.map((a) => `${a.id} ${a.name} (${a.kind})`).join(', ') || 'none'}.`,
    ...(unreadable.length ? [`No readable text in: ${unreadable.map((a) => a.name).join(', ')}.`] : []),
    ...(c.withheld.length ? [`Withheld from the agent: ${c.withheld.join('; ')}.`] : []),
  ]);
}

/** The steps this answer records for the team, main action first. Nothing is sent from here. */
function actionsTaken(d: CaseResult['final']): string {
  if (d.action === 'escalate_to_human') return '- None with any outside party. The case is handed to a person (see Escalated).';
  const steps: string[] = [];
  if (d.action === 'wait') steps.push(`1. **Hold** (\`${d.domainAction ?? 'wait'}\`) until ${d.followUpBy || 'the follow-up date'}. What to check then:`, '', quote(d.message || '(none)'));
  else steps.push(`1. **${d.actionLabel}** (\`${d.domainAction ?? d.action}\`) → ${d.recipient || '—'} via ${d.channel || '—'}:`, '', quote(d.message || '(none)'));
  (d.alsoSend ?? []).forEach((m, i) => steps.push('', `${i + 2}. Same turn (\`${m.domainAction ?? 'message'}\`) → ${m.recipient} via ${m.channel || '—'}:`, '', quote(m.message)));
  steps.push('', '_Recorded for the team to send; no live channel is connected, so nothing has been delivered._');
  return steps.join('\n');
}

function actionsRefused(r: CaseResult): string {
  const d = r.final;
  const items = [
    ...d.alternatives.map((a) => `${a.action}: ${a.whyNot}`),
    ...(d.decidedBy === 'gate' ? [`The proposed action was overruled by a rule check: ${d.gateRule}.`] : []),
  ];
  return list(items);
}

function escalated(d: CaseResult['final']): string {
  if (d.action !== 'escalate_to_human') return 'No.';
  const h = d.handover;
  if (!h || d.decidedBy !== 'model') return [`Yes, to ${d.recipient}.`, '', quote(d.message)].join('\n');
  return [
    `Yes, to ${d.recipient}.`, '',
    `**Why a person is needed:** ${h.blocking}`, '',
    `**Summary:** ${h.summary}`, '',
    '**Done so far:**', list(h.done), '',
    '**Options:**', list(h.options.map((o) => `${o.option}. Risk: ${o.risk}`)), '',
    `**Recommended:** ${h.recommendation}`,
  ].join('\n');
}

export function renderAnswer(r: CaseResult): string {
  const d = r.final;
  const c = r.caseFile;
  const out: string[] = [];
  out.push(`# ${/^case\b/i.test(c.title) ? c.title : `Case ${c.name}: ${c.title}`}`, '');
  out.push(`**Next action:** ${d.actionLabel}`, '');
  out.push('| Action | Recipient | Channel | Confidence | Decided by |', '|---|---|---|---|---|');
  out.push(`| ${ACTION_WORDS[d.action] ?? d.action} (\`${d.action}\`) | ${cell(d.recipient || '—')} | ${cell(d.channel || '—')} | ${Math.round(d.confidence * 100)}% | ${d.decidedBy}${d.decidedBy === 'model' ? '' : ` (${cell(d.gateRule)})`} |`, '');
  out.push('## What the system received', '', received(r), '');
  out.push('## Actions taken', '', actionsTaken(d), '');
  out.push('## Actions refused', '', actionsRefused(r), '');
  out.push('## Escalated', '', escalated(d), '');
  const problems = [...r.failures, ...c.anomalies.map((a) => `Ingest: ${a}`)];
  out.push('## What failed', '', list(problems, '- Nothing failed.'), '');
  out.push('## Final result', '', `${d.expectedOutcome || d.actionLabel}`, '');
  if (d.followUpBy) out.push(`**Follow up by:** ${d.followUpBy}`, '');
  out.push('### Why', '', d.rationale, '');
  out.push('### Boundaries (what this does not prove or settle)', '', list(d.boundaries), '');
  out.push('### Remaining work', '', list(d.remainingWork), '');
  if (d.assumptions.length) out.push('### Assumptions', '', list(d.assumptions), '');
  out.push('### Evidence', '', evidence(r), '');
  out.push('---', '', `Generated by agent-b on ${r.startedAt.slice(0, 19).replace('T', ' ')} UTC from \`${c.dir.split(/[\\/]/).slice(-2).join('/')}\`. Full reasoning in REASONING.md, trace in trace.jsonl.`);
  return out.join('\n') + '\n';
}

function sampleRow(s: Decision, i: number): string {
  return `| ${i + 1} | \`${s.action}\` | ${cell(s.recipient || '—')} | ${cell(s.channel || '—')} | ${Math.round(s.confidence * 100)}% | ${cell(s.actionLabel)} |`;
}

export function renderReasoning(r: CaseResult): string {
  const c = r.caseFile;
  const s = r.situation;
  const d = r.final;
  const out: string[] = [];
  out.push(`# Reasoning: case ${c.name}`, '');

  out.push('## 1. What the system received', '');
  out.push(`- Folder: \`${c.dir.split(/[\\/]/).slice(-2).join('/')}\` · track detected: **${c.track}**`);
  out.push(`- Case record sections: ${c.sections.map((x) => `${x.heading} (${x.id})`).join(', ') || 'none'}`);
  out.push(`- History: ${c.events.length} events${c.events.length ? ` (${c.events[0]!.id}–${c.events.at(-1)!.id})` : ''}; decision moment ${c.asOf}`);
  out.push(`- Attachments: ${c.attachments.map((a) => `${a.id} ${a.name} (${a.kind})`).join(', ') || 'none'}`);
  out.push(`- Withheld from the agent: ${c.withheld.length ? '' : 'nothing'}`);
  for (const w of c.withheld) out.push(`  - ${w}`);
  out.push(`- Ingest notes: ${c.anomalies.length ? '' : 'none'}`);
  for (const a of c.anomalies) out.push(`  - ${a}`);
  out.push('');

  out.push('## 2. Computed facts (code, no model)', '', '```', renderLedger(r.ledger), '```', '');

  out.push('## 3. Situation (model reading)', '');
  if (!s) out.push('Not available (the stage failed; see Failures and fallbacks).', '');
  else {
    out.push(`**Task:** ${s.task}  `, `**Stage:** ${s.stage} (${s.stageLabel})  `, `**Waiting on:** ${s.whoseMove}`, '', s.summary, '');
    if (s.parties.length) out.push('**Parties**', list(s.parties.map((p) => `${p.name}: ${p.role}. Authority: ${p.authority}`)), '');
    if (s.openAsks.length) out.push('**Requests**', list(s.openAsks.map((a) => `${a.from} → ${a.to}: ${a.ask} — ${a.answered ? 'answered' : 'UNANSWERED'}${a.promisedReplyBy ? ` (promised by ${a.promisedReplyBy})` : ''} [${a.citations.join(', ')}]`)), '');
    if (s.conflicts.length) out.push('**Conflicts**', list(s.conflicts.map((x) => `${x.description} [${x.citations.join(', ')}]`)), '');
    if (s.missing.length) out.push('**Missing**', list(s.missing.map((x) => `${x.what} (from ${x.whoCanSupply}; ${x.safeToInfer ? 'safe to infer' : 'must ask'})`)), '');
    if (s.failures.length) out.push('**Failed actions**', list(s.failures.map((x) => `${x.description} [${x.citations.join(', ')}]`)), '');
    if (s.risks.length) out.push('**Risks**', list(s.risks.map((x) => `${x.severity} ${x.kind}: ${x.description} [${x.citations.join(', ')}]`)), '');
    if (s.noise.length) out.push('**Treated as noise**', list(s.noise.map((x) => `${x.id}: ${x.why}`)), '');
    if (s.injection.length) out.push('**Instructions found inside case content (ignored)**', list(s.injection.map((x) => `${x.id}: “${x.text}”`)), '');
  }

  out.push('## 4. Independent proposals', '');
  if (r.samples.length) {
    out.push('| # | Action | Recipient | Channel | Confidence | Label |', '|---|---|---|---|---|---|', ...r.samples.map(sampleRow), '');
  } else out.push('None (the decide stage did not run or failed).', '');

  out.push('## 5. Checks and review', '');
  out.push('**Rule checks on the final candidate**', list(r.hardIssues.map((i) => `${i.severity} [${i.rule}] ${i.detail}`), '- All passed.'), '');
  r.critiques.forEach((cr, i) => {
    out.push(`**Review ${i + 1}${i === 1 ? ' (after revision)' : ''}: ${cr.verdict}**`, list(cr.problems.map((p) => `${p.severity}: ${p.issue}`), '- No problems raised.'));
    if (cr.escalationReason) out.push(`- Escalation reason: ${cr.escalationReason}`);
    out.push('');
  });
  out.push(`Revised after review: ${r.revised ? 'yes' : 'no'}`, '');

  out.push(`## Decision 1: ${d.actionLabel}`, '');
  out.push(`- **${d.domainAction ?? d.action}** → ${d.recipient || '—'} via ${d.channel || '—'}`);
  for (const m of d.alsoSend ?? []) out.push(`- Same turn: **${m.domainAction ?? 'message'}** → ${m.recipient} via ${m.channel || '—'}`);
  out.push(`- Citations: ${d.citations.join(', ') || 'none'}`);
  out.push(`- Gate rule: ${d.gateRule}`);
  out.push(`- Agreement with independent proposals: ${Math.round(d.agreement * 100)}% · confidence ${Math.round(d.confidence * 100)}% · decided by ${d.decidedBy}`);
  out.push(`- Rationale: ${d.rationale}`);
  if (d.alternatives.length) out.push('- Alternatives considered:', ...d.alternatives.map((a) => `  - ${a.action}: ${a.whyNot}`));
  out.push('');
  if (d.action === 'escalate_to_human' && d.handover) out.push('## Handover', '', renderHandover(d.handover), '');

  out.push('## Failures and fallbacks', '', list(r.failures, '- None.'), '');
  out.push('## Model calls', '');
  if (r.calls.length) {
    out.push('| Stage | Model | OK | ms | In | Out | Cache read | Request |', '|---|---|---|---|---|---|---|---|');
    for (const k of r.calls) out.push(`| ${k.stage} | ${k.model} | ${k.ok ? 'yes' : `no: ${cell(k.error ?? '')}`} | ${k.ms} | ${k.inputTokens ?? ''} | ${k.outputTokens ?? ''} | ${k.cacheReadTokens ?? ''} | ${k.requestId ?? ''} |`);
  } else out.push('None.');
  out.push('', `Total time: ${(r.ms / 1000).toFixed(1)} s`);
  return out.join('\n') + '\n';
}

/** One JSON line per stage, for replay and audit. */
export function traceLines(r: CaseResult): string {
  const lines: object[] = [
    { stage: 'ingest', at: r.startedAt, case: r.caseFile.name, track: r.caseFile.track, events: r.caseFile.events.length, attachments: r.caseFile.attachments.map((a) => ({ id: a.id, name: a.name, kind: a.kind })), withheld: r.caseFile.withheld, anomalies: r.caseFile.anomalies },
    { stage: 'ledger', ledger: r.ledger },
    { stage: 'situate', situation: r.situation ?? null },
    ...r.samples.map((s, i) => ({ stage: 'decide', sample: i + 1, decision: s })),
    { stage: 'check', issues: r.hardIssues },
    ...r.critiques.map((c, i) => ({ stage: 'critic', round: i + 1, critique: c })),
    { stage: 'gate', final: r.final },
    { stage: 'calls', calls: r.calls },
    { stage: 'done', ms: r.ms, failures: r.failures },
  ];
  return lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
}
