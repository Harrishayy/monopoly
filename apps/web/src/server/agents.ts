import 'server-only';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentDecision, AgentInfo, AgentRunView, AgentsOverview, CutLabel, EvalRow } from '@/lib/api-types';
import { listEvals } from './batches';
import { listCases } from './cases';
import { REPO_ROOT } from './config';
import { labelsFor } from './labels';
import { ACTIVE_TRACK } from './config';
import { readRunTag } from './manifest';

/**
 * Compares the two agents built for the Reality Test from what each wrote to disk:
 *   Agent A (packages/core + packages/tracks): .casework/eval-…/results.jsonl from `pnpm eval`, plus evals started in this UI.
 *   Agent B (packages/agent-b): .casework/agent-b/…/answers/<id>/trace.jsonl as each case finishes, and results.json
 *   (with its judge's scores) when a run completes.
 * Read-only: nothing here runs either agent.
 */

export const AGENTS: AgentInfo[] = [
  {
    id: 'a',
    name: 'Agent A · rules + tool loop',
    approach: 'A deterministic read of the case drives the model: the pack assesses the stage, flags and barred actions first, then Claude picks one action tool, and a policy guard can refuse it.',
    code: 'packages/core/src/agent · packages/tracks/src/<track>',
    stages: [
      { name: 'Read', by: 'rules', does: 'Loads every source: the case file, history events, attachments.' },
      { name: 'Assess', by: 'rules', does: "The pack's playbook works out the stage, who it waits on, flags, suggested and barred actions." },
      { name: 'Decide', by: 'model', does: 'Tool-use loop (up to 6 turns): Claude calls one action tool with a message, reason and citations.' },
      { name: 'Guard', by: 'rules', does: 'Policy rules and barred actions refuse a call; the refusal goes back to the model to choose again.' },
      { name: 'Act / hand over', by: 'rules', does: 'Records the action, or builds a handover with cited facts when a must-escalate flag is set.' },
    ],
    fallback: "If the model is unavailable or never settles, the playbook's top suggestion is taken (decided by: playbook).",
    outputs: '.casework/eval…/ (pnpm eval) and evals run from the Reality page',
  },
  {
    id: 'b',
    name: 'Agent B · fixed pipeline',
    approach: 'Every case takes the same seven steps. Code computes anything exact; the model reads and decides three times, a critic checks, and a gate settles disagreements by asking or escalating.',
    code: 'packages/agent-b/src (see PLAN.md)',
    stages: [
      { name: 'Ingest', by: 'rules', does: 'Schema-tolerant parse of any case folder into events, sections and attachments.' },
      { name: 'Ledger', by: 'rules', does: 'Exact facts: times, gaps, amounts, chase counts, unanswered asks, failures.' },
      { name: 'Situate', by: 'model', does: 'Task, stage, parties, open asks and conflicts, as structured output.' },
      { name: 'Decide ×3', by: 'model', does: 'Three sampled decisions; disagreement between them measures ambiguity.' },
      { name: 'Check', by: 'mixed', does: 'Hard rules in code plus a model critic: pass, revise or force escalation.' },
      { name: 'Gate', by: 'rules', does: 'Final act / ask / wait / escalate from agreement and critique.' },
      { name: 'Write', by: 'rules', does: 'ANSWER.md, REASONING.md and trace.jsonl.' },
    ],
    fallback: 'If every model call fails, a deterministic fallback still produces an answer (decided by: fallback).',
    outputs: '.casework/agent-b/<run>/answers/ (agent-b eval)',
  },
];

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '–');
const mean = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : '–');

async function dirs(path: string) {
  if (!existsSync(path)) return [];
  const names = await readdir(path, { withFileTypes: true }).catch(() => []);
  return names.filter((d) => d.isDirectory()).map((d) => d.name);
}

const jsonl = (text: string) =>
  text
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as Record<string, unknown>];
      } catch {
        return [];
      }
    });

// ---------------------------------------------------------------- agent A

