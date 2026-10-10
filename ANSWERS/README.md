# ANSWERS: Reality Test results

**Track: Property Management** (30 cases, `HackatonChallenges/Property Management/001`–`030`).

These are the unedited outputs of **agent C** (`packages/agents/src/c`), run once on 2026-10-10
from 16:37 to 16:46 BST. Models: Haiku 5.5 reads the case, Opus 5.5 decides, Sonnet 5.5 reviews.
`run.json` records the agent, track, models and timings. **Nothing in this folder is edited by hand.**
If a case failed, the failure stays in the output.

Command:

```bash
EVAL_BACKEND=claude-code pnpm --filter @casework/agents answer --agent c \
  --in "data/challenges/Property Management" --out <dir>
```

The agents CLI names its output folders `1`–`30`. They were copied into `001`–`030` to match the
case numbers.

Each case gets its own folder:

```
ANSWERS/<NNN>/
  ANSWER.md      The decision and next action, the actions taken and their results, actions refused,
                 the handover to a person if escalated, missing information and conflicts, boundaries
  REASONING.md   What the system received, computed facts, the model's reading of the situation,
                 independent proposals, rule checks, every review round, failures, every model call
  trace.jsonl    Full trace of the run: inputs, each stage, model calls, checks and errors
```
