# 11 · Evaluation harness

`@casework/evals` tests the agent the way the Reality Test will: unseen cases, cut at a decision point, graded against required outcomes, acceptable alternatives, positive behaviours, red flags, prohibited actions and critical failures. It tells us how well we did and, item by item, where we went wrong.

The harness is track-agnostic. Each track pack supplies its own scenarios, rubrics and perturbations in `packages/tracks/src/<track>/evals/`.

## Why it is built this way

- **No answer key, no decision points.** The public cases are complete histories. Testing on them as supplied lets the agent read the ending. So every test is a **scenario**: one case cut after a chosen event, with later events and attachments removed.
- **History is not gold.** The recorded handling is one example and sometimes poor practice. Rubrics describe best practice and say where they deliberately differ from history (`historyDeviates`).
- **Grade what judges read.** The agent runs through the same loader and `executeCase` path as `pnpm reality`, and the graders read the same `ANSWER.md`, `REASONING.md` and `trace.jsonl`.
- **Two graders.** Deterministic checks are exact for what they can see (spend, approvals, citations, sections, leaks, lint). A Claude judge grades judgement against the rubric, quoting evidence. A deterministic violation always stands.
- **Unseen-proof.** A fixed holdout split, perturbed variants (conflicts, safety signals, planted instructions, noise, tool failures) and escalation-format variants stop us tuning to 50 public cases.
- **Validated.** Baseline agents (escalate everything, reckless, replay history) must rank as expected before any score is trusted.

## Layout

```
packages/evals/src/
  schema/       zod contracts shared by every module (this doc, § Contracts)
  paths.ts      repo root, default data dir, output root, git info
  materialize/  read/write organiser case folders, cut, edits, escalation format, leak audit
  suite/        load, expand, select and validate a track's eval suite
  sandbox/      wrap pack tools: record calls, inject faults, detect duplicate effects
  adapters/     agent adapters: in-process runCase, external command, baselines
  runner/       run directory, concurrency, repeats, regrade, rehearsal
  checks/       deterministic checks, lint, ANSWERS lint, trace condensing
  judge/        Claude grader: prompt, client, cache, cost
  score/        item merge, per-scenario scores, run summary, comparison
  grade/        gradeScenario: checks → judge → score
  report/       markdown + console report
packages/core/src/agent/execute.ts   executeCase: run one case, render ANSWER/REASONING (shared with pnpm reality)
packages/tracks/src/evals.ts         EVAL_SUITES registry (export "@casework/tracks/evals")
packages/tracks/src/<track>/evals/   track content: scenarios, perturbations, escalation twins, action map, splits
apps/cli/src/harness.ts             pnpm harness [run|grade|report|scenarios|rehearse|lint]
.casework/evals/                     outputs (gitignored)
```

Dependencies: `zod`, `@anthropic-ai/sdk`, `p-limit`, `unpdf`, `@casework/core`. `@casework/evals` never imports `@casework/tracks`; the CLI wires a pack and its suite together.

## Data flow

```
suite (track content) ──expand──▶ ConcreteScenario[] ──select(suite name, ids)──▶
  materialize: read raw case → cut after event N → apply edits → (escalation format) → write folder + hidden continuation + leak audit
  adapter.run: agent sees ONLY the materialized folder → ANSWER.md, REASONING.md, trace.jsonl, ledger.jsonl
  grade: checks (trace, files, ledger) → judge (rubric + visible case + reference continuation + outputs) → scores
summary (hackathon weights) → comparison with previous run → report.md
```

## Contracts (`packages/evals/src/schema`)

Persisted shapes are zod schemas with inferred types; in-memory-only shapes may be interfaces. Names below are the exported names.

### Enums

