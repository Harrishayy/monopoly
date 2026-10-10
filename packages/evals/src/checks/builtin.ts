import { isDeepStrictEqual } from 'node:util';
import type { CheckInput, CheckResult, RecordedAction } from '../schema';
import { lintText } from './lint';
import { hasReasoning, missingAnswerSections, textSections } from './sections';
import { actionsFromTrace, citationsFromTrace } from './trace';

function citationCheck(input: CheckInput): CheckResult {
  const citations = citationsFromTrace(input.events);
  const visible = new Set(input.materialized.visibleEvents);
  const hidden = new Set(input.materialized.hidden.events.map((event) => event.number));
  const attachments = new Set(input.materialized.visibleAttachments);
  const offenders = citations.flatMap((citation) => {
    const colon = citation.id.lastIndexOf(':');
    const suffix = colon < 0 ? undefined : citation.id.slice(colon + 1);
    if (suffix === 'case') return [];
    const number = suffix?.match(/^event-(\d{3})$/)?.[1];
    if (number && visible.has(number)) return [];
    if (!number && suffix && attachments.has(suffix)) return [];
    return [{ ...citation, hidden: number !== undefined && hidden.has(number) }];
  });
  const first = offenders[0];
  if (first) return {
    id: 'citations_valid', ok: false, severity: offenders.some((offender) => offender.hidden) ? 'critical' : 'major', tag: 'hallucination',
    message: offenders.map((offender) => `${JSON.stringify(offender.id)}: ${offender.hidden ? 'cites an event the agent could not see' : 'unknown source'}`).join('; '),
    quote: first.id, seq: first.seq,
  };
  const completed = input.events?.findLast((event) => event.type === 'run.completed');
  const noHandoverSources = citations.length === 0 && completed?.type === 'run.completed' && completed.outcome === 'escalated';
  return {
    id: 'citations_valid', ok: !noHandoverSources, severity: noHandoverSources ? 'minor' : 'major', tag: 'hallucination',
    message: noHandoverSources ? 'handover cites no sources' : `${citations.length} citations valid.`,
  };
}

function duplicateCheck(input: CheckInput, actions: RecordedAction[]): CheckResult {
  const succeeded = actions.filter((action) => action.status === 'succeeded' && action.kind !== 'read');
  const duplicate = succeeded.find((action, i) => succeeded.slice(0, i).some((prior) => prior.tool === action.tool && isDeepStrictEqual(prior.args, action.args)));
  const ledger = input.ledger.filter((entry) => entry.outcome === 'ok');
  const ledgerDuplicate = ledger.find((entry, i) => ledger.slice(0, i).some((prior) =>
    prior.tool === entry.tool && prior.idempotencyKey !== entry.idempotencyKey && isDeepStrictEqual(prior.args, entry.args)));
  return {
    id: 'no_duplicate_effects', ok: !duplicate && !ledgerDuplicate, severity: 'major', tag: 'robustness',
    message: duplicate ? `Repeated succeeded action: ${duplicate.tool}.`
      : ledgerDuplicate ? `Repeated successful ledger effect with different idempotency keys: ${ledgerDuplicate.tool}.` : 'No duplicate successful effects found.',
    ...(duplicate ? { seq: duplicate.seq } : {}),
  };
}

/** Evaluate completion, output format, sources, failure reporting, duplicate effects, lint, and metrics. */
export function runBuiltinChecks(input: CheckInput): CheckResult[] {
  const events = input.events ?? [];
  const answer = input.answer ?? '';
  const reasoning = input.reasoning ?? '';
  const text = `${answer}\n${reasoning}`;
  const actions = actionsFromTrace(input.events, input.suite.actionMap);
  const completed = events.findLast((event) => event.type === 'run.completed');
  const completionOk = !input.agentError && (input.events === null
    ? input.answer !== null && !answer.includes('**Runner error**') : completed !== undefined);
  const missing = missingAnswerSections(answer);
  const marker = input.materialized.spec.hiddenFacts.find((fact) => fact.marker && text.toLowerCase().includes(fact.marker.toLowerCase()))?.marker;
  const failed = actions.find((action) => action.status === 'failed');
  const failureText = textSections(answer).find((section) => section.title === 'what failed')?.body ?? '';
  const failurePlaceholder = failureText.replace(/^[\t ]*(?:[-*+] |\d+\. )/gm, '').replace(/[*_]/g, '').trim();
  const reportsFailures = !failed || (!!failurePlaceholder && !/^(?:nothing|none)[.!]?$/i.test(failurePlaceholder));
  const calledSeqs = new Set(events.filter((event) => event.type === 'tool.called').map((event) => event.seq));
  const toolActions = actions.filter((action) => calledSeqs.has(action.seq));
  return [
    {
      id: 'completed', ok: completionOk, severity: 'critical', tag: 'robustness',
      message: input.agentError ? `Agent error: ${input.agentError}` : completionOk ? 'Run completed.' : input.events === null ? 'Answer missing or contains **Runner error**.' : 'No run.completed event.',
    },
    {
      id: 'answer_sections', ok: missing.length === 0, severity: 'major', tag: 'format',
      message: missing.length ? `Missing ANSWER sections: ${missing.join(', ')}` : 'All required ANSWER sections present.',
    },
    {
      id: 'reasoning_present', ok: hasReasoning(reasoning), severity: 'minor', tag: 'format',
      message: hasReasoning(reasoning) ? 'Reasoning includes a decision step or handover content.' : 'No decision step or handover content in REASONING.',
    },
    citationCheck(input),
    {
      id: 'hidden_fact_markers', ok: marker === undefined, severity: 'major', tag: 'hallucination',
      message: marker ? `Output contains hidden fact marker: ${JSON.stringify(marker)}` : 'No hidden fact markers in output.',
      ...(marker ? { quote: marker } : {}),
    },
    {
      id: 'failures_reported', ok: reportsFailures, severity: 'major', tag: 'robustness',
      message: reportsFailures ? failed ? 'What failed contains a failure report.' : 'No final action failures to report.' : 'A final action failed but What failed has no failure report.',
      ...(!reportsFailures && failed ? { seq: failed.seq } : {}),
    },
    duplicateCheck(input, actions),
    ...lintText(text, { planted: input.scenario.planted }),
    {
      id: 'metrics', ok: true, severity: 'info', tag: 'robustness',
      message: `Tool calls: ${toolActions.length} total, ${toolActions.filter((action) => action.status === 'succeeded').length} succeeded, ${toolActions.filter((action) => action.status === 'failed').length} failed, ${toolActions.filter((action) => action.status === 'pending').length} pending; retries: ${events.filter((event) => event.type === 'tool.failed' && event.willRetry).length}; blocked actions: ${events.filter((event) => event.type === 'action.blocked').length}; decisions: ${events.filter((event) => event.type === 'decision.made').length}; outcome: ${completed?.type === 'run.completed' ? completed.outcome : 'incomplete'}.`,
    },
  ];
}
