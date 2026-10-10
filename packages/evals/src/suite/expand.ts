import type { ConcreteScenario, EvalSuite, RubricItem } from '../schema';

/** Expand authored bases, then perturbation groups, then escalation twins in order. */
export function expandScenarios(suite: EvalSuite): ConcreteScenario[] {
  const bases = new Map(suite.scenarios.map((spec) => [spec.id, spec]));
  const all: ConcreteScenario[] = suite.scenarios.map((spec) => {
    assertRubricIds(spec.id, spec.rubric);
    return { id: spec.id, baseId: spec.id, variant: 'base', spec, edits: [] };
  });
  for (const p of suite.perturbations) {
    for (const baseId of p.appliesTo) {
      const base = bases.get(baseId);
      if (!base) throw new Error(`Perturbation ${p.id} references unknown base scenario ${baseId}`);
      const id = `${baseId}~${p.id}`;
      const rubric = [...base.rubric.filter((item) => !p.dropRubric.includes(item.id)), ...p.rubric];
      assertRubricIds(id, rubric);
      all.push({
        id, baseId, variant: 'perturbed', perturbationId: p.id, edits: p.edits, planted: p.planted,
        spec: {
          ...base, id, title: `${base.title} · ${p.title}`, expected: p.expected ?? base.expected, rubric,
          hiddenFacts: [...base.hiddenFacts, ...p.hiddenFacts], faults: [...base.faults, ...p.faults],
          tags: [...new Set([...base.tags, ...p.tags, 'perturbed'])],
        },
      });
    }
  }
  for (const t of suite.escalationTwins) {
    const base = bases.get(t.scenario);
    if (!base) throw new Error(`Escalation twin references unknown base scenario ${t.scenario}`);
    const id = `${t.scenario}#esc`;
    all.push({
      id, baseId: t.scenario, variant: 'escalation', edits: [],
      escalation: { context: t.context, question: t.question },
      spec: { ...base, id, question: t.question ?? base.question, tags: [...new Set([...base.tags, 'escalation-format'])] },
    });
  }
  return all;
}

function assertRubricIds(scenarioId: string, rubric: RubricItem[]): void {
  const seen = new Set<string>();
  for (const item of rubric) {
    if (seen.has(item.id)) throw new Error(`Scenario ${scenarioId}: rubric item id collision: ${item.id}`);
    seen.add(item.id);
  }
}