```ts
DecisionClass = 'act' | 'ask' | 'escalate' | 'wait' | 'close'
// act: does operational work itself (instruct, schedule, relay, forward) and carries on
// ask: requests information, confirmation or approval from a party and waits for it
// escalate: hands the case to a person with a handover
// wait: deliberately holds with a follow-up time
// close: completes the case, with evidence
RubricKind = 'required' | 'positive' | 'red_flag' | 'prohibited' | 'critical'
FailureTag = 'approval' | 'spend' | 'scope' | 'safety' | 'responsibility' | 'conflict' | 'evidence' | 'closure'
           | 'communication' | 'privacy' | 'chasing' | 'hallucination' | 'injection' | 'robustness'
           | 'over_escalation' | 'under_escalation' | 'format'
FixArea = 'prompt' | 'policy' | 'tool' | 'loader' | 'output' | 'model'
ActionKind = 'read' | 'message' | 'request_approval' | 'assign_provider' | 'schedule' | 'commit_spend'
           | 'hold' | 'close' | 'escalate' | 'record' | 'other'
PartyRole = 'customer' | 'approver' | 'provider' | 'internal' | 'third_party' | 'unknown'   // tracks label them
ItemStatus = 'met' | 'partial' | 'missed' | 'violated' | 'not_violated' | 'not_applicable' | 'ungraded'
SuiteName = 'smoke' | 'dev' | 'holdout' | 'robustness' | 'escalation' | 'all'
EventNumber = string matching /^\d{3}$/
```

`Outcome`, `RunEvent`, `Usage`, `TrackId` come from `@casework/core`.

### Raw case (organiser folder model, `schema/raw.ts`)

```ts
KeyValue { key: string; value: string }
RawEvent { number: string; at: string /* as written, e.g. "2025-10-10 19:20:49 UTC" */; fields: KeyValue[] /* Stage?, Channel, From, To in file order */; body: string }
RawAttachment { fileName: string; sourcePath: string; text: string | null /* extracted text; null for images/unreadable */ }
RawIndex { h1: string /* full heading text after "# " */; title: string; details: KeyValue[]; sections: { heading: string; body: string }[] /* all H2 except "Case details", in order */ }
RawHistory { h1: string; preamble: string /* text between the H1 and the first event */; events: RawEvent[] }
RawCase { trackFolder: string; folder: string; index: RawIndex; history: RawHistory; attachments: RawAttachment[] }
```

### Rubric and scenario (`schema/scenario.ts`)

```ts
TraceCheck = discriminated union on `type`:
  { type: 'no_action'; kinds: ActionKind[]; to?: PartyRole }        // passes when no such action succeeded (optionally: to that role)
  { type: 'requires_action'; kinds: ActionKind[]; to?: PartyRole }   // passes when at least one such action succeeded
  { type: 'max_spend'; pence: number }                               // sum of succeeded commit_spend amounts <= pence
  { type: 'outcome_in'; outcomes: Outcome[] }                        // run.completed outcome is one of these
  { type: 'escalated'; value: boolean }                              // an escalation.created event (or escalate action) exists
  { type: 'text_absent'; pattern: string; flags?: string; where?: ('answer'|'reasoning'|'messages')[] }
  { type: 'text_present'; pattern: string; flags?: string; where?: ('answer'|'reasoning'|'messages')[] }
  { type: 'cites_any'; refs: string[] }                              // decisions/handover cite at least one of these refs

RubricItem {
  id: string (/^[a-z0-9][a-z0-9-]*$/, unique within a scenario)
  kind: RubricKind
  text: string (min 10)      // required/positive: the expected behaviour. red_flag/prohibited/critical: the bad behaviour.
  tag: FailureTag
  evidence: string[] = []    // "event-012", an attachment file name, "index:initial-request", "index:details"
  weight?: number            // default by kind, see § Scoring
  appliesTo?: DecisionClass[]// only applies when the agent's decision is one of these
  check?: TraceCheck         // deterministic; overrides the judge for this item
  fix?: FixArea
}
Expected { summary: string (min 20); decision: DecisionClass; acceptable: { decision: DecisionClass; summary: string }[] = [] }
HiddenFact { text: string; marker?: string }   // marker: a literal that would only appear if the agent knew the fact
FaultSpec { tool: string /* name or '*' = every non-read tool */; kind: 'error'|'timeout'|'bad_data'; attempts: number[] /* 1-based */; message?: string }
ScenarioSpec {
  id: string                 // "<refPrefix>-<case>@<cutAfter>", e.g. "PM-008@038"
  case: string               // organiser folder, /^\d{3}$/
  cutAfter: string           // last visible event number, /^\d{3}$/
  title: string
  question?: string          // written into index.md as "## Decision required"
  attachments: { include: string[] = []; exclude: string[] = [] } = {}
  expected: Expected
  rubric: RubricItem[] (min 1)
  hiddenFacts: HiddenFact[] = []
  historyDeviates?: string
  faults: FaultSpec[] = []
  tags: string[] = []
  notes?: string
}
```

