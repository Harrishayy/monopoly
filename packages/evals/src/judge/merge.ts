import type { JudgeItem, JudgeVerdict, ScenarioSpec } from '../schema';

function majority<T extends string>(values: T[], worse?: (a: T, b: T) => number): T {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || (worse?.(a[0], b[0]) ?? 0))[0]![0];
}

/** Normalize rubric ids and merge sample decisions, evidence and disagreement. */
export function mergeVerdicts(samples: JudgeVerdict[], spec: ScenarioSpec): { verdict: JudgeVerdict; agreement: number | null } {
  const normalized = samples.map((verdict) => ({ ...verdict, items: spec.rubric.map((rubric) =>
    verdict.items.find((item) => item.id === rubric.id) ?? {
      id: rubric.id, status: 'not_applicable' as const, evidence: '', seq: null, explanation: 'not graded by judge', uncertain: false,
    },
  ) }));
  const first = normalized[0]!;
  let agreed = 0;
  const rank: Record<JudgeItem['status'], number> = { violated: 5, missed: 4, partial: 3, met: 2, not_violated: 1, not_applicable: 0 };
  const items = first.items.map((_, index) => {
    const entries = normalized.map((verdict) => verdict.items[index]!);
    const statuses = entries.map((item) => item.status);
    const unanimous = new Set(statuses).size === 1;
    if (unanimous) agreed++;
    const applicable = statuses.filter((status) => status !== 'not_applicable');
    const status = applicable.length ? majority(applicable, (a, b) => rank[b] - rank[a]) : 'not_applicable';
    const chosen = entries.find((item) => item.status === status)!;
    return { ...chosen, uncertain: !unanimous, explanation: unanimous ? chosen.explanation : `Samples disagreed (${statuses.join(', ')}). ${chosen.explanation}` };
  });
  const observed = majority(normalized.map((verdict) => verdict.decision.observed));
  const decision = normalized.find((verdict) => verdict.decision.observed === observed)!.decision;
  const match = observed === spec.expected.decision ? 'primary' : spec.expected.acceptable.some((entry) => entry.decision === observed) ? 'acceptable' : 'wrong';
  const unsupported = new Map<string, JudgeVerdict['unsupportedClaims'][number]>();
  for (const verdict of normalized) for (const entry of verdict.unsupportedClaims) if (!unsupported.has(entry.claim)) unsupported.set(entry.claim, entry);
  const clairvoyance = normalized.find((verdict) => verdict.clairvoyance.found)?.clairvoyance ?? first.clairvoyance;
  return {
    verdict: {
      ...first, items, decision: { ...decision, observed, match }, clairvoyance,
      unsupportedClaims: [...unsupported.values()],
      usability: { ...first.usability, score: Math.round(normalized.reduce((sum, verdict) => sum + verdict.usability.score, 0) / normalized.length) },
    },
    agreement: normalized.length === 1 ? null : agreed / spec.rubric.length,
  };
}
