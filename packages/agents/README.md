# @casework/agents

The case agents in one place: one interface, one test bench, one CLI.

**Agent C is the agent.** The product and `pnpm reality` run it. Agents A, B and D are archived: kept
for the bench and because C is built on B's modules (loader, ledger, checks, gate, prompts). Don't
pick them for the Reality Test.

```
packages/agents/src/
  agent.ts        the common interface: decide(case) → AgentDecision; answer(cases) → ANSWERS folders
  registry.ts     getAgents(['a','b'], { model }); one model setting for both (default claude-haiku-5-5)
  a/              (archived) agent A adapter. The engine is in @casework/core (guarded tool loop) and
                  @casework/tracks (property pack: assessment, tools, policy, prompt), which the web app also uses
  b/              (archived as an agent; C uses its modules) agent B, a fixed pipeline: ingest → ledger → situate → decide ×3 → check + review → gate → write
                  (design notes in b/PLAN.md)
  c/              agent C: agent B's pipeline with a stronger decider, a reviewer on a different model and a review
                  dialogue (docs/plan/12-agent.md, experiments E1–E3)
  d/              (archived) agent D: A's rules + forced triggers in code + 3 Haiku votes + gated Opus supervisor + code guard
                  (design and measurements in docs/plan/12-agent-d.md)
  bench/          split.json (fixed dev/val/test), labels, few-shot memory, shared scorer, model judge
  cli.ts          answer · bench · judge · split
```

## Commands

From the repo root:

```bash
pnpm bench --agent a,b --split val                 # score both agents on the validation cases
pnpm bench --agent b --split test --name "final"   # the held-out test set; run rarely
pnpm answer --agent c --in "data/challenges/Property Management" --out ANSWERS   # Reality Test (C is the default)
pnpm answer --agent a --in "data/public/Property Management" --withhold outcomes  # practice
pnpm --filter @casework/agents judge --limit 30    # agent B on the other tracks' escalation examples
pnpm --filter @casework/agents split               # print the split
```

To run the bench or harness on a Claude Code plan instead of the API (no `ANTHROPIC_API_KEY`):

```bash
# once: install Claude Code and sign in
claude

EVAL_BACKEND=claude-code pnpm bench --agent c --split val --limit 10
pnpm harness run --agent c --suite smoke --backend claude-code --judge on
```

`claude -p` is used for every model call (agents and the judge). Tools are disabled. Default concurrency is 2. Scores will not match API-graded runs.

Flags:
- `--model`: one model for both agents. Default `claude-haiku-5-5`.
- `--labels both|cuts|holdout`
- `--limit N`: an evenly spread subset.
- `--examples dev|all|none`: agent B's few-shot memory.
- `--manuals off`
- `--offline`: agent A runs its rules only; agent B escalates with a fallback.
- `--concurrency N`
- `--kind`, `--name`, `--note`: these are written to `run.json` in each output folder.

Outputs go under `.casework/agents/`, which git ignores.

## How results are scored

- **Labels.** These are moments in the 50 property example histories where we know what the team did next. Each one lists the actions that would be accepted and the ones that would be wrong at that moment:
  - `packages/tracks/src/property/eval/cuts.json` has 258 of them.
  - `holdout.json` has 70 more, each at least two events away from every cut in `cuts.json`.
- **Split** (`bench/split.json`). The 50 cases are split 30/10/10 into development, validation and test, with a fixed seed. The split is stratified by job type, so every set includes check-outs, appliances, plumbing, doors, windows and gardens. All the moments from one case stay in the same set.
- **One scorer for both agents.** A decision counts as correct when its action is on the accepted list. A "near miss" went to the right party but chose the wrong action. "Prohibited" means it chose an action the label lists as wrong at that moment.
- **Shared vocabulary.** Agent B chooses from the same action list as agent A, taken from the property track pack (`landlord.send_quote`, `tenant.ask`, …), so the two are scored on the same terms.

### Keeping the evaluation honest

- **Agent B** learns only from the development cases:
  - The property manual was rebuilt from those 30 cases alone, and the bench checks that it cites no other case.
  - Its few-shot memory, used during evaluation, contains only development moments.
  - Validation is for choosing between versions; test is scored once.
  - For the Reality Test, its memory uses every labelled case (`--examples all`).
- **Agent A**'s rules and prompt were tuned on all 50 cases, so its validation and test scores are not held out. The holdout labels are held out at the level of individual moments, not whole cases.

## Agent B in one paragraph

Agent B:
- reads a case folder of any shape, hiding events and attachments from after the decision moment
- works out facts in code (who owes a reply, amounts, dates promised, failures)
- has the model describe the situation, then makes three independent proposals using the track's own actions
- checks each proposal against hard rules
- has a separate model call review it, revising at most once
- decides in code whether to act, ask or escalate

Domain knowledge is written as prose manuals in `b/knowledge/`; there are no keyword rules. If the model fails, every case still gets an honest escalation that says what failed. See `b/PLAN.md` for the design.

## Agent C in one paragraph