### Perturbations and twins

```ts
EventDraft { at?: string /* "YYYY-MM-DD HH:MM:SS UTC"; default previous event + 45 min */; fields: KeyValue[] (min 1); body: string }
CaseEdit = discriminated union on `op`:
  { op: 'append_event'; event: EventDraft }                       // becomes the new last visible event
  { op: 'insert_event'; before: EventNumber; event: EventDraft }  // renumbers
  { op: 'remove_event'; number: EventNumber }                     // renumbers
  { op: 'replace_text'; in: 'event'|'initial_request'|'any'; number?: EventNumber; find: string; replace: string }
  { op: 'pad_noise'; count: number; seed: number = 1 }            // duplicates short operations-team events at deterministic positions; renumbers
  { op: 'set_detail'; key: string; value: string }
Perturbation {
  id: string (/^[a-z0-9-]+$/); title: string; description: string
  appliesTo: string[] (min 1)           // base scenario ids
  edits: CaseEdit[] = []
  expected?: Expected                   // replaces the base expectation
  rubric: RubricItem[] = []             // appended
  dropRubric: string[] = []             // base item ids that no longer apply
  hiddenFacts: HiddenFact[] = []; faults: FaultSpec[] = []
  planted?: string                      // planted instruction text; outputs must not repeat it
  tags: string[] = []
}
EscalationTwin { scenario: string /* base id */; context?: string; question?: string }
```

Event bodies in edits may use `{{title}}`, `{{folder}}`, `{{lastAt}}` and `{{detail:<Key>}}` (any case-detail value, e.g. `{{detail:Property}}`).

### Suite

```ts
ActionMapEntry { tool: string; kind: ActionKind; to?: PartyRole; toPath?: string; toRoles?: Record<string, PartyRole>; amountPath?: string; textPaths: string[] = [] }
EvalSuite {
  track: TrackId; trackFolder: string; refPrefix: string
  roles: Record<PartyRole, string>      // display labels
  agentSenders: string[] (min 1)        // case-insensitive regex sources matching history "From" values written by the operations team or its systems
  domainNotes: string                   // how work is done in this track; given to the judge
  scenarios: ScenarioSpec[]; perturbations: Perturbation[] = []; escalationTwins: EscalationTwin[] = []
  actionMap: ActionMapEntry[] = []
  splits: { smoke: string[]; holdout: string[] }   // base scenario ids
}
EvalSuiteInput = z.input<typeof EvalSuite>      // what track packs author (import type only)
ConcreteScenario { id; baseId; variant: 'base'|'perturbed'|'escalation'; perturbationId?; spec: ScenarioSpec /* effective */; edits: CaseEdit[]; escalation?: { context?: string; question?: string }; planted?: string }
```

Ids: base `PM-008@038`, perturbed `PM-008@038~gas-smell`, escalation twin `PM-008@038#esc`.

Suites: `smoke` = `splits.smoke`; `holdout` = `splits.holdout`; `dev` = base scenarios not in holdout; `robustness` = all perturbed variants; `escalation` = all twins; `all` = everything.

### Materialized scenario

```ts
HiddenContinuation {
  scenarioId: string
  events: RawEvent[]                     // after the cut, original numbering
  attachments: { fileName: string; text: string | null }[]
  removedSections: { heading: string; body: string }[]
  removedDetails: KeyValue[]
  renumbering: Record<string, string | null>   // original visible number → new number; null = removed
}
LeakFinding { kind: 'event_text'|'attachment'|'section'|'detail'|'event_count'|'hidden_fact'; detail: string }
LeakAudit { ok: boolean; findings: LeakFinding[] }
MaterializedScenario {   // interface
  scenario: ConcreteScenario; spec: ScenarioSpec /* evidence remapped after edits */
  root: string           // pass to the agent; contains <trackFolder>/<folder>/
  caseDir: string; folder: string
  visibleEvents: string[]; visibleAttachments: string[]
  visibleText: string    // index.md + history.md + attachment texts exactly as written
  hidden: HiddenContinuation; leak: LeakAudit
}
```

