import type { Autonomy, CaseSummary, Handover, HumanDecision, NextStep, Outcome, PolicyRule, RunKind, RunView, ToolEffect } from '@casework/core';

/**
 * Response shapes of the web API. Client-safe: types only, no server imports.
 * Route handlers in app/api build these; features and hooks consume them.
 */

/** How a run decides: the model loop (falls back to the playbook) or the deterministic playbook only. */
export type RunMode = 'model' | 'rules';

/** Which agent ran: A (rules + guarded tool loop) or B (fixed pipeline). */
export type AgentId = 'a' | 'b';

/** What a run was for (smoke, split, Reality Test…), and the label it was given. From run.json, or guessed from the folder name. */
export interface RunTag {
  kind: RunKind;
  name?: string;
  note?: string;
}

/** Where in a case's history a run was cut. */
export interface RunCut {
  /** Events numbered >= cutBefore were hidden from the agent. */
  cutBefore: number;
  asOf: string;
}

export interface RunSummary extends RunTag {
  runId: string;
  caseRef: string;
  caseTitle: string;
  autonomy: Autonomy;
  mode: RunMode;
  agent: AgentId;
  cut?: RunCut;
  /** Set when the run belongs to an eval or batch. */
  groupId?: string;
  startedAt: string;
  done: boolean;
  error: string | null;
  status: RunView['status'];
  outcome?: Outcome;
  mascot: RunView['mascot'];
  steps: number;
  lastStep?: { kind: string; title: string };
  next?: Pick<NextStep, 'action' | 'recipient' | 'confidence' | 'decidedBy'>;
  handover?: Handover;
  decision?: HumanDecision;
}

/** One dated event in a case's history, as the timeline shows it. */
export interface HistoryEventView {
  n: number;
  sourceId: string;
  at: string;
  channel: string;
  from: string;
  to: string;
  stage?: string;
  body: string;
}

/** A labelled point in an example case: what the agency should do next, and must not do. */
export interface CutLabel {
  case: string;
  cutBefore: number;
  asOf: string;
  kind: 'determined' | 'judgement';
  situation: string;
  accept: string[];
  prohibit: string[];
  boundaries?: string[];
  happened?: string;
  note?: string;
}

export interface CaseTimeline {
  ref: string;
  events: HistoryEventView[];
  labels: CutLabel[];
  /** How the example case ended (Overview / Outcome sections). Absent for unseen cases. */
  ending?: string;
}

export type Verdict = 'accepted' | 'prohibited' | 'missed' | 'unlabelled';

export interface EvalRow {
  case: string;
  cutBefore: number;
  kind: CutLabel['kind'];
  action: string;
  decidedBy: string;
  pass: boolean;
  prohibited: boolean;
  accept: string[];
  stage?: string;
  blocked: string[];
  reason: string;
  runId?: string;
}

export interface EvalScore {
  n: number;
  accepted: number;
  prohibited: number;
}

export interface EvalView extends RunTag {
  id: string;
  /** 'cli' rows come from .casework/eval/results.jsonl; 'ui' rows from a run started here. */
  source: 'cli' | 'ui';
  mode: RunMode | string;
  startedAt?: string;
  total: number;
  done: boolean;
  rows: EvalRow[];
  score: { all: EvalScore; determined: EvalScore; judgement: EvalScore };
}

export interface BatchCase {
  ref: string;
  n: number;
  runId?: string;
  status: 'pending' | 'running' | 'done';
  outcome?: Outcome;
  error?: string;
  /** Path under the repo root, when the result came from a folder written by the CLI. */
  answerPath?: string;
}

export interface BatchView extends RunTag {
  id: string;
  source: 'cli' | 'ui';
  /** Folder the cases came from, or the folder the CLI wrote. */
  dir: string;
  mode: RunMode | string;
  startedAt?: string;
  finishedAt?: string;
  concurrency: number;
  state: 'running' | 'cancelling' | 'done';
  cases: BatchCase[];
}

export interface ToolInfo {
  name: string;
  description: string;
  effect: ToolEffect;
  recipient?: string;
  /** Policy rules that inspect this tool. */
  rules: string[];
  health: ToolHealth;
}

export interface ToolHealth {
  calls: number;
  failures: number;
  blocked: number;
  /** Most recent last, up to 50. */
  recent: { ok: boolean; ms?: number }[];
  avgMs?: number;
  lastError?: string;
  state: 'healthy' | 'degraded' | 'down' | 'unused';
}

export interface ToolRegistry {
  tools: ToolInfo[];
  rules: Pick<PolicyRule, 'id' | 'describe' | 'appliesTo'>[];
  mustEscalate: { id: string; describe: string }[];
  autonomy: Autonomy;
  model: { configured: boolean; decide: string };
}