function aMetrics(ds: AgentDecision[]): AgentRunView['metrics'] {
  const by = (k?: string) => ds.filter((d) => !k || d.kind === k);
  const m = (k?: string) => {
    const rs = by(k);
    return pct(rs.filter((d) => d.accepted).length, rs.length);
  };
  return [
    { label: 'Accepted action', value: m(), hint: 'Chosen action is in the cut’s accepted list' },
    { label: 'Prohibited', value: pct(ds.filter((d) => d.prohibited).length, ds.length), hint: 'Chosen action is in the cut’s prohibited list' },
    { label: 'Determined cuts', value: m('determined') },
    { label: 'Judgement cuts', value: m('judgement') },
    { label: 'Decided by model', value: pct(ds.filter((d) => d.decidedBy === 'model').length, ds.length) },
  ];
}

const fromARow = (r: EvalRow): AgentDecision => ({
  key: `${r.case}@${r.cutBefore}`,
  case: r.case,
  cutBefore: r.cutBefore,
  kind: r.kind,
  action: r.action,
  decidedBy: r.decidedBy,
  reason: r.reason,
  accepted: r.pass,
  prohibited: r.prohibited,
  accept: r.accept,
  runId: r.runId,
});

async function agentARuns(): Promise<AgentRunView[]> {
  const out: AgentRunView[] = [];
  const base = join(REPO_ROOT, '.casework');
  for (const name of (await dirs(base)).filter((n) => n !== 'agents' && n !== 'agent-b')) {
    const dir = join(base, name);
    const results = join(dir, 'results.jsonl');
    if (!existsSync(results)) continue;
    const rows = jsonl(await readFile(results, 'utf8')) as unknown as EvalRow[];
    if (!rows.length || typeof rows[0]!.cutBefore !== 'number') continue;
    const { manifest, ...tag } = await readRunTag(dir, name);
    const summary = await readFile(join(dir, 'SUMMARY.md'), 'utf8').catch(() => '');
    const ds = rows.map(fromARow);
    out.push({
      id: `a:${name}`,
      ...tag,
      agent: 'a',
      label: name,
      mode: summary.match(/^# Eval · .+ · (.+)$/m)?.[1] ?? manifest?.model ?? 'unknown',
      set: /holdout/.test(name) ? 'Held-out cuts' : 'Labelled cuts',
      updatedAt: (await stat(results)).mtime.toISOString(),
      complete: true,
      decisions: ds,
      metrics: aMetrics(ds),
    });
  }
  for (const e of await listEvals()) {
    if (e.source !== 'ui') continue;
    const ds = e.rows.map(fromARow);
    out.push({ id: `a:ui:${e.id}`, kind: e.kind, name: e.name, note: e.note, agent: 'a', label: `Run here · ${e.id.slice(0, 8)}`, mode: e.mode === 'rules' ? 'rules-only playbook' : `model (${process.env.MODEL_DECIDE ?? 'default'})`, set: 'Labelled cuts', updatedAt: e.startedAt, total: e.total, complete: e.done, decisions: ds, metrics: aMetrics(ds) });
  }
  return out;
}

// ---------------------------------------------------------------- agent B

interface BJudged {
  id: string;
  action: string;
  recipient?: string;
  decidedBy?: string;
  confidence?: number;
  judgement?: { score: number; actionMatch: string; prohibitedAction: boolean; missedEscalation: boolean; unnecessaryEscalation: boolean; note: string };
  error?: string;
}

/** Folder names are label ids with separators replaced: "<track>_<nnn>@<cut>" for cuts. */
const cutKey = (name: string) => name.match(/^[a-z-]+_(\d+)@(\d+)$/);

async function readBAnswer(dir: string, name: string, rel: string, labels: Map<string, CutLabel>): Promise<AgentDecision | undefined> {
  const lines = jsonl(await readFile(join(dir, 'trace.jsonl'), 'utf8').catch(() => ''));
  const gate = lines.find((l) => l.stage === 'gate')?.final as Record<string, unknown> | undefined;
  if (!gate) return undefined;
  const calls = (lines.find((l) => l.stage === 'calls')?.calls as { model: string; ok: boolean }[] | undefined) ?? [];
  const done = lines.find((l) => l.stage === 'done') as { ms?: number; failures?: string[] } | undefined;
  const m = cutKey(name);
  const label = m ? labels.get(`${m[1]}@${Number(m[2])}`) : undefined;
  const s = (k: string) => (typeof gate[k] === 'string' ? (gate[k] as string) : undefined);
  return {
    key: m ? `${m[1]}@${Number(m[2])}` : name,
    case: m?.[1],
    cutBefore: m ? Number(m[2]) : undefined,
    kind: label?.kind,
    accept: label?.accept,
    action: s('action') ?? 'unknown',
    actionLabel: s('actionLabel'),
    recipient: s('recipient'),
    channel: s('channel'),
    decidedBy: s('decidedBy'),
    confidence: typeof gate.confidence === 'number' ? gate.confidence : undefined,
    reason: s('rationale'),
    message: s('message'),
    ms: done?.ms,
    modelCalls: calls.length,
    models: [...new Set(calls.map((c) => c.model))],
    answerPath: rel,
    error: done?.failures?.length ? done.failures.join('; ') : undefined,
  };
}

function bMetrics(ds: AgentDecision[]): AgentRunView['metrics'] {
  const j = ds.flatMap((d) => (d.judge ? [d.judge] : []));
  const out: AgentRunView['metrics'] = [];
  if (j.length) {
    out.push(
      { label: 'Judge score', value: mean(j.map((x) => x.score)), hint: 'Mean 0–1 from agent B’s LLM judge vs what happened next' },
      { label: 'Action OK', value: pct(j.filter((x) => x.actionMatch === 'same' || x.actionMatch === 'acceptable_alternative').length, j.length), hint: 'Same action or an acceptable alternative' },
      { label: 'Prohibited', value: pct(j.filter((x) => x.prohibited).length, j.length) },
      { label: 'Missed escalation', value: pct(j.filter((x) => x.missedEscalation).length, j.length) },
    );
  } else out.push({ label: 'Judge score', value: 'pending', hint: 'Agent B judges a run once every case in it has finished' });
  out.push(
    { label: 'Decided by model', value: pct(ds.filter((d) => d.decidedBy === 'model').length, ds.length) },
    { label: 'Median time', value: ds.length ? `${Math.round([...ds.map((d) => d.ms ?? 0)].sort((a, b) => a - b)[Math.floor(ds.length / 2)]! / 1000)}s` : '–' },
  );
  return out;
}

async function agentBRuns(): Promise<AgentRunView[]> {
  const root = join(REPO_ROOT, '.casework/agent-b');
  const labels = new Map((await labelsFor(ACTIVE_TRACK)).map((l) => [`${l.case}@${l.cutBefore}`, l]));
  // Run folders sit at .casework/agent-b/<run> or .casework/agent-b/<group>/<run>.
  const runDirs: string[] = [];
  for (const a of await dirs(root)) {
    if (existsSync(join(root, a, 'answers')) || existsSync(join(root, a, 'results.json'))) runDirs.push(a);
    else for (const b of await dirs(join(root, a))) if (existsSync(join(root, a, b, 'answers')) || existsSync(join(root, a, b, 'results.json'))) runDirs.push(`${a}/${b}`);
  }
  const out: AgentRunView[] = [];
  for (const rel of runDirs) {
    const dir = join(root, rel);
    const answers = await dirs(join(dir, 'answers'));
    const ds = (await Promise.all(answers.map((n) => readBAnswer(join(dir, 'answers', n), n, `.casework/agent-b/${rel}/answers/${n}`, labels)))).filter((d): d is AgentDecision => !!d);
    const resultsPath = join(dir, 'results.json');
    const judged: BJudged[] = existsSync(resultsPath) ? JSON.parse(await readFile(resultsPath, 'utf8').catch(() => '[]')) : [];
    for (const r of judged) {
      const name = r.id.replace(/[^\w@-]+/g, '_');
      const d = ds.find((x) => x.answerPath?.endsWith(`/${name}`));
      if (d && r.judgement)
        d.judge = { score: r.judgement.score, actionMatch: r.judgement.actionMatch, prohibited: r.judgement.prohibitedAction, missedEscalation: r.judgement.missedEscalation, unnecessaryEscalation: r.judgement.unnecessaryEscalation, note: r.judgement.note };
    }
    const log = await readFile(`${dir}.log`, 'utf8').catch(() => '');
    const total = Number(log.match(/eval: (\d+) label/)?.[1]) || undefined;
    const isCuts = ds.some((d) => d.cutBefore !== undefined);
    const st = await stat(existsSync(resultsPath) ? resultsPath : dir);
    const models = [...new Set(ds.flatMap((d) => d.models ?? []))];
    out.push({
      id: `b:${rel}`,
      ...(await readRunTag(dir, rel)),
      agent: 'b',
      label: rel,
      mode: models.length ? `model ${models.join(', ')}` : 'unknown',
      set: isCuts ? 'Labelled cuts' : 'Escalation snapshots (all tracks)',
      updatedAt: st.mtime.toISOString(),
      total: total ?? (judged.length || undefined),
      complete: existsSync(resultsPath),
      decisions: ds.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })),
      metrics: bMetrics(ds),
    });
  }
  return out;
}