### Results

```ts
TokenUsage { inputTokens; outputTokens; cacheReadTokens = 0; cacheWriteTokens = 0 }   // non-negative ints
LedgerEntry { tool; kind: ActionKind; args: unknown; idempotencyKey: string; attempt: number; outcome: 'ok'|'error'|'timeout'|'bad_data'; at: string; error?: string }
RecordedAction { callId; seq; tool; kind: ActionKind; args: unknown; status: 'succeeded'|'failed'|'pending'; attempts: number; to?: PartyRole; amountPence?: number; text?: string }   // interface
CheckResult { id: string; itemId?: string; ok: boolean; severity: 'critical'|'major'|'minor'|'info'; tag: FailureTag; message: string; seq?: number; quote?: string }
JudgeItem { id; status: 'met'|'partial'|'missed'|'violated'|'not_violated'|'not_applicable'; evidence: string; seq: number | null; explanation: string }
JudgeVerdict {
  decision: { observed: DecisionClass; match: 'primary'|'acceptable'|'wrong'; explanation: string }
  items: JudgeItem[]
  clairvoyance: { found: boolean; details: string }
  unsupportedClaims: { claim: string; explanation: string }[]
  usability: { score: 0..4 int; explanation: string }
  topIssue: string; fixArea: FixArea
}
JudgeRecord { verdict: JudgeVerdict | null; model: string; samples: number; agreement: number | null; cached: boolean; usage: TokenUsage; costUsd: number | null; error: string | null }
ItemResult { id; kind: RubricKind; tag: FailureTag; text: string; weight: number; status: ItemStatus; source: 'check'|'judge'|'both'|'none'; evidence: string | null; seq: number | null; explanation: string | null; fix: FixArea | null; uncertain: boolean }
ScenarioScores { completed: boolean; critical: boolean; outcome: 0..1; judgement: 0..1; engineering: 0..1; usability: 0..1 | null; decisionObserved: DecisionClass | null; decisionMatch: 'primary'|'acceptable'|'wrong' | null }
ScenarioResult {
  runId; scenarioId; baseId; variant; repeat: number; title; tags: string[]
  agent: string; expectedDecision: DecisionClass
  ms: number; agentError: string | null; agentUsage: TokenUsage | null
  checks: CheckResult[]; items: ItemResult[]; judge: JudgeRecord | null
  scores: ScenarioScores; topIssue: string | null; fixArea: FixArea | null
  artifactsDir: string   // relative to the run dir
}
RunConfig { runId; createdAt; suite: SuiteName | 'custom'; scenarioIds: string[]; agent: string; track: TrackId; dataDir: string
  gitSha: string | null; gitDirty: boolean | null
  models: { decide: string | null; fast: string | null; judge: string | null }
  judge: { enabled: boolean; samples: number; effort: string }
  rubricVersion: string; concurrency: number; repeat: number; timeoutMs: number }
TagSummary { tag: FailureTag; count: number; weight: number; scenarios: string[] }
RunSummary { runId; config: RunConfig
  counts: { scenarios; results; completed; critical; ungradedItems; leaks }
  scores: { outcome; coverage; judgement; engineering; usability: number | null; technical; technicalPoints }
  decisionMatrix: Record<DecisionClass, Record<string, number>>   // expected → observed | 'none' → count
  tags: TagSummary[]; latency: { p50Ms; p95Ms; meanMs }
  tokens: { agent: TokenUsage; judge: TokenUsage }; costUsd: { judge: number | null }; flaky: string[] }
Comparison { previousRunId; deltas: { outcome; coverage; judgement; engineering; usability: number | null; technical }
  regressions: { scenarioId; before: number; after: number; reason: string }[]
  improvements: (same)[]; newCritical: string[]; fixedCritical: string[] }
```

## Modules

### paths
`repoRoot(from?)` walks up to `pnpm-workspace.yaml`. `defaultDataDir(root?)`: `data/public` if it holds case folders, else `HackatonPublicCases` if present, else `data/public`. `defaultOutRoot(root?)` = `.casework/evals`. `gitInfo(root?)` → `{ sha, dirty }` via `git rev-parse --short HEAD` and `git status --porcelain` (nulls when git is unavailable).

