import { Icon } from '@/ui';

/** An action the agent refused, and the rule that stopped it. */
export function BlockedAction({ action, ruleId, why, heading = 'Blocked by policy' }: { action: string; ruleId: string; why?: string; heading?: string }) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-ui border border-dashed border-line-strong px-3 py-2.5 text-[12.5px] text-ink-2">
      <Icon name="blocked" size={14} className="mt-0.5 text-bad" />
      <div className="grid gap-0.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[.08em] text-bad">{heading}</span>
        <s className="font-mono text-ink decoration-bad decoration-2 [overflow-wrap:anywhere]">{action}</s>
        {why && <span className="[overflow-wrap:anywhere]">{why}</span>}
        <span className="font-mono text-[11px]">{ruleId}</span>
      </div>
    </div>
  );
}