// ---------------------------------------------------------------- shared bench (packages/agents)

/** One row of .casework/agents/…/results.jsonl: an agent's action on a cut, scored against the cut's accepted list. */
interface BenchRow {
  agent: string;
  cut: string;
  case: string;
  kind: 'determined' | 'judgement';
  action: string;
  accept: string[];
  pass: boolean;
  prohibited: boolean;
  decidedBy: string;
  ms: number;
  failures: string[];
  reason: string;
}

/**
 * `pnpm bench` runs: .casework/agents/bench/<run>/ and .casework/agents/<run>/ (smoke).
 * Both agents are scored by the same rule, so each agent in a run becomes its own row here.
 */
async function benchRuns(): Promise<AgentRunView[]> {
  const root = join(REPO_ROOT, '.casework/agents');
  const rels = [...(await dirs(root)).filter((d) => d !== 'bench' && !d.startsWith('answers')), ...(await dirs(join(root, 'bench'))).map((d) => `bench/${d}`)];
  const out: AgentRunView[] = [];
  for (const rel of rels) {
    const dir = join(root, rel);
    const resultsPath = join(dir, 'results.jsonl');
    const { manifest, ...tag } = await readRunTag(dir, rel.split('/').at(-1)!);
    if (!existsSync(resultsPath) && !manifest) continue;
    const rows = jsonl(await readFile(resultsPath, 'utf8').catch(() => '')) as unknown as BenchRow[];
    const agents = new Set([...rows.map((r) => r.agent), ...(rows.length ? [] : (manifest?.agent ?? '').split(',').filter(Boolean))]);
    const st = await stat(existsSync(resultsPath) ? resultsPath : dir);
    for (const agent of agents) {
      if (agent !== 'a' && agent !== 'b') continue;
      const ds: AgentDecision[] = rows
        .filter((r) => r.agent === agent)
        .map((r) => ({
          key: r.cut,
          case: r.case,
          cutBefore: Number(r.cut.split('@')[1]),
          kind: r.kind,
          action: r.action,
          decidedBy: r.decidedBy,
          reason: r.reason,
          accepted: r.pass,
          prohibited: r.prohibited,
          accept: r.accept,
          ms: r.ms,
          error: r.failures?.length ? r.failures.join('; ') : undefined,
        }));
      out.push({
        id: `bench:${rel}:${agent}`,
        ...tag,
        agent,
        label: rel.replace(/^bench\//, ''),
        mode: manifest?.model ? `model ${manifest.model}` : /rules/.test(rel) ? 'rules-only playbook' : 'model',
        set: manifest?.split ? `Labelled cuts · ${manifest.split} split` : 'Labelled cuts',
        updatedAt: manifest?.finishedAt ?? manifest?.startedAt ?? st.mtime.toISOString(),
        complete: rows.length > 0 && (!manifest || !!manifest.finishedAt),
        decisions: ds.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })),
        metrics: aMetrics(ds),
      });
    }
  }
  return out;
}

export async function agentsOverview(): Promise<AgentsOverview> {
  const [a, b, bench, cases] = await Promise.all([agentARuns(), agentBRuns(), benchRuns(), listCases().catch(() => [])]);
  const refs = Object.fromEntries(cases.map((c) => [c.ref.split('-').at(-1)!, c.ref]));
  const runs = [...a, ...b, ...bench].sort((x, y) => (y.updatedAt ?? '').localeCompare(x.updatedAt ?? ''));
  return { agents: AGENTS, runs, refs };
}