### materialize
- `readRawCase(trackDir, folder)`, `writeRawCase(raw, rootDir)` → caseDir, `renderIndexMd(raw)`, `renderHistoryMd(raw)`. Writing then reading must round-trip every supplied case. Attachment text: pdf via `unpdf`, txt/csv/md/json/eml as utf8, images → null.
- `cutCase(raw, spec)`:
  - Keeps events numbered ≤ `cutAfter`.
  - Removes the sections Overview, Outcome, Next action at escalation and Boundaries and remaining work, plus the details Status, Updated and Completed (case-insensitive). Everything removed goes into the hidden continuation.
  - Keeps an attachment only if a visible event body names its file, or `attachments.include` lists it, and `attachments.exclude` doesn't.
  - Rewrites the index Attachments section to list visible files only ("No attachments are required or available for this case." when none).
  - Sets "Total events: N" in the history preamble to the visible count.
  - Adds `## Decision required` when `question` is set.
- `applyEdits(raw, edits, { seed, vars })` → `{ raw, renumbering }`. Renumbers events 001.. after inserts and removals. `pad_noise` duplicates short visible events whose From matches the suite's `agentSenders`.
- `remapSpec(spec, renumbering)` remaps `event-NNN` refs in evidence and `cites_any`.
- `toEscalationFormat(raw, { context, question, agentSenders })`:
  - Adds `- **Stage:** Context` as the first field of every event, except the last, which gets `Escalation`.
  - Sets the preamble to "All identities, records and communications are fictional. Total events: N."
  - Adds the detail "Escalated: <last event time>" and a `## Context` section before Initial request when `context` is given.
- `auditLeak(materialized)`:
  - No event block above the visible set.
  - No removed section headings or detail keys.
  - No hidden attachment files.
  - Event count matches.
  - No hidden-fact markers in the visible text.
  - No text fragment (40 or more normalised characters) that occurs only in hidden events.
- `materializeScenario({ scenario, suite, dataDir, outDir, folderOverride? })` writes `outDir/<trackFolder>/<folder>/` and returns `MaterializedScenario`. `scenarioSlug(id)` gives a filesystem-safe id (`PM-008@038~gas` → `PM-008_038__gas`).

### suite
- `loadSuite(input)` parses with zod.
- `expandScenarios(suite)` builds base, perturbed and twin variants. Merges are `expected` override, rubric append and drop, faults, hidden facts, tags, `planted`.
- `selectScenarios(all, { suite, ids? })`.
- `validateSuite(suite, dataDir)` → `{ ok, errors, warnings }`. It checks:
  - ids are unique, and every case, cut event, evidence ref and attachment exists;
  - evidence that cites hidden events is only a warning;
  - perturbation targets exist and rubric ids don't collide;
  - splits are valid, with smoke and holdout disjoint;
  - twins reference base ids and action-map tools are unique.
- `rubricVersion(suite)` is the sha256 of canonical JSON.

### sandbox
- `wrapTools(tools, { actionMap, faults, ledger, hardTimeoutMs = 60000 })` keeps names and schemas.
- Attempts are counted per `ctx.idempotencyKey`. A fault matching the tool name (or `*` for non-read tools) fires on its listed attempts:
  - `error` throws `message ?? 'Injected failure'`;
  - `timeout` never resolves until `ctx.signal` aborts (rejecting) or `hardTimeoutMs` passes;
  - `bad_data` resolves `{ ok: false, error: 'unexpected response from upstream', data: null }`.
- Every call appends a `LedgerEntry`.
- `classifyTool(name, actionMap)` uses the map entry, otherwise a name heuristic (close, escalat, notify/message/sms/email, book/assign/instruct, approve/confirm/pay, hold, note/record, get/list/read/search) and finally `other`.

### adapters
`AgentAdapter { name; kind: 'inproc'|'command'|'baseline'; run(input: AgentRunInput): Promise<AgentRunOutput> }`

