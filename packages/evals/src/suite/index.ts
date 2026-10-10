import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import { EvalSuite, type EvalSuiteInput, type ConcreteScenario, type SuiteName } from '../schema';

export { expandScenarios } from './expand';
export { validateSuite } from './validate';

/** Parse authored suite input, filling defaults and reporting every issue by path. */
export function loadSuite(input: EvalSuiteInput): EvalSuite {
  try {
    return EvalSuite.parse(input);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    const issues = error.issues.map((issue) => {
      const path = issue.path.reduce<string>((out, part) =>
        typeof part === 'number' ? `${out}[${part}]` : `${out}${out ? '.' : ''}${String(part)}`, '');
      return `${path || '<root>'}: ${issue.message}`;
    });
    throw new Error(`Invalid eval suite:\n${issues.join('\n')}`);
  }
}

/** Select concrete scenarios by split, or preserve the exact order of explicit ids. */
export function selectScenarios(all: ConcreteScenario[], suite: EvalSuite, sel: { suite: SuiteName; ids?: string[] }): ConcreteScenario[] {
  if (sel.ids !== undefined) {
    const byId = new Map(all.map((scenario) => [scenario.id, scenario]));
    const unknown = [...new Set(sel.ids.filter((id) => !byId.has(id)))];
    if (unknown.length) {
      const details = unknown.map((id) => {
        const matches = [...byId.keys()]
          .map((candidate, order) => ({ candidate, order, distance: editDistance(id, candidate) }))
          .sort((a, b) => a.distance - b.distance || a.order - b.order)
          .slice(0, 3).map(({ candidate }) => candidate);
        return `${id}${matches.length ? ` (close matches: ${matches.join(', ')})` : ''}`;
      });
      throw new Error(`Unknown scenario ids: ${details.join('; ')}`);
    }
    return sel.ids.map((id) => byId.get(id)!);
  }
  switch (sel.suite) {
    case 'all': return [...all];
    case 'robustness': return all.filter((scenario) => scenario.variant === 'perturbed');
    case 'escalation': return all.filter((scenario) => scenario.variant === 'escalation');
    case 'smoke':
    case 'holdout': {
      const ids = new Set(suite.splits[sel.suite]);
      return all.filter((scenario) => scenario.variant === 'base' && ids.has(scenario.id));
    }
    case 'dev': {
      const holdout = new Set(suite.splits.holdout);
      return all.filter((scenario) => scenario.variant === 'base' && !holdout.has(scenario.id));
    }
  }
}

/** Hash canonical suite content into a twelve-character rubric version. */
export function rubricVersion(suite: EvalSuite): string {
  const { scenarios, perturbations, escalationTwins, actionMap, splits, domainNotes, agentSenders } = suite;
  return createHash('sha256').update(JSON.stringify(canonical({
    scenarios, perturbations, escalationTwins, actionMap, splits, domainNotes, agentSenders,
  }))).digest('hex').slice(0, 12);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, entry]) => [key, canonical(entry)]));
  }
  return value;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length]!;
}
