import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DecisionClass, RunConfig, ScenarioResult, type RunSummary, type Comparison, type EvalSuite, type ItemResult, type TokenUsage } from '../schema';
import { compareRuns, summarizeRun } from '../score';

const cell = (value: unknown) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const line = (value: string) => value.replace(/\s+/g, ' ').trim();
const percent = (value: number | null) => value === null ? 'ungraded' : `${(value * 100).toFixed(1)}%`;
const anchor = (id: string) => `scenario-${[...id].map(char => /[a-zA-Z0-9-]/.test(char) ? char : `-${char.codePointAt(0)!.toString(16)}-`).join('')}`;
const scenarioLink = (id: string) => `[${id}](#${anchor(id)})`;
const failedItem = (item: ItemResult) => item.kind === 'required' || item.kind === 'positive'
  ? item.status === 'missed' || item.status === 'partial' : item.status === 'violated';
const tokenCount = (usage: TokenUsage | null) => usage ? `${usage.inputTokens} in / ${usage.outputTokens} out / ${usage.cacheReadTokens} cache read / ${usage.cacheWriteTokens} cache write` : 'unknown';

function delta(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value < 0 ? '▼' : '▲'} ${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)} pp`;
}

function table(headers: string[], rows: unknown[][]): string {
  return [headers, headers.map(() => '---'), ...rows].map(row => `| ${row.map(cell).join(' | ')} |`).join('\n');
}

function isPassing(result: ScenarioResult): boolean {
  return result.scores.completed && !result.scores.critical && result.scores.outcome === 1
    && result.scores.judgement === 1 && result.scores.engineering === 1
    && (result.scores.usability === null || result.scores.usability === 1)
    && !result.checks.some(check => !check.ok)
    && result.items.every(item => !item.uncertain && ['met', 'not_violated', 'not_applicable'].includes(item.status));
}

function cutDescription(result: ScenarioResult, suite?: EvalSuite): string | null {
  const last = result.scenarioId.match(/@(\d{3})/)?.[1];
  if (!last) return null;
  let count = Number(last);
  let lastNumber = last;
  const variant = result.scenarioId.match(/~([a-z0-9-]+)$/)?.[1];
  if (variant) {
    const perturbation = suite?.perturbations.find(entry => entry.id === variant && entry.appliesTo.includes(result.baseId));
    if (!perturbation) return `Base cut: ${count} visible events; last visible event ${last}. Variant cut details unavailable.`;
    for (const edit of perturbation.edits) {
      if (edit.op === 'append_event' || edit.op === 'insert_event') count++;
      if (edit.op === 'remove_event') count--;
      if (edit.op === 'pad_noise') count += edit.count;
    }
    lastNumber = String(count).padStart(3, '0');
  }
  return `${count} visible events; last visible event ${lastNumber}.`;
}

function artifactLinks(dir: string): string {
  const root = dir.replace(/\\/g, '/').replace(/\/$/, '');
  return ['ANSWER.md', 'REASONING.md', 'trace.jsonl', 'ledger.jsonl'].map(file => {
    const path = `${root ? `${root}/` : ''}${file}`.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\n/g, '%0A');
    return `[${file}](<${path}>)`;
  }).join(' · ');
}

function scenarioCard(result: ScenarioResult, cardAnchor: string, suite?: EvalSuite): string {
  const scores = result.scores;
  const saw = cutDescription(result, suite);
  const metrics = result.checks.find(check => check.id === 'metrics')?.message;
  const failures = [
    ...result.items.filter(item => failedItem(item) || item.uncertain).map(item => `- ${item.kind} · ${item.tag} · ${line(item.text)} — ${item.status}${item.uncertain ? ' (graders disagreed)' : ''}${item.evidence ? ` — “${line(item.evidence)}”` : ''}${item.seq === null ? '' : ` — (seq ${item.seq})`}${item.explanation ? ` — ${line(item.explanation)}` : ''}`),
    ...result.checks.filter(check => !check.ok).map(check => `- Check ${check.id} · ${check.severity} · ${check.tag} — ${line(check.message)}${check.quote ? ` — “${line(check.quote)}”` : ''}${check.seq === undefined ? '' : ` — (seq ${check.seq})`}`),
  ];
  return [
    `<a id="${cardAnchor}"></a>`, '', `### ${result.scenarioId} · ${line(result.title)}`, '',
    `Repeat ${result.repeat} · ${result.expectedDecision} → ${scores.decisionObserved ?? 'none'} (${scores.decisionMatch ?? 'ungraded'})`,
    `Outcome ${percent(scores.outcome)} / judgement ${percent(scores.judgement)} / engineering ${percent(scores.engineering)} / usability ${percent(scores.usability)}`,
    `${result.ms} ms · Tokens: ${tokenCount(result.agentUsage)}`, '',
    `**What it saw:** ${saw ?? 'Cut details unavailable.'}`, '',
    `**What it did:** ${scores.completed ? 'Completed' : 'Incomplete'}; observed ${scores.decisionObserved ?? 'none'}.${metrics ? ` ${line(metrics)}` : ' Action summary unavailable.'}`,
    `Artifacts: ${artifactLinks(result.artifactsDir)}`, '',
    result.items.some(item => item.uncertain) ? '**Missed, violated or uncertain**' : '**Missed or violated**', '', ...(failures.length ? failures : ['None.']), '',
    `**Top issue:** ${result.topIssue ? line(result.topIssue) : 'None'}`, '',
    `**Fix area:** ${result.fixArea ?? 'None'}`,
  ].join('\n');
}