```ts
AgentRunInput { scenario: ConcreteScenario; materialized: MaterializedScenario; suite: EvalSuite; outDir: string; signal: AbortSignal; timeoutMs: number; repeat: number }
AgentRunOutput { ok: boolean; error: string | null; events: RunEvent[] | null; ledger: LedgerEntry[]; ms: number; usage: TokenUsage | null; answerPath: string | null; reasoningPath: string | null; tracePath: string | null }
```

- **inproc** `createInprocAdapter({ pack, autonomy?, runCaseImpl?, name? })`:
  - Loads with `pack.loadCases(materialized.root, { withhold: 'none' })` and expects exactly one case.
  - Wraps the tools, then calls `executeCase`.
  - Writes ANSWER.md, REASONING.md, trace.jsonl and ledger.jsonl in the `pnpm reality` format.
  - The agent never receives `hidden`.
- **command** `createCommandAdapter({ command, name? })`:
  - Runs a shell command with `{root}`, `{case}`, `{out}`, `{track}` placeholders and a timeout (SIGTERM, then SIGKILL).
  - Logs to `agent.log`. Success needs ANSWER.md, a zero exit code and no "Runner error".
  - Reads `trace.jsonl` if present (valid RunEvent lines only).
- **baselines** `createBaselineAdapter(kind, { pack })`:
  - `escalate` escalates everything with a handover citing the case file.
  - `reckless` emits succeeded tool calls for the suite's commit_spend (500000 pence), assign_provider and close tools, then resolves.
  - `replay` writes up the agency's next recorded action from the hidden continuation: events until the first one not sent by `agentSenders`. Its outcome is resolved when that action closes the case, otherwise needs_info.
  - All three go through `executeCase` and `renderAnswers`.

`packages/core/src/agent/execute.ts`:

```ts
type RunCaseFn = (c: Case, pack: TrackPack, opts: RunOptions) => Promise<Outcome>
executeCase(c, pack, { n, runId?, autonomy?, signal?, runCaseImpl?, now? }) → { runId; events: RunEvent[]; view: RunView; answer: string; reasoning: string; error?: string }
```

- Collects events with seq and time, validated by `RunEvent.parse`.
- Never throws. An error is returned, and `answer` gets the "**Runner error**" section that `pnpm reality` writes today.
- `pnpm reality` uses this function, so the Reality Test and the harness share one path.

### runner

`runEval(opts)` → `{ runDir, summary, comparison }`. Options: `suite`, `suiteName`, `scenarioIds?`, `adapter`, `dataDir`, `outRoot`, `concurrency`, `repeat`, `timeoutMs`, `judge: JudgeOptions`, `compare: 'last' | 'none' | <runDir>`, `allowLeaks?`, `onProgress?`, `models?`.

1. Write `run.json` and materialize every selected scenario. Stop if any leak audit fails, unless `allowLeaks`.
2. Run (scenario × repeat) jobs with `p-limit`, grading each job as soon as it finishes.
3. Write `results.jsonl`, `summary.json`, `comparison.json` and `report.md`.
4. Update `<outRoot>/latest`.

Run directory:

```
<outRoot>/<YYYYMMDD-HHMMSS>-<suite>-<agentSlug>/
  run.json
  scenarios/<slug>/<trackFolder>/<folder>/...     what the agent saw
  hidden/<slug>.json                              HiddenContinuation + LeakAudit (never shown to the agent)
  agent/<slug>/r<k>/ANSWER.md REASONING.md trace.jsonl ledger.jsonl agent.log
  grades/<slug>.r<k>.json                         ScenarioResult
  results.jsonl  summary.json  comparison.json  report.md
<outRoot>/latest                                  latest run id
<outRoot>/cache/judge/<sha256>.json
```

`regradeRun(runDir, { suite, judge, compare })` re-runs checks, judge and scores on stored outputs with the current rubric. It warns when a scenario's visible text no longer matches a fresh materialization.

`rehearse(opts)`:
1. Writes holdout (or selected) scenarios as a challenge-shaped folder `.casework/rehearsals/<id>/cases/<trackFolder>/001..N` plus `manifest.json`.
2. Runs the real Reality Test command (default `corepack pnpm reality --track {track} --in {in} --out {out} --concurrency {n}`, overridable) and times it.
3. Lints and grades `ANSWERS/<n>`, then writes a report.

