import type { Autonomy } from '../schema';
import type { AgentTool, Policy, ToolCall } from '../track';

export type GuardResult = { allow: true } | { allow: false; ruleId: string; why: string };

/**
 * Runs before every tool call. Prohibited actions are enforced here, not only in prompts.
 * A blocked call emits `action.blocked` and the model receives `why` as a tool error.
 */
export function guard(call: ToolCall, tool: AgentTool | undefined, policy: Policy, autonomy: Autonomy): GuardResult {
  if (!tool) return { allow: false, ruleId: 'core.unknown_tool', why: `No tool named ${call.tool}` };

  const parsed = tool.input.safeParse(call.args);
  if (!parsed.success) {
    return { allow: false, ruleId: 'core.invalid_args', why: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  if (tool.effect !== 'read' && autonomy === 'suggest') {
    return { allow: false, ruleId: 'core.autonomy_suggest', why: 'Autonomy is set to Suggest; only read-only tools may run' };
  }

  for (const rule of policy.rules) {
    if (!rule.appliesTo.includes(call.tool)) continue;
    const r = rule.check({ tool: call.tool, args: parsed.data });
    if (!r.ok) return { allow: false, ruleId: rule.id, why: r.why };
  }
  return { allow: true };
}
