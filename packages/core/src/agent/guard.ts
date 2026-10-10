import type { Autonomy } from '../schema';
import type { AgentTool, Policy, RuleContext, ToolCall } from '../track';

/** The checks `guard` runs, in order, in plain words (shown on the rules page). Keep in step with the function. */
export const GUARD_CHECKS: { id: string; describe: string }[] = [
  { id: 'core.unknown_tool', describe: 'The action must be a tool the pack defines.' },
  { id: 'core.invalid_args', describe: 'Its arguments must match the tool’s schema: message, reason, citations, confidence.' },
  { id: 'core.autonomy_suggest', describe: 'At Suggest autonomy only read-only tools run; every write waits for a person.' },
  { id: 'assessment.barred', describe: 'Actions the assessment bars right now are refused, unless the call cites a source that lifts the bar.' },
  { id: 'pack.policy', describe: 'Every pack policy rule that applies to the tool must pass.' },
];

export type GuardResult = { allow: true } | { allow: false; ruleId: string; why: string };

/**
 * Runs before every tool call. Prohibited actions are enforced here, not only in prompts.
 * A blocked call emits `action.blocked` and the model receives `why` as a tool error.
 * Order: known tool → valid args → autonomy → actions the assessment bars (unless the call cites a
 * source that lifts the bar) → pack policy rules.
 */
export function guard(
  call: ToolCall,
  tool: AgentTool | undefined,
  policy: Policy,
  autonomy: Autonomy,
  ctx: RuleContext,
): GuardResult {
  if (!tool) return { allow: false, ruleId: 'core.unknown_tool', why: `No tool named ${call.tool}` };

  const parsed = tool.input.safeParse(call.args);
  if (!parsed.success) {
    return { allow: false, ruleId: 'core.invalid_args', why: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }

  if (tool.effect !== 'read' && autonomy === 'suggest') {
    return { allow: false, ruleId: 'core.autonomy_suggest', why: 'Autonomy is set to Suggest; only read-only tools may run' };
  }

  const barred = ctx.assessment?.barred.find((b) => b.action === call.tool);
  if (barred) {
    const cited = (parsed.data as { citations?: unknown })?.citations;
    const lifted = Array.isArray(cited) && barred.unlessCites?.some((id) => cited.includes(id));
    if (!lifted) {
      const hint = barred.unlessCites?.length ? ' If one of these sources shows it is allowed, cite it: ' + barred.unlessCites.join(', ') : '';
      return { allow: false, ruleId: barred.ruleId, why: barred.why + hint };
    }
  }

  for (const rule of policy.rules) {
    if (!rule.appliesTo.includes(call.tool)) continue;
    const r = rule.check({ tool: call.tool, args: parsed.data }, ctx);
    if (!r.ok) return { allow: false, ruleId: rule.id, why: r.why };
  }
  return { allow: true };
}
