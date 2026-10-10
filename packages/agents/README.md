# @casework/agents

Both case agents in one place: one interface, one test bench, one CLI.

```
packages/agents/src/
  agent.ts        the common interface: decide(case) → AgentDecision; answer(cases) → ANSWERS folders
  registry.ts     getAgents(['a','b'], { model }); one model setting for both (default claude-haiku-5-5)
  a/              agent A adapter. The engine is in @casework/core (guarded tool loop) and
                  @casework/tracks (property pack: assessment, tools, policy, prompt), which the web app also uses
  b/              agent B, a fixed pipeline: ingest → ledger → situate → decide ×3 → check + review → gate → write
                  (design notes in b/PLAN.md)
  bench/          split.json (fixed dev/val/test), labels, few-shot memory, shared scorer, model judge
  cli.ts          answer · bench · judge · split
```

## Commands

From the repo root:

```bash
pnpm bench --agent a,b --split val                 # score both agents on the validation cases
pnpm bench --agent b --split test --name "final"   # the held-out test set; run rarely
pnpm answer --agent b --in "data/challenges/Property Management" --out ANSWERS   # Reality Test
pnpm answer --agent a --in "data/public/Property Management" --withhold outcomes  # practice
pnpm --filter @casework/agents judge --limit 30    # agent B on the other tracks' escalation examples
pnpm --filter @casework/agents split               # print the split
```

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