/** Render the run report with per-scenario evidence and relative artifact links. */
export function renderReport(summary: RunSummary, results: ScenarioResult[], comparison: Comparison | null, opts?: { suite?: EvalSuite }): string {
  const { config, scores } = summary;
  const judge = config.judge.enabled ? `${config.models.judge ?? 'unknown'}/${config.judge.samples} samples/${config.judge.effort}` : 'off';
  const headline: [string, number | null, number | null | undefined][] = [
    ['Outcomes', scores.outcome, comparison?.deltas.outcome], ['Coverage', scores.coverage, comparison?.deltas.coverage],
    ['Judgement & safety', scores.judgement, comparison?.deltas.judgement], ['Engineering', scores.engineering, comparison?.deltas.engineering],
    ['Real-world fit (usability)', scores.usability, comparison?.deltas.usability], ['Technical estimate', scores.technical, comparison?.deltas.technical],
  ];
  const sections = [
    `# Eval report · ${config.suite} · ${line(config.agent)}`, '',
    `Run ${config.runId} · Created ${config.createdAt} · Git ${config.gitSha ?? 'unknown'}${config.gitDirty ? ' +dirty' : ''}`,
    `Models: decide ${config.models.decide ?? 'unknown'}, fast ${config.models.fast ?? 'unknown'} · Judge: ${judge}`,
    `Rubric ${config.rubricVersion} · ${summary.counts.scenarios} scenarios × ${config.repeat} repeats`, '',
    '## Headline scores', '',
    table(['Metric', 'Estimate', ...(comparison ? ['Δ previous run'] : [])], headline.map(([label, value, change]) => [label,
      `${percent(value)}${label === 'Technical estimate' ? ` · ${scores.technicalPoints.toFixed(2)} / 70 points` : ''}`,
      ...(comparison ? [`${delta(change)}${label === 'Technical estimate' && change !== null && change !== undefined
        ? ` · ${change >= 0 ? '+' : ''}${(change * 70).toFixed(2)} points` : ''}`] : [])])), '',
    'These are internal estimates for steering work.',
    "Over-escalation caps a scenario's judgement score at 50%.", '', '## Critical failures', '',
  ];
  const critical = results.filter(result => result.scores.critical);
  sections.push(...(critical.length ? critical.map(result => {
    const issues = [...result.items.filter(item => item.kind === 'critical' && item.status === 'violated').map(item => `item ${item.id}: ${line(item.text)}`),
      ...result.checks.filter(check => !check.ok && check.severity === 'critical').map(check => `check ${check.id}: ${line(check.message)}`)];
    return `- ${scenarioLink(result.scenarioId)} (repeat ${result.repeat}) → ${issues.join('; ') || result.topIssue || 'Critical failure recorded'}`;
  }) : ['None.']));
  if (comparison) {
    sections.push('', '## Regressions', '', ...comparison.regressions.map(entry => `- ${scenarioLink(entry.scenarioId)}: ${line(entry.reason)} (${percent(entry.before)} → ${percent(entry.after)} outcome)`));
    if (!comparison.regressions.length) sections.push('None.');
    sections.push('', `New critical: ${comparison.newCritical.map(scenarioLink).join(', ') || 'None'}.`, '', '## Improvements', '',
      ...comparison.improvements.map(entry => `- ${scenarioLink(entry.scenarioId)}: ${line(entry.reason)} (${percent(entry.before)} → ${percent(entry.after)} outcome)`));
    if (!comparison.improvements.length) sections.push('None.');
    sections.push('', `Fixed critical: ${comparison.fixedCritical.map(scenarioLink).join(', ') || 'None'}.`);
  }
  sections.push('', '## Decision matrix', '', table(['Expected / observed', ...DecisionClass.options, 'none'], DecisionClass.options.map(expected => [expected,
    ...[...DecisionClass.options, 'none'].map(observed => summary.decisionMatrix[expected][observed] ?? 0)])), '',
    `Over-escalated ${results.filter(result => result.checks.some(check => check.id === 'over_escalation' && !check.ok)).length}`,
    `Under-escalated ${results.filter(result => result.checks.some(check => check.id === 'under_escalation' && !check.ok)).length}`, '', '## Top failure tags', '');
  sections.push(summary.tags.length ? table(['Tag', 'Weight', 'Count', 'Example scenarios'], summary.tags.map(tag => [tag.tag, Number(tag.weight.toFixed(4)), tag.count, tag.scenarios.slice(0, 5).map(scenarioLink).join(', ')])) : 'None.');
  for (const tag of summary.tags.slice(0, 5)) {
    const issues = new Map<string, number>();
    for (const result of results) {
      if (!result.items.some(item => item.tag === tag.tag && failedItem(item)) && !result.checks.some(check => check.tag === tag.tag && !check.ok)) continue;
      const issue = result.judge?.verdict?.topIssue;
      if (issue?.trim()) issues.set(line(issue), (issues.get(line(issue)) ?? 0) + 1);
    }
    if (issues.size) sections.push('', `**${tag.tag} — common top issues**`, '', ...[...issues].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([issue, count]) => `- ${issue} (${count})`));
  }
  sections.push('', '## Scenario cards', '');
  const sorted = [...results].sort((a, b) => Number(b.scores.critical) - Number(a.scores.critical)
    || (a.scores.outcome + a.scores.judgement) - (b.scores.outcome + b.scores.judgement)
    || a.scenarioId.localeCompare(b.scenarioId) || a.repeat - b.repeat);
  const seen = new Map<string, number>();
  const cardAnchor = (id: string) => {
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    return `${anchor(id)}${count ? `-repeat-${count + 1}` : ''}`;
  };
  for (const result of sorted.filter(result => !isPassing(result))) sections.push(scenarioCard(result, cardAnchor(result.scenarioId), opts?.suite), '');
  const passing = sorted.filter(isPassing);
  if (passing.length) sections.push('## Passing scenarios', '', ...passing.map(result => `- <a id="${cardAnchor(result.scenarioId)}"></a> ${result.scenarioId} · ${line(result.title)} (repeat ${result.repeat}) · ${artifactLinks(result.artifactsDir)}`), '');
  sections.push('## Flaky scenarios', '', summary.flaky.map(scenarioLink).join(', ') || 'None.', '', '## Cost & latency', '',
    `Agent tokens: ${tokenCount(summary.tokens.agent)}`,
    `Judge tokens: ${tokenCount(summary.tokens.judge)}`,
    `Judge cost USD: ${summary.costUsd.judge === null ? 'unavailable' : `$${summary.costUsd.judge.toFixed(4)}`}`,
    `Uncertain items: ${results.reduce((sum, result) => sum + result.items.filter(item => item.uncertain).length, 0)}`,
    `Latency: p50 ${summary.latency.p50Ms.toFixed(1)} ms · p95 ${summary.latency.p95Ms.toFixed(1)} ms · mean ${summary.latency.meanMs.toFixed(1)} ms`, '');
  return sections.join('\n');
}