Agent C reuses agent B's ingest, ledger, dossier, manuals, situate and decide stages, code checks and gate. It changes three things:
- **A model for each stage.** By default Haiku reads the case, Opus decides, and Sonnet reviews, so the reviewer never checks its own work. Override with `--model` (read), `--decide-model` and `--critic-model`, or with `AGENT_C_MODEL_READ`, `AGENT_C_MODEL_DECIDE` and `AGENT_C_MODEL_CRITIC`. Agent B now also accepts `--decide-model` and `--critic-model`; without them, B runs on `--model` throughout as before.
- **A review dialogue.** The reviewer returns numbered issues, each `blocking` or `minor`, each with a tag and cited evidence. Failed code checks join them as blocking issues. The decider answers every blocking issue: *accept* (and fix the plan) or *reject* (with evidence). A second review sees those answers and either drops an issue or keeps it under the same id (`--rounds`, default 2).
- **Escalating on disagreement.** If the decider rejected an issue with evidence and the reviewer still holds it after the last round, the case goes to a person. The handover lists both positions and the evidence for each. Pass `--dispute gate` to leave these cases to B's gate instead.

REASONING.md shows every round: the issues raised, the decider's answers, the revised plan, and anything still disputed. A failed reviewer call costs a review round, never the case.

## Results (Property, Haiku 5.5, 2026-10-10)

Scored as "the chosen action is in the label's accepted list". Validation has 71 cuts and test has 66 (`cuts.json` + `holdout.json`).

| Agent / setup | Val | Test | Prohibited (val / test) |
|---|---|---|---|
| A: rules + model | 83.1% | 81.8% | 1.4% / 0% |
| A: rules only (no model) | 78.9% | 59.1% | 1.4% / 4.5% |
| B: lean, one decision (default) | 63.4% | 71.2% | 4.2% / 0% |
| B: full pipeline (situate, 3 votes, review) | 52.1% | – | 7.0% |
| B: 3 votes, no review | 63.4% | – | 9.9% |
| B: lean + agent A's rules read as a hint | 59.2% | – | 4.2% |
| B: full pipeline without manuals | 45.1% | – | 9.9% |
| D: A's rules + 3 Haiku votes + gated Opus supervisor | 88.7% | 90.9% | 1.4% / 0% |
| A, re-run on the same 66 test cuts the same day as D | – | 86.4% | – / 0% |
| D v4 (robustness pass: snapshots, injection, same-job rule; see docs/plan/12-agent-d.md) | 86.6% (2 runs) | 87.9% | 1.4% / 0% |

A's rules and prompt were tuned on all 50 cases, so its validation and test scores are in-sample. D is built on those rules, so its scores are in-sample too, and its contracts were measured on the same labels. B's numbers are held out. A scored 81.8% and 86.4% on two test runs, so a difference of about 5 points is within run-to-run noise. D used the supervisor on 38% of val cuts and 41% of test cuts. Estimated cost was $0.029 per test cut, against roughly a third of that for A.

## Outside suite (data/outside, 30 stress cases, Haiku 5.5, three runs each)

| | Run 1 | Run 2 | Run 3 | Prohibited |
|---|---|---|---|---|
| A | 86.7% | 86.7% | 86.7% | 0% |
| B (after the ingest and amount-check fixes) | 96.7% | 93.3% | 96.7% | 0% |
| D, before the loader fallback | 76.7% | – | – | 0% |
| D, with the loader fallback | 86.7% | – | – | 3.3% (112) |

- **A's misses.** A can't load a case with renamed files (127, all three runs). It reads a JSON history as no history (126). It treats a phoned-in "hold off" as news rather than a conflict (111).
- **D's misses.** Once D could fall back to B's ingest, the format-drift cases 125, 126 and 127 all passed. D still takes a routine step where escalating or chasing was expected (107, 111, 130). Its supervisor sent a quote in 112, which counts as prohibited there and passed on the run before.
- **B's misses.** B sometimes escalates where a routine step was expected: a window lock with a security worry (123), and a report written in Polish (129).

## Perturbation suite (real moments, real labels, damaged layouts)

`pnpm bench --suite perturb --agent a,b,d --limit 40`. This takes 40 real moments spread across the validation and test cases. Each one is written as a stand-alone snapshot and then damaged in 8 ways (see `bench/perturb.ts`), giving 320 cases per agent. Run on 2026-10-10 with Haiku 5.5:

| Variant | A | B | D | A with B fallback (`pnpm reality`) |
|---|---|---|---|---|
| clean | 75.0 | 77.5 | **87.5** | 75.0 |
| noise (automated notes) | 80.0 | 80.0 | **90.0** | 80.0 |
| wrong thread mixed in | 75.0 | 72.5 | 75.0 | 75.0 |
| injected instruction | **82.5** | 72.5 | 25.0 (escalates 31/40) | 82.5 |
| JSON history | 17.5 | 82.5 | **87.5** | ≈82.5 (falls back to B) |
| renamed files | 0.0 | 77.5 | 77.5 | ≈77.5 (falls back to B) |
| snapshot layout with later events | 45.0 | **80.0** | 42.5 | 45.0 |
| messy text fields | 17.5 | 80.0 | **87.5** | ≈80.0 (falls back to B) |

No agent closed a case because of the injected instruction.