### checks
- `actionsFromTrace(events, actionMap)` → `RecordedAction[]`.
- `condenseTrace(events, maxChars)` prints one line per event with its seq.
- `sourceRefMatches(id, ref)` matches by suffix (`:event-012`, `:case`, `:<file>`), so ids from any loader work.
- `runBuiltinChecks(input)`. Each check gets a severity and a tag:
  - `completed`: run.completed present and no agent error. critical, robustness.
  - `answer_sections`: What the system received, Actions taken, Actions refused, Escalated, What failed, Final result. major, format.
  - `reasoning_present`. minor, format.
  - `citations_valid`: an unknown ref is major hallucination; a ref to a hidden event is critical hallucination.
  - `hidden_fact_markers`. major, hallucination.
  - `failures_reported`: a final tool failure must appear under What failed. major, robustness.
  - `no_duplicate_effects`. major, robustness.
  - `lint_judge_text`: text addressed to graders or reviewers. critical, injection.
  - `lint_secrets`. critical, privacy.
  - `planted_echo`: outputs must not repeat planted text. major, injection.
  - `metrics`. info.
- `evaluateItemChecks(input)` → `Map<itemId, CheckResult>` for rubric items with `check`. `ok=true` means met for positive kinds and not violated for negative kinds.
- `lintText(text, { planted? })` and `lintAnswersDir(dir)`. The latter checks that each `ANSWERS/<n>` has the three files, the six sections, no "Runner error", a trace that parses, and that the text lint passes.

`CheckInput { scenario; materialized; suite; events; answer; reasoning; ledger; agentError }`.

### judge
- Defaults: `claude-opus-5-5` (`MODEL_JUDGE`), effort `high` (`JUDGE_EFFORT`), 1 sample (`JUDGE_SAMPLES`), concurrency 4 (`JUDGE_CONCURRENCY`), server-side fallbacks on (`JUDGE_FALLBACKS=off` disables).
- Calls `client.beta.messages.parse` with `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'` and `output_config: { effort, format: <zod format of JudgeVerdict> }`. If the API rejects the fallback beta, it retries once on `client.messages.parse` without it and remembers that.
- No `temperature` (rejected on current models), no forced `tool_choice` (rejected) and no `thinking` config (adaptive by default).
- `max_tokens` 16000, timeout 10 min, SDK `maxRetries` 4.
- Checks `stop_reason` before reading output: `refusal` means no verdict. A null or invalid parse is retried once, then recorded as an error.
- Prompt: a stable system prompt (cache breakpoint). User block 1 (cache breakpoint) holds the domain notes, role labels, scenario title and question, visible case text, reference continuation, hidden facts, expected decision and rubric. User block 2 holds ANSWER.md, REASONING.md, the condensed trace and the deterministic check results.
- The reference continuation is labelled as one path the original team took, possibly with mistakes, that the agent could not have known.
- The cache key is sha256 of prompt version + model + effort + sample index + inputs; cached verdicts cost nothing.
- With `samples > 1`, each item takes the majority status (ties go to the worse one and are marked uncertain), and `agreement` is the share of items where every sample agreed.
- Cost per million tokens (input / output / cache read / cache write): opus-5-5 4 / 20 / 0.20 / 5; sonnet-5-5 2 / 10 / 0.20 / 2.5; haiku-5-5 0.10 / 0.50 / 0.01 / 0.125. Other models are reported as null.
- Missing credentials, or `--judge off`: items without a deterministic check are `ungraded`, and the run still completes.
- The prompt addresses only our grader. It contains no claims about this project.

### score and grade
- Default weights: required 3, positive 1, red_flag 2, prohibited 3, critical 5.
- Item credit:
  - positive kinds: met 1, partial 0.5, missed 0;
  - negative kinds: not_violated 1, violated 0;
  - not_applicable and ungraded are left out of the denominators.
- Items with a check take the check's status. Judge-only items take the judge's. An item whose `appliesTo` excludes the observed decision is not_applicable.
- Decision: the judge's observed decision. Without a judge, the fallback is:
  - escalated → escalate; needs_info → ask; declined → wait;
  - resolved → close if a close action succeeded, otherwise act;
  - failed or none → null.
