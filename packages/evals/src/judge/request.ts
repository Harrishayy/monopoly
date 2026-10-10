import type { RunEvent } from '@casework/core';
import type { JudgeInput, JudgeOptions, JudgeRequest, RawEvent } from '../schema';
import { JUDGE_SYSTEM_PROMPT } from './prompt';

function hiddenEvent(event: RawEvent): string {
  const field = (key: string) => event.fields.find((entry) => entry.key.toLowerCase() === key)?.value ?? '(unknown)';
  return `event ${event.number} · ${event.at} · ${field('channel')} · ${field('from')} → ${field('to')}\n${event.body}`;
}

function compact(value: unknown): string {
  try { return JSON.stringify(value) ?? '(missing)'; } catch { return '(unserializable)'; }
}

function trace(events: RunEvent[] | null): string {
  if (events === null) return '(missing)';
  const calls = new Map(events.filter((event) => event.type === 'tool.called').map((event) => [event.callId, event]));
  const statuses = new Map<string, string>();
  for (const event of events) {
    if (event.type === 'tool.succeeded') statuses.set(event.callId, 'succeeded');
    if (event.type === 'tool.failed') statuses.set(event.callId, event.willRetry ? 'retrying' : 'failed');
  }
  const lines = events.map((event) => {
    let detail: string;
    switch (event.type) {
      case 'run.started': detail = `case=${event.caseRef} autonomy=${event.autonomy}`; break;
      case 'step.read': detail = `${event.summary} sources=${compact(event.sourceIds)}`; break;
      case 'tool.called': detail = `${event.tool} call=${event.callId} args=${compact(event.args)} status=${statuses.get(event.callId) ?? 'pending'}`; break;
      case 'tool.succeeded': detail = `${calls.get(event.callId)?.tool ?? '(unknown tool)'} call=${event.callId} status=succeeded result=${compact(event.result)} ms=${event.ms}`; break;
      case 'tool.failed': detail = `${calls.get(event.callId)?.tool ?? '(unknown tool)'} call=${event.callId} status=failed error=${event.error} attempt=${event.attempt} willRetry=${event.willRetry}`; break;
      case 'action.blocked': detail = `${event.action} rule=${event.ruleId} why=${event.why}`; break;
      case 'decision.made': detail = `${event.label} rationale=${event.rationale} confidence=${event.confidence} citations=${compact(event.citations)}`; break;
      case 'case.assessed': detail = `stage=${event.assessment.stage} waiting=${event.assessment.waitingOn?.party ?? 'none'} flags=${compact(event.assessment.flags.map((flag) => flag.id))}`; break;
      case 'next.proposed': detail = `action=${event.next.action} to=${event.next.recipient} by=${event.next.decidedBy} confidence=${event.next.confidence}`; break;
      case 'escalation.created': detail = `reason=${event.handover.reason} queue=${event.handover.queue} facts=${compact(event.handover.facts)} handover=${compact(event.handover)}`; break;
      case 'run.completed': detail = `outcome=${event.outcome} summary=${event.summary}`; break;
    }
    return `${event.seq} · ${event.type} · ${detail.replace(/[\r\n]+/g, '\\n')}`;
  }).join('\n');
  const marker = '\n(trace truncated)';
  return lines.length > 12000 ? lines.slice(0, 12000 - marker.length) + marker : lines || '(empty)';
}

/** Build stable context and verbatim run outputs for one grading sample. */
export function buildJudgeRequest(input: JudgeInput, opts: Pick<JudgeOptions, 'model' | 'effort'>, sample = 0): JudgeRequest {
  const { spec, hidden } = input.materialized;
  const context = [
    `## Domain notes\n${input.suite.domainNotes}`,
    `## Role labels\n${Object.entries(input.suite.roles).map(([role, label]) => `${role}: ${label}`).join('\n')}`,
    `## Scenario\nid: ${input.scenario.id}\nvariant: ${input.scenario.variant}\ntitle: ${spec.title}\nquestion: ${spec.question ?? '(none)'}`,
    `## Visible case (what the agent saw)\n${input.materialized.visibleText}`,
    `## Reference continuation (not visible to the agent)\n${hidden.events.map(hiddenEvent).join('\n\n') || '(none)'}`,
    `### Hidden attachments\n${hidden.attachments.map((attachment) => `${attachment.fileName}\n${attachment.text?.slice(0, 3000) ?? '(unreadable)'}`).join('\n\n') || '(none)'}`,
    `### Removed sections\n${hidden.removedSections.map((section) => `${section.heading}\n${section.body}`).join('\n\n') || '(none)'}`,
    `### Removed details\n${hidden.removedDetails.map((entry) => `${entry.key}: ${entry.value}`).join('\n') || '(none)'}`,
    `## Hidden facts\n${spec.hiddenFacts.map((fact) => `${fact.text}${fact.marker ? ` (marker: ${fact.marker})` : ''}`).join('\n') || '(none)'}`,
    `## Expected decision\n${spec.expected.decision}\n${spec.expected.summary}\nAcceptable alternatives:\n${spec.expected.acceptable.map((entry) => `${entry.decision}: ${entry.summary}`).join('\n') || '(none)'}`,
    `## historyDeviates\n${spec.historyDeviates ?? '(none)'}`,
    `## Rubric\n${spec.rubric.map((item) => `${item.id} · ${item.kind} · ${item.tag} · ${item.weight ?? ({ required: 3, positive: 1, red_flag: 2, prohibited: 3, critical: 5 }[item.kind])} · ${item.appliesTo?.join(', ') ?? 'all'} · has-check: ${Boolean(item.check)}\n${item.text}\nEvidence: ${item.evidence.join(', ') || '(none)'}`).join('\n\n')}`,
  ].join('\n\n');
  const output = [
    `## ANSWER.md\n${input.answer ?? '(missing)'}`,
    `## REASONING.md\n${input.reasoning ?? '(missing)'}`,
    `## Trace\n${trace(input.events)}`,
    `## Deterministic checks\n${input.checks.map((check) => `${check.id} · ${check.ok ? 'ok' : 'FAIL'} · ${check.severity} · ${check.tag} · ${check.message}`).join('\n') || '(none)'}`,
  ].join('\n\n');
  return { system: JUDGE_SYSTEM_PROMPT, context, output, model: opts.model, effort: opts.effort, sample };
}
