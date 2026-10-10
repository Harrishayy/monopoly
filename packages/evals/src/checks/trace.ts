import type { RunEvent } from '@casework/core';
import type { ActionMapEntry, RecordedAction } from '../schema';
import { classifyTool, readPath } from './classify';

/** Pair calls with later results in stream order, preserving retries and synthetic escalations. */
export function actionsFromTrace(events: RunEvent[] | null, actionMap: ActionMapEntry[]): RecordedAction[] {
  const actions: RecordedAction[] = [];
  const byId = new Map<string, RecordedAction>();
  for (const event of events ?? []) {
    if (event.type === 'tool.called') {
      const entry = classifyTool(event.tool, actionMap);
      const amount = readPath(event.args, entry.amountPath);
      const to = entry.to ?? (entry.toPath
        ? entry.toRoles?.[String(readPath(event.args, entry.toPath)).toLowerCase()] ?? 'unknown'
        : undefined);
      const action: RecordedAction = {
        callId: event.callId, seq: event.seq, tool: event.tool, kind: entry.kind,
        args: event.args, status: 'pending', attempts: 0,
        ...(to === undefined ? {} : { to }),
        ...(typeof amount === 'number' && Number.isInteger(amount) ? { amountPence: amount } : {}),
        text: entry.textPaths.map((path) => readPath(event.args, path)).join('\n'),
      };
      actions.push(action);
      byId.set(event.callId, action);
    } else if (event.type === 'tool.succeeded' || event.type === 'tool.failed') {
      const action = byId.get(event.callId);
      if (!action) continue;
      if (event.type === 'tool.succeeded') {
        if (action.status !== 'succeeded') action.attempts++;
        action.status = 'succeeded';
      } else {
        action.attempts++;
        if (!event.willRetry && action.status !== 'succeeded') action.status = 'failed';
      }
    } else if (event.type === 'escalation.created') {
      actions.push({
        callId: `escalation-${event.seq}`, seq: event.seq, tool: event.type, kind: 'escalate',
        args: event.handover, status: 'succeeded', attempts: 1, text: event.handover.reason,
      });
    }
  }
  return actions;
}

function compact(value: unknown): string {
  return (JSON.stringify(value) ?? String(value)).replace(/\s*[\r\n]+\s*/g, ' ');
}

function eventLine(event: RunEvent): string {
  let detail: string;
  switch (event.type) {
    case 'run.started': detail = `${event.caseRef} autonomy=${event.autonomy}`; break;
    case 'step.read': detail = `${event.sourceIds.join(', ')} ${event.summary}`; break;
    case 'tool.called': detail = `${event.tool} call=${event.callId} ${compact(event.args)}`; break;
    case 'tool.succeeded': detail = `call=${event.callId} result=${compact(event.result)} (${event.ms}ms)`; break;
    case 'tool.failed': detail = `call=${event.callId} error=${event.error} attempt=${event.attempt} retry=${event.willRetry}`; break;
    case 'action.blocked': detail = `${event.action} rule=${event.ruleId} ${event.why}`; break;
    case 'decision.made': detail = `${event.label} confidence=${event.confidence} ${event.rationale} citations=${event.citations.join(', ')}`; break;
    case 'case.assessed': detail = `stage=${event.assessment.stage} waiting=${event.assessment.waitingOn?.party ?? 'none'} flags=${event.assessment.flags.map((flag) => flag.id).join(', ')}`; break;
    case 'next.proposed': detail = `${event.next.action} to=${event.next.recipient} by=${event.next.decidedBy} confidence=${event.next.confidence}`; break;
    case 'escalation.created': detail = `${event.handover.queue}: ${event.handover.reason}`; break;
    case 'run.completed': detail = `${event.outcome}: ${event.summary}`; break;
  }
  return `#${event.seq} ${event.type} ${detail}`.replace(/\s*[\r\n]+\s*/g, ' ');
}

/** Render one compact line per event, reserving space for an omitted-event count. */
export function condenseTrace(events: RunEvent[] | null, maxChars = 6000): string {
  const lines = (events ?? []).map(eventLine);
  const budget = Math.max(0, Math.floor(maxChars));
  const full = lines.join('\n');
  if (full.length <= budget) return full;
  let prefix = '';
  for (let count = 0; count < lines.length; count++) {
    const next = prefix ? `${prefix}\n${lines[count]}` : lines[count]!;
    const remaining = lines.length - count - 1;
    const suffix = remaining ? `\n… (+${remaining} more events)` : '';
    if (next.length + suffix.length > budget) {
      const marker = `… (+${lines.length - count} more events)`;
      return (prefix ? `${prefix}\n${marker}` : marker).slice(0, budget);
    }
    prefix = next;
  }
  return prefix;
}

/** Match event, case/index, or attachment references by loader suffix; otherwise match exactly. */
export function sourceRefMatches(sourceId: string, ref: string): boolean {
  if (/^event-\d{3}$/.test(ref)) return sourceId.endsWith(`:${ref}`);
  if (ref === 'case' || ref.startsWith('index:')) return sourceId.endsWith(':case');
  if (ref && !ref.includes(':') && sourceId.endsWith(`:${ref}`)) return true;
  return sourceId === ref;
}

/** Collect decision and handover citations, retaining their event sequence for diagnostics. */
export function citationsFromTrace(events: RunEvent[] | null): { id: string; seq: number }[] {
  return (events ?? []).flatMap((event) => {
    const ids = event.type === 'decision.made' ? event.citations
      : event.type === 'escalation.created' ? event.handover.facts.map((fact) => fact.sourceId) : [];
    return ids.map((id) => ({ id, seq: event.seq }));
  });
}
