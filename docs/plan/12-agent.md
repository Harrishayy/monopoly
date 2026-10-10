# 12 · Agent: proposed upgrades to agent B

> **NOW (results).** Read `11-property-workflow.md` and `packages/agents/src/b/PLAN.md` first. This doc doesn't replace either. It lists the few ideas from our architecture discussion that agent B doesn't have yet, each written as an experiment to run on the bench (`pnpm bench`). An idea only ships if it beats the current configuration on `val`, then on `test`.

## What already exists

The architecture we discussed (a rulebook, a leader that works out the state of the job before deciding, code checks, a critic, escalation when the agent is unsure, and an answer for every case) is already built as agent B. The table maps each idea to its implementation:

| Idea | Where it lives |
|---|---|
| Rules extracted from the cases, global vs situational | `b/knowledge/property/manual.md` (written from the 30 dev cases, so `val`/`test` stay unseen), plus `11-property-workflow.md` and agent A's `assess.ts` |
| Escalation principles from the other tracks | `b/knowledge/_default/manual.md`; `pnpm --filter @casework/agents judge` runs B on the other tracks' escalation examples |
| Leader writes the state of the job before deciding | B's `situate` stage (task, stage, parties, open asks, conflicts, missing, noise, risks, injection) |
| Plan up to the next point where we wait | B's `decide`: one next action with message, boundaries and remaining work |
| Code checks that never interpret free text | B's `hardChecks`: citations inside the snapshot, no unsourced amounts or dates, no chase before a promised date, no close while something is open |
| Critic and a bounded revision | B's `critique` + one `revise` |
| Disagreement means ask or escalate | B's `gate`: the 3 samples must agree; disagreement or a twice-revised plan leads to ask, or else escalate |
| An answer for every case | Stage fallbacks, then `fallbackDecision` built from the ledger; a time budget for each case |
| Clean eval split | `bench/split.json`: a seeded split of cases into dev / val / test |

## Corrections to the first draft of this doc

The first draft was written before reading the work above, and three of its claims were wrong for this data:
- **There is no spending limit.** The data never shows one, and the £300 default has been removed (`11-property-workflow.md`). Every quote goes to the landlord.
- **Approval only gates the start of work.** A hard stop of "no contractor action without a landlord approval on record" causes the main failure Harrish measured: 56 of Haiku's 89 first misses re-asked the landlord or escalated because approval simply wasn't recorded. Once a contractor is assigned, treat approval for that visit as given.
- **Names and addresses changing within a case is anonymisation noise, not a conflict.** In case 048, the contractor's report gives a different address. That's noise. The real conflict in 048 is work done beyond the approved scope.

## Proposed experiments, in priority order

### E1 · A stronger decide model

`registry.ts` runs every stage of both agents on `claude-haiku-5-5`. On the first prompt, `claude-opus-5-5` scored **77.5% against Haiku's 65.5%** on the same 258 cuts. The current prompt was then tuned only on Haiku (81.0% on tuning, 74.3% held out). Nobody has measured Opus with the tuned prompt.

- **Run:** `pnpm bench --split val` comparing agent B with Opus on the decide stage only (situate and critic stay on Haiku) against Haiku throughout. Then Opus for decide *and* critic.
- **Watch:** latency per case and API rate limits. Batches already need concurrency ≤ 5. Run `pnpm harness rehearse` at the concurrency we'd use at 16:30.
- **Ship if:** `val` improves beyond run-to-run noise (about ±5 points on 70 cuts) with no rise in prohibited actions, and the full batch still finishes well inside 30 minutes.
- **Change needed:** `getAgents` overwrites every model variable from one `--model`. It needs a separate decide-model option (for example `--decide-model`) so the stages can differ.

### E2 · A critic that isn't the decider

B's critic uses `MODELS.decide()`, the same model that wrote the plan, and a model tends to approve its own reasoning.

- **Run:** critic on a different model from the decider. The cheapest version is Opus critiquing a Haiku decision. A different provider (GPT) gives the most independent check but adds a second API that has to stay up during the Reality Test. Only try it if the Opus critic helps and an `OPENAI_API_KEY` is available.
- **Ship if:** fewer unsupported claims and missed conflicts, and no rise in escalations that weren't needed.
- **Fallback:** if the critic's provider fails, use the decider's model. If that fails too, ship the decision marked "not independently reviewed". A critic failure never costs a case.

### E3 · Answering the critic issue by issue, and escalating when they still disagree

Today a `revise` verdict gets one revision call, and the gate then judges by sample agreement.

- **Change:** the critic returns separate issues (`blocking` or `minor`, each citing an event or a manual section). The revise call must answer **each** blocking issue with *accept and fix* or *reject with evidence*. If a blocking issue is still rejected after the second check, the gate **escalates with both positions**: the handover's options are the decider's plan and the critic's alternative, with the evidence for each.
- **Why:** a revision that just gives in to the critic can fix a correct decision into a wrong one. Making it argue back with evidence prevents that. A persistent disagreement between two models is also a genuine sign of uncertainty, which is what the *Best Exception Handling* award looks at.
- **Ship if:** a better `val` score, *and* the escalations it adds are the right ones on the escalation-format examples (`judge`).

### Not proposed

- **Regenerating the rules with evidence and support counts.** The manual and `assess.ts` already hold the learned rules, and the remaining misses are spread thin (`11-property-workflow.md` § Evaluation). Rebuilding the rulebook would cost an hour without targeting a known failure.
- **An unlimited leader–critic loop.** It's capped at the existing single revision plus E3.

## Open questions for the team

1. **Which agent runs the Reality Test?** `pnpm reality` and the live product run agent C (`ENGINE=c`). Pick another with `ENGINE=a|b|d` or `pnpm reality --agent a`.
2. **Three eval entry points.** `pnpm eval` (agent A on the 258 cuts), `pnpm bench` (agents A and B on the same cuts, by split) and `pnpm harness` (`packages/evals`: rubric scenarios with a Claude judge, `11-evals.md`) overlap. The cuts and the bench hold the published numbers, so the bench should stay the scoreboard. `pnpm harness` adds perturbed variants (safety signals, planted instructions, tool failures) and the timed `rehearse` check, and is worth keeping for those.
3. **Doc numbering.** `11-evals.md` and `11-property-workflow.md` share a number. One should be renumbered.
