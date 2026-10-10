import 'server-only';
import { getPack } from '@casework/tracks';
import type { ToolHealth, ToolRegistry } from '@/lib/api-types';
import { ACTIVE_TRACK } from './config';
import { allRunRecords } from './runs';

/** Tools, policy rules and health from every run held in memory. */
export function toolRegistry(track = ACTIVE_TRACK): ToolRegistry {
  const pack = getPack(track);
  const records = allRunRecords().filter((r) => r.meta.track === pack.id);
  const health = (name: string): ToolHealth => {
    const calls = records.flatMap((r) => r.view.toolCalls.filter((c) => c.tool === name));
    const attempts = calls.flatMap((c) => c.attempts);
    const blocked = records.reduce((n, r) => n + r.view.blocked.filter((b) => b.action === name).length, 0);
    const failures = calls.filter((c) => c.status === 'failed').length;
    const timed = attempts.filter((a) => a.ms !== undefined);
    const lastError = [...attempts].reverse().find((a) => !a.ok)?.error;
    const recent = attempts.slice(-50).map((a) => ({ ok: a.ok, ms: a.ms }));
    const failRate = attempts.length ? attempts.filter((a) => !a.ok).length / attempts.length : 0;
    return {
      calls: calls.length,
      failures,
      blocked,
      recent,
      avgMs: timed.length ? timed.reduce((s, a) => s + a.ms!, 0) / timed.length : undefined,
      lastError,
      state: !attempts.length ? 'unused' : failRate >= 0.5 ? 'down' : failRate > 0.1 ? 'degraded' : 'healthy',
    };
  };
  return {
    tools: pack.tools.map((t) => ({
      name: t.name,
      description: t.description,
      effect: t.effect,
      recipient: t.recipient,
      rules: pack.policy.rules.filter((r) => r.appliesTo.includes(t.name) || r.appliesTo.includes('*')).map((r) => r.id),
      health: health(t.name),
    })),
    rules: pack.policy.rules.map(({ id, describe, appliesTo }) => ({ id, describe, appliesTo })),
    mustEscalate: pack.policy.mustEscalate,
    autonomy: pack.autonomy,
    model: { configured: !!process.env.ANTHROPIC_API_KEY, decide: process.env.MODEL_DECIDE ?? 'default' },
  };
}
