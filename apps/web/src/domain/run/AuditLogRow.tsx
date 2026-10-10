import type { HumanDecision, RunEvent } from '@casework/core';
import { RelativeTime } from '@/ui';

function describe(e: RunEvent): string {
  switch (e.type) {
    case 'run.started': return `Run started for ${e.caseRef} (autonomy: ${e.autonomy.replace('_', ' ')})`;
    case 'step.read': return `Read ${e.sourceIds.length} sources. ${e.summary}`;
    case 'case.assessed': return `Assessed: ${e.assessment.stage}`;
    case 'tool.called': return `Called ${e.tool}`;
    case 'tool.succeeded': return `Tool call ${e.callId.slice(0, 8)} succeeded in ${Math.round(e.ms)}ms`;
    case 'tool.failed': return `Tool call ${e.callId.slice(0, 8)} failed (attempt ${e.attempt}): ${e.error}`;
    case 'action.blocked': return `Refused ${e.action} (${e.ruleId}): ${e.why}`;
    case 'decision.made': return `Decided ${e.label} at ${Math.round(e.confidence * 100)}% confidence`;
    case 'next.proposed': return `Proposed ${e.next.action} → ${e.next.recipient}`;
    case 'escalation.created': return `Handed to ${e.handover.queue}: ${e.handover.reason}`;
    case 'run.completed': return `Completed: ${e.outcome}. ${e.summary}`;
  }
}

/** One read-only line in the audit log: a run event or a person's decision. */
export function AuditLogRow({ event }: { event: RunEvent | HumanDecision }) {
  const isHuman = !('type' in event);
  return (
    <li className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-3 border-b-(length:--bw) border-line py-1.5 text-[12.5px] last:border-b-0">
      <span className="font-mono text-[11px] text-ink-2">
        <RelativeTime at={event.at} absolute />
        <span className="block">{isHuman ? 'human.decided' : event.type}</span>
      </span>
      <span className="[overflow-wrap:anywhere]">
        {isHuman ? `${event.decidedBy} chose ${event.optionId}${event.note ? `: “${event.note}”` : ''}` : describe(event)}
      </span>
    </li>
  );
}
