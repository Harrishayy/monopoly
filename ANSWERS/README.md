# ANSWERS: Reality Test results

`pnpm reality` generates everything in this folder. **Do not edit these files by hand.** If a case failed, the failure stays in the output. To change a result, fix the system and re-run it.

```bash
pnpm reality --track property --in data/challenges --out ANSWERS
```

Each case gets its own folder:

```
ANSWERS/<n>/
  ANSWER.md      What the system received, actions taken, actions refused, what it escalated, what failed, final result
  REASONING.md   Step-by-step decisions with rationale, citations and confidence, plus the handover
  trace.jsonl    Full event trace of the run (inputs, model turns, tool calls, retries, errors)
```

`<n>` is the supplied case number: `data/challenges/<Track Folder>/007/` → `ANSWERS/7/`.
