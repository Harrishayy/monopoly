import 'server-only';
import { GUARD_CHECKS } from '@casework/core/agent';
import { getPack } from '@casework/tracks';
import type { RulesReport } from '@/lib/api-types';
import { ACTIVE_TRACK } from './config';
import { AUTO_SEND, AUTO_SEND_MIN_CONFIDENCE, GATE_CONDITIONS, NO_OUTBOUND } from './live/intake';

/** Everything that stops or gates the agent, read from the code that enforces it. */
export function rulesReport(track = ACTIVE_TRACK): RulesReport {
  const pack = getPack(track);
  return {
    caseNoun: pack.vocabulary.case,
    autonomy: pack.autonomy,
    guard: GUARD_CHECKS,
    policy: pack.policy.rules.map(({ id, describe, appliesTo }) => ({ id, describe, appliesTo })),
    mustEscalate: pack.policy.mustEscalate,
    gate: { autoSend: [...AUTO_SEND], minConfidence: AUTO_SEND_MIN_CONFIDENCE, conditions: GATE_CONDITIONS },
    tools: pack.tools.map((t) => ({ name: t.name, recipient: t.recipient, effect: t.effect, autoSend: AUTO_SEND.has(t.name), internal: NO_OUTBOUND.has(t.name) })),
  };
}
