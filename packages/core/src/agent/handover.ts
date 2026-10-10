import type { Assessment, Case, Handover } from '../schema';

export interface HandoverInput {
  reason: string;
  queue?: string;
  options?: string[];
  confidence?: number;
  citations?: string[];
  tried: { text: string; ok: boolean }[];
  refused: { action: string; ruleId: string }[];
}

/**
 * Everything a person needs to pick the job up. Facts must cite sources that exist in the case;
 * anything else is dropped rather than shown as evidence.
 */
export function buildHandover(c: Case, assessment: Assessment | undefined, input: HandoverInput): Handover {
  const known = new Set(c.sources.map((s) => s.id));
  const facts: Handover['facts'] = [];
  for (const f of [...(assessment?.flags ?? []), ...(assessment?.facts ?? [])]) {
    const sourceId = f.sourceIds.find((id) => known.has(id));
    if (sourceId && !facts.some((x) => x.text === f.text)) facts.push({ text: f.text, sourceId });
  }
  for (const id of input.citations ?? []) {
    const s = c.sources.find((x) => x.id === id);
    if (s && !facts.some((x) => x.sourceId === id)) facts.push({ text: `See ${s.title}`, sourceId: id });
  }
  if (!facts.length) facts.push({ text: c.title, sourceId: c.sources[0]?.id ?? `${c.ref}:case` });

  const options = (input.options?.length ? input.options : ['Review the job and choose the next step']).map((label, i) => ({
    id: `opt-${i + 1}`,
    label,
    effect: 'pauses' as const,
    recommended: i === 0,
  }));

  return {
    reason: input.reason,
    facts: facts.slice(0, 12),
    tried: input.tried,
    options,
    refused: input.refused,
    confidence: input.confidence ?? 0.5,
    queue: input.queue ?? 'Case handler',
  };
}
