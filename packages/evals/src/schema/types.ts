import type { Outcome, RunEvent } from '@casework/core';
import type { RunCaseFn } from '@casework/core/agent';
import type { ActionKind, PartyRole, SuiteName, TokenUsage } from './common';
import type { HiddenContinuation, LeakAudit } from './materialized';
import type {
  CheckResult, Comparison, ItemResult, JudgeVerdict, LedgerEntry, RunConfig, RunSummary,
  ScenarioResult, ScenarioScores,
} from './results';
import type { CaseEdit, EvalSuite, ScenarioSpec } from './scenario';

export type { RunCaseFn };

export interface ConcreteScenario { id: string; baseId: string; variant: 'base' | 'perturbed' | 'escalation'; perturbationId?: string; spec: ScenarioSpec; edits: CaseEdit[]; escalation?: { context?: string; question?: string }; planted?: string }
export interface MaterializedScenario { scenario: ConcreteScenario; spec: ScenarioSpec; root: string; caseDir: string; folder: string; visibleEvents: string[]; visibleAttachments: string[]; visibleText: string; hidden: HiddenContinuation; leak: LeakAudit }
export interface RecordedAction { callId: string; seq: number; tool: string; kind: ActionKind; args: unknown; status: 'succeeded' | 'failed' | 'pending'; attempts: number; to?: PartyRole; amountPence?: number; text?: string }
export interface AgentRunInput { scenario: ConcreteScenario; materialized: MaterializedScenario; suite: EvalSuite; outDir: string; signal: AbortSignal; timeoutMs: number; repeat: number }
export interface AgentRunOutput { ok: boolean; error: string | null; events: RunEvent[] | null; ledger: LedgerEntry[]; ms: number; usage: TokenUsage | null; answerPath: string | null; reasoningPath: string | null; tracePath: string | null }
export interface AgentAdapter { name: string; kind: 'inproc' | 'command' | 'baseline'; run(input: AgentRunInput): Promise<AgentRunOutput> }
export interface CheckInput { scenario: ConcreteScenario; materialized: MaterializedScenario; suite: EvalSuite; events: RunEvent[] | null; answer: string | null; reasoning: string | null; ledger: LedgerEntry[]; agentError: string | null }
export interface AnswersLint { ok: boolean; rows: { n: number; ok: boolean; problems: string[] }[] }
export type JudgeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export interface JudgeOptions { enabled: boolean; model: string; effort: JudgeEffort; samples: number; concurrency: number; fallbacks: boolean; cacheDir: string | null; client?: JudgeClient }
export interface JudgeRequest { system: string; context: string; output: string; model: string; effort: JudgeEffort; sample: number }
export interface JudgeResponse { verdict: JudgeVerdict; usage: TokenUsage; model: string; stopReason: string | null }
export interface JudgeClient { complete(req: JudgeRequest, signal?: AbortSignal): Promise<JudgeResponse> }
export interface JudgeInput { scenario: ConcreteScenario; materialized: MaterializedScenario; suite: EvalSuite; answer: string | null; reasoning: string | null; events: RunEvent[] | null; checks: CheckResult[] }
export interface GradeInput { runId: string; scenario: ConcreteScenario; materialized: MaterializedScenario; suite: EvalSuite; agentName: string; repeat: number; agent: AgentRunOutput; judge: JudgeOptions; artifactsDir: string }
export interface ScoreArgs { spec: ScenarioSpec; items: ItemResult[]; checks: CheckResult[]; verdict: JudgeVerdict | null; completed: boolean; outcome: Outcome | null; actions: RecordedAction[] }
export interface ScoreResult { scores: ScenarioScores; items: ItemResult[]; extraChecks: CheckResult[] }
export interface EvalRunOptions { suite: EvalSuite; suiteName: SuiteName | 'custom'; scenarioIds?: string[]; adapter: AgentAdapter; dataDir: string; outRoot: string; concurrency: number; repeat: number; timeoutMs: number; judge: JudgeOptions; compare: string; allowLeaks?: boolean; onProgress?: (line: string) => void; models?: RunConfig['models'] }
export interface EvalRunResult { runDir: string; summary: RunSummary; comparison: Comparison | null }
export interface RegradeOptions { suite: EvalSuite; judge: JudgeOptions; compare: string; onProgress?: (line: string) => void }
export interface RehearseOptions { suite: EvalSuite; suiteName: SuiteName | 'custom'; scenarioIds?: string[]; dataDir: string; outRoot: string; track: string; concurrency: number; judge: JudgeOptions; command?: string; onProgress?: (line: string) => void }
export interface RehearseResult { dir: string; ms: number; lint: AnswersLint; summary: RunSummary }
export interface SuiteValidation { ok: boolean; errors: string[]; warnings: string[] }
export type BaselineKind = 'escalate' | 'reckless' | 'replay';