/** Render at most fifteen console lines of scores, failures and the report path. */
export function renderConsoleSummary(summary: RunSummary, comparison: Comparison | null): string {
  const change = (key: keyof Comparison['deltas']) => comparison ? ` (${delta(comparison.deltas[key])})` : '';
  return [
    `Eval ${summary.config.suite} · ${summary.config.agent} · ${summary.runId}`,
    `Outcomes ${percent(summary.scores.outcome)}${change('outcome')} · Coverage ${percent(summary.scores.coverage)}${change('coverage')}`,
    `Judgement ${percent(summary.scores.judgement)}${change('judgement')} · Engineering ${percent(summary.scores.engineering)}${change('engineering')}`,
    `Usability ${percent(summary.scores.usability)}${change('usability')}`,
    `Technical estimate ${percent(summary.scores.technical)} · ${summary.scores.technicalPoints.toFixed(2)} / 70${change('technical')}`,
    `Critical failures: ${summary.counts.critical}`,
    `Top tags: ${summary.tags.slice(0, 3).map(tag => `${tag.tag} (${Number(tag.weight.toFixed(4))})`).join(', ') || 'none'}`,
    `Regressions: ${comparison?.regressions.length ?? 0}`,
    'Full report: report.md',
  ].map(line).join('\n');
}

