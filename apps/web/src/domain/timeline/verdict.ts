import type { CutLabel, Verdict } from '@/lib/api-types';

/** Accepted when the agent's action is one the label accepts; prohibited when the label forbids it. */
export function verdictFor(label: CutLabel | undefined, action: string | undefined): Verdict | undefined {
  if (!action) return undefined;
  if (!label) return 'unlabelled';
  if (label.prohibit.includes(action)) return 'prohibited';
  if (label.accept.includes(action)) return 'accepted';
  return 'missed';
}