export interface NavCounts {
  cases: number;
  running: number;
  escalations: number;
  /** Outbound messages the gate held for a person to approve. */
  approvals: number;
}

export type OutboundStatus = 'sent' | 'awaiting_approval' | 'recorded' | 'failed' | 'rejected' | 'superseded';

/** A message the agent proposed to send on a live case, and what the outbound gate did with it. */
export interface OutboundView {
  id: string;
  caseRef: string;
  runId: string | null;
  channel: string;
  recipient: string;
  address: string | null;
  subject: string | null;
  body: string;
  status: OutboundStatus;
  /** Why the gate sent it or held it. */
  why: string | null;
  createdAt: string;
  sentAt: string | null;
  error: string | null;
}

/** Signals on /api/live/stream as calls, emails and runs happen. */
export type LiveSignal =
  | { kind: 'case.opened'; caseRef: string; title: string; channel: string }
  | { kind: 'case.updated'; caseRef: string; sourceId: string }
  | { kind: 'case.hidden'; caseRef: string; hidden: boolean }
  | { kind: 'run.started'; caseRef: string; runId: string }
  | { kind: 'run.finished'; caseRef: string; runId: string; outcome?: string }
  | { kind: 'outbound'; caseRef: string; id: string; status: string };

export type { CaseSummary };

// ---------------------------------------------------------------- agents page

export interface AgentStage {
  name: string;
  /** 'rules' is deterministic code; 'model' calls Claude. */
  by: 'rules' | 'model' | 'mixed';
  does: string;
}

export interface AgentInfo {
  id: AgentId;
  name: string;
  approach: string;
  code: string;
  stages: AgentStage[];
  fallback: string;
  /** Where its results come from on disk. */
  outputs: string;
}

/** One decision an agent made on one cut or case, normalised across agents. */
export interface AgentDecision {
  /** "001@4" for a cut of an example case, or the case folder name. */
  key: string;
  case?: string;
  cutBefore?: number;
  kind?: string;
  action: string;
  /** Human wording of the action, when the agent gives one. */
  actionLabel?: string;
  recipient?: string;
  channel?: string;
  decidedBy?: string;
  confidence?: number;
  reason?: string;
  message?: string;
  /** Agent A: chosen action is in the label's accepted list. */
  accepted?: boolean;
  prohibited?: boolean;
  /** Labelled accepted actions for the cut (from cuts.json). */
  accept?: string[];
  /** Agent B: its LLM judge, when the run finished. */
  judge?: { score: number; actionMatch: string; prohibited: boolean; missedEscalation: boolean; unnecessaryEscalation: boolean; note: string };
  ms?: number;
  modelCalls?: number;
  models?: string[];
  /** Repo-relative folder with ANSWER.md / REASONING.md / trace.jsonl, when written. */
  answerPath?: string;
  runId?: string;
  error?: string;
}

export interface AgentRunView extends RunTag {
  id: string;
  agent: AgentInfo['id'];
  /** Folder name or UI eval id. */
  label: string;
  /** e.g. "rules-only playbook", "model claude-haiku-5-5". */
  mode: string;
  set: string;
  updatedAt?: string;
  /** Total planned, when known (from the run's log). */
  total?: number;
  complete: boolean;
  decisions: AgentDecision[];
  metrics: { label: string; value: string; hint?: string }[];
}

export interface AgentsOverview {
  agents: AgentInfo[];
  runs: AgentRunView[];
  /** Case number → case ref, so cut keys can link to the step-through. */
  refs: Record<string, string>;
}

export interface CostBucket {
  label: string;
  runs: number;
  /** Fractional pence: one run costs well under a penny. */
  pence: number;
}

export interface CostReport {
  model: string;
  runs: number;
  cases: number;
  totalPence: number;
  perRunPence: number;
  perCaseMedianPence: number;
  perCaseP90Pence: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  byChannel: CostBucket[];
  byKind: CostBucket[];
  endings: { ending: 'handled' | 'held' | 'escalated' | 'needs_info' | 'failed'; runs: number }[];
  minutesSaved: number;
  personPenceSaved: number;
  assumptions: string[];
}

export interface RulesReport {
  caseNoun: string;
  autonomy: Autonomy;
  guard: { id: string; describe: string }[];
  policy: { id: string; describe: string; appliesTo: string[] }[];
  mustEscalate: { id: string; describe: string }[];
  gate: { autoSend: string[]; minConfidence: number; conditions: string[] };
  tools: { name: string; recipient?: string; effect: ToolEffect; autoSend: boolean; internal: boolean }[];
}
