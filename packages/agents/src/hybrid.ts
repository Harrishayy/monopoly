import { basename } from 'node:path';
import type { Assessment } from '@casework/core';
import { load } from './a';

/**
 * Agent A's deterministic assessment, rendered as advice for agent B. Nothing here blocks an action:
 * B's own checks stay the only hard rules. Source ids are rewritten to B's citation ids (E012, A1).
 */
export async function assessmentHint(input: { dir: string; track: string; cutBefore?: number; asOf?: string }): Promise<string> {
  const { c, pack } = await load({ ...input, withhold: 'outcomes' });
  if (!pack.assess) return '';
  const a: Assessment = pack.assess(c, input.asOf ? { asOf: input.asOf } : {});
  const ids = (xs: string[] = []) => xs.map((x) => x.replace(/^.*:event-(\d+)$/, (_, n) => `E${n.padStart(3, '0')}`).replace(/^.*:case$/, 'S:case-record')).join(', ');
  const out = [`Stage (rules): ${a.stage}`];
  if (a.waitingOn) out.push(`Waiting on: ${a.waitingOn.party} since ${a.waitingOn.since.slice(0, 10)} [${ids(a.waitingOn.sourceIds)}]`);
  if (a.facts.length) out.push('Facts the rules found:', ...a.facts.map((f) => `- ${f.text} [${ids(f.sourceIds)}]`));
  if (a.flags.length) out.push('Flags:', ...a.flags.map((f) => `- ${f.text}${f.mustEscalate ? ' (rules say escalate)' : ''} [${ids(f.sourceIds)}]`));
  if (a.suggested.length) out.push('Playbook suggestions, best first:', ...a.suggested.map((s) => `- ${s.action}: ${s.why}`));
  if (a.barred.length) out.push('Actions the rules consider wrong right now (advice, check against the records):', ...a.barred.map((b) => `- ${b.action}: ${b.why}`));
  if (a.noise.length) out.push('Treated as noise by the rules:', ...a.noise.map((n) => `- ${ids([n.sourceId])}: ${n.why}`));
  return out.join('\n');
}

export const caseName = (dir: string) => basename(dir);
