import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { EvalSuite, ScenarioSpec, SuiteValidation } from '../schema';
import { expandScenarios } from './expand';

interface CaseProbe {
  index: string;
  events: Map<string, string>;
  attachments: Set<string>;
}

/** Check authored references and effective rubrics against case files without materializing. */
export async function validateSuite(suite: EvalSuite, dataDir: string): Promise<SuiteValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bases = new Map(suite.scenarios.map((spec) => [spec.id, spec]));
  const seen = new Set<string>();
  for (const spec of suite.scenarios) {
    if (seen.has(spec.id)) errors.push(`Duplicate scenario id: ${spec.id}`);
    seen.add(spec.id);
  }
  const probes = new Map<string, CaseProbe>();
  for (const folder of new Set(suite.scenarios.map((spec) => spec.case))) {
    const dir = join(dataDir, suite.trackFolder, folder);
    try {
      if (!(await stat(dir)).isDirectory()) throw new Error('Not a directory');
    } catch {
      errors.push(`Case folder missing: ${dir}`);
      continue;
    }
    try {
      probes.set(folder, await probeCase(dir));
    } catch (error) {
      errors.push(`Could not read case ${folder}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const spec of suite.scenarios) validateSpec(spec, probes.get(spec.case), errors, warnings);

  for (const p of suite.perturbations) {
    if (p.rubric.length === 0 && p.expected === undefined) {
      warnings.push(`Perturbation ${p.id} has no rubric items and no expected override`);
    }
    for (const id of p.appliesTo) {
      const base = bases.get(id);
      if (!base) {
        errors.push(`Perturbation ${p.id} appliesTo references unknown base scenario ${id}`);
        continue;
      }
      const probe = probes.get(base.case);
      for (const [i, edit] of p.edits.entries()) {
        const number = edit.op === 'insert_event' ? edit.before
          : edit.op === 'remove_event' || edit.op === 'replace_text' ? edit.number : undefined;
        if (number === undefined) continue;
        if (Number(number) > Number(base.cutAfter)) {
          errors.push(`Perturbation ${p.id} edit ${i} for ${id}: event ${number} is after cutAfter ${base.cutAfter}`);
        }
        if (probe && !probe.events.has(number)) {
          errors.push(`Perturbation ${p.id} edit ${i} for ${id}: event ${number} does not exist in case ${base.case}`);
        }
      }
      validateSpec({
        ...base, id: `${id}~${p.id}`,
        rubric: [...base.rubric.filter((item) => !p.dropRubric.includes(item.id)), ...p.rubric],
        hiddenFacts: [...base.hiddenFacts, ...p.hiddenFacts],
      }, probe, errors, warnings);
    }
  }
  for (const twin of suite.escalationTwins) {
    if (!bases.has(twin.scenario)) errors.push(`Escalation twin references unknown base scenario ${twin.scenario}`);
  }
  for (const split of ['smoke', 'holdout'] as const) {
    for (const id of suite.splits[split]) {
      if (!bases.has(id)) errors.push(`Split ${split} references unknown or non-base scenario ${id}`);
    }
  }
  const overlap = [...new Set(suite.splits.smoke.filter((id) => suite.splits.holdout.includes(id)))];
  if (overlap.length) errors.push(`Smoke and holdout splits overlap: ${overlap.join(', ')}`);
  const tools = new Set<string>();
  for (const entry of suite.actionMap) {
    if (tools.has(entry.tool)) errors.push(`Duplicate actionMap tool: ${entry.tool}`);
    tools.add(entry.tool);
  }
  try {
    const expanded = expandScenarios(suite);
    const ids = new Set<string>();
    for (const scenario of expanded) {
      if (ids.has(scenario.id)) errors.push(`Duplicate scenario id: ${scenario.id}`);
      ids.add(scenario.id);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

function validateSpec(spec: ScenarioSpec, probe: CaseProbe | undefined, errors: string[], warnings: string[]): void {
  if (!spec.rubric.some((item) => ['prohibited', 'critical', 'red_flag'].includes(item.kind))) {
    warnings.push(`Scenario ${spec.id} has a weak rubric: no prohibited/critical item or red_flag`);
  }
  for (const item of spec.rubric) {
    if (item.kind === 'positive' && item.check?.type === 'max_spend') {
      warnings.push(`Scenario ${spec.id} rubric item ${item.id}: max_spend check on a positive item`);
    }
  }
  if (!probe) return;
  if (!probe.events.has(spec.cutAfter)) {
    errors.push(`Scenario ${spec.id}: cutAfter ${spec.cutAfter} is not an existing event in case ${spec.case}`);
  }
  for (const mode of ['include', 'exclude'] as const) {
    for (const file of spec.attachments[mode]) {
      if (!probe.attachments.has(file)) errors.push(`Scenario ${spec.id}: attachments.${mode} file ${file} does not exist in case ${spec.case}`);
    }
  }
  for (const item of spec.rubric) {
    for (const ref of item.evidence) {
      const number = /^event-(\d{3})$/.exec(ref)?.[1];
      if (number !== undefined) {
        if (!probe.events.has(number)) {
          errors.push(`Scenario ${spec.id} rubric item ${item.id}: evidence ${ref} does not exist in case ${spec.case}`);
        } else if (Number(number) > Number(spec.cutAfter)) {
          warnings.push(`Scenario ${spec.id} rubric item ${item.id}: evidence ${ref} is after cutAfter ${spec.cutAfter}; use hiddenFacts instead`);
        }
      } else if (!ref.startsWith('index:') && !probe.attachments.has(ref)) {
        errors.push(`Scenario ${spec.id} rubric item ${item.id}: evidence file ${ref} does not exist in case ${spec.case}`);
      }
    }
  }
  const visible = [probe.index, ...[...probe.events].filter(([number]) => Number(number) <= Number(spec.cutAfter)).map(([, body]) => body)];
  for (const fact of spec.hiddenFacts) {
    const marker = fact.marker?.toLowerCase();
    if (marker !== undefined && visible.some((text) => text.toLowerCase().includes(marker))) {
      warnings.push(`Scenario ${spec.id}: hiddenFacts marker ${JSON.stringify(fact.marker)} occurs in index.md or a visible event; would trip the leak audit`);
    }
  }
}

async function probeCase(dir: string): Promise<CaseProbe> {
  const [index, history, files] = await Promise.all([
    readFile(join(dir, 'index.md'), 'utf8'),
    readFile(join(dir, 'history.md'), 'utf8'),
    readdir(join(dir, 'attachments')).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [] as string[];
      throw error;
    }),
  ]);
  const events = new Map<string, string>();
  for (const match of history.matchAll(/^## .+ — event (\d{3})\s*$/gm)) {
    const rest = history.slice(match.index + match[0].length);
    const end = rest.search(/^(?:#{1,6}[ \t]+|<a\b[^\n]*\bid=["']event-\d{3}["'])/m);
    const block = end < 0 ? rest : rest.slice(0, end);
    const body = block.replace(/^(?:\s*\n|[ \t]*- \*\*[^\n]*\n)*/, '').trim();
    events.set(match[1]!, body);
  }
  return { index, events, attachments: new Set(files) };
}
