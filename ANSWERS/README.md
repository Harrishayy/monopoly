# ANSWERS: Reality Test results

`pnpm reality` generates everything in this folder. **Do not edit these files by hand.** If a case failed, the failure stays in the output. To change a result, fix the system and re-run it.

```bash
pnpm reality --track property --in data/challenges --out ANSWERS
```

Each case gets its own folder:

```
ANSWERS/<n>/
  ANSWER.md      Next step and recipient, the message, why (cited sources), the handover if escalated,
                 disagreements, boundaries, what is still open, how it was decided, what failed
  REASONING.md   Route taken, forced triggers and warnings, every vote, the supervisor's review,
                 guard refusals, the decision, every model call with tokens and cost
  trace.jsonl    Full trace of the run (inputs, model calls, retries, errors)
```

`ANSWERS/run.json` records the agent, track and timings. `<n>` is the supplied case number: `data/challenges/<Track Folder>/007/` → `ANSWERS/7/`.
