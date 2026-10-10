import type { HumanDecision } from '@casework/core';
import { Icon, RelativeTime } from '@/ui';

/** Who decided what, when and why. Part of the audit trail. */
export function HumanDecisionRecord({ decision, optionLabel }: { decision: HumanDecision; optionLabel?: string }) {
  return (
    <div className="s-resolved grid grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-ui border border-(--c)/40 bg-(--c)/10 px-3 py-2.5 text-[13px]">
      <Icon name="check" size={14} className="mt-0.5 text-(--c)" />
      <div className="grid gap-0.5">
        <span>
          <b>{decision.decidedBy}</b> chose <b>{optionLabel ?? decision.optionId}</b>
        </span>
        {decision.note && <span className="text-ink-2 [overflow-wrap:anywhere]">“{decision.note}”</span>}
        <span className="font-mono text-[11px] text-ink-2">
          <RelativeTime at={decision.at} absolute /> · run {decision.runId.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}