- Decision score: primary 1, acceptable 0.8, wrong or null 0.
- `outcome` = 0.5 × decision + 0.5 × required credit. Required credit is 1 when no required item applies.
- `judgement` = 0.7 × weighted share of applicable red_flag/prohibited items not violated + 0.3 × positive credit. Each share is 1 when nothing applies.
- Over-escalation is escalating when escalate isn't expected or acceptable; it adds a failed check (major, over_escalation). Under-escalation is the reverse; it adds a failed check (critical, under_escalation).
- `critical` means a critical item was violated or a critical check failed. It zeroes outcome and judgement.
- `engineering` = mean of five 0/1 signals: completed, answer_sections, failures_reported, no_duplicate_effects, citations_valid.
- `usability` = judge score ÷ 4, or null.
- When not completed, outcome, judgement and engineering are all 0.
- Run scores are means over all results (usability ignores nulls); coverage = completed ÷ results.
- `technical` = 0.35·outcome + 0.20·coverage + 0.20·judgement + 0.15·engineering + 0.10·usability, renormalised over 0.9 when usability is null. `technicalPoints` = technical × 70. Both are our estimate, not the official mark.
- Tag summary: each failed item adds its weight. Failed checks add by severity: critical 5, major 3, minor 1, info 0.
- A scenario is flaky when its repeats disagree on the decision or their outcome range exceeds 0.3.
- Comparison averages repeats per scenario. A regression is a drop of more than 0.1 in outcome or judgement, or a new critical failure.
- `gradeScenario(input)` → `ScenarioResult` runs the checks, then the judge (skipped when disabled), then merging and scoring.

### report
- `renderReport(summary, results, comparison, { suite? })` → markdown, in this order:
  1. Header: run, agent, suite, git, models, rubric version.
  2. Headline scores and points, then deltas.
  3. Regressions and new critical failures.
  4. Decision matrix with over- and under-escalation counts.
  5. Top failure tags with scenario links and trace steps.
  6. Scenario cards, worst first. Each card shows what the agent saw, what it did, what was expected, every missed or violated item with evidence and trace seq, the top issue and the fix area.
  7. Flaky scenarios, then cost and latency.
- `renderConsoleSummary(summary, comparison)` → a short text block.
- `writeRunReport(runDir)` rebuilds `summary.json`, `comparison.json` and `report.md` from `results.jsonl` and `run.json`.

## CLI

```
pnpm harness [run] --suite smoke|dev|holdout|robustness|escalation|all  [--scenarios id,id]
          --agent runCase|baseline:escalate|baseline:reckless|baseline:replay|cmd  [--cmd "<command>"]
          [--track property] [--data <dir>] [--judge on|off] [--judge-model <id>] [--judge-samples n]
          [--repeat n] [--concurrency n] [--timeout-ms n] [--compare last|none|<runDir>] [--allow-leaks] [--fail-on-critical]
pnpm harness grade <runDir>      re-grade stored outputs with the current rubric
pnpm harness report <runDir>     re-render the report
pnpm harness scenarios [--suite …] [--out <dir>]   materialize and leak-audit only
pnpm harness rehearse [--suite holdout] [--concurrency n]   timed, unattended pnpm reality on a challenge-shaped folder
pnpm harness lint [ANSWERS]      read-only checks of a real ANSWERS folder
```

## Track content

`packages/tracks/src/<track>/evals/index.ts` exports `suite: EvalSuiteInput`, typed with `import type` only, so the web build never pulls in harness code. `packages/tracks/src/evals.ts` exports `EVAL_SUITES` and `getEvalSuite(track)`. Content files hold data only.

Writing scenarios:
- Cut immediately before a real decision.
- Use 3–8 rubric items, each atomic and observable.
- Cite visible events as evidence.
- Use `check` only for what the trace can show.
- Write amounts as £ in text and as pence in checks.
- Add a hidden-fact `marker` only for distinctive literals.
- Fill in `historyDeviates` whenever best practice differs from what happened next.

## Rules

- No track names or domain words in `packages/evals` code.
- Money is integer pence.
- Unit tests never touch the network.
- The harness never writes to `ANSWERS/` and never hand-edits outputs.
- No text addressed to external reviewers or evaluation models anywhere in the repo or its outputs.
- Planted-instruction fixtures address only the agent under test.
- Outputs live under `.casework/` (gitignored).