/** Rebuild report artifacts from validated stored outputs; ignore an unreadable previous run. */
export async function writeRunReport(runDir: string, opts?: { suite?: EvalSuite; previousRunDir?: string | null }): Promise<{ summary: RunSummary; comparison: Comparison | null }> {
  const [results, configText] = await Promise.all([readResults(runDir), readFile(join(runDir, 'run.json'), 'utf8')]);
  const config = RunConfig.parse(JSON.parse(configText));
  const summary = summarizeRun(config, results);
  let comparison: Comparison | null = null;
  if (opts?.previousRunDir) {
    try {
      const [previousResults, previousText] = await Promise.all([readResults(opts.previousRunDir), readFile(join(opts.previousRunDir, 'run.json'), 'utf8')]);
      const previousConfig = RunConfig.parse(JSON.parse(previousText));
      comparison = compareRuns({ summary, results }, { summary: summarizeRun(previousConfig, previousResults), results: previousResults });
    } catch { comparison = null; }
  }
  await writeFile(join(runDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  if (comparison) await writeFile(join(runDir, 'comparison.json'), JSON.stringify(comparison, null, 2) + '\n');
  await writeFile(join(runDir, 'report.md'), renderReport(summary, results, comparison, opts));
  return { summary, comparison };
}

/** Read and validate every nonblank JSONL result; reject invalid persisted rows. */
export async function readResults(runDir: string): Promise<ScenarioResult[]> {
  return (await readFile(join(runDir, 'results.jsonl'), 'utf8')).split(/\r?\n/).filter(row => row.trim()).map(row => ScenarioResult.parse(JSON.parse(row)));
}
