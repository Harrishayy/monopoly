# Agent B

A second, independent case agent, built alongside the main one (`packages/core` + `packages/tracks`). It has no
dependency on either, so the two can be developed in parallel and scored on the same evaluation. The design is
in [PLAN.md](PLAN.md); this file describes what is built and how to run it.

## What it does

Given a case folder in any shape (a record, a history, attachments), it decides the **single next action** from
the decision moment: what to do, who it goes to, through which channel, the message itself, why, what the action
does not settle, and whether a person must take over. Every claim cites the event, section or attachment it
relies on.

```
ingest ─► ledger ─► situate ─► decide ×3 ─► check + review (revise once) ─► gate ─► ANSWER.md / REASONING.md / trace.jsonl
 code      code      model       model        code + model                    code
```

| Stage | File | What it does |
|---|---|---|
| Ingest | `src/ingest/` | Generic markdown reader: headings become sections, and `Key: value` lines become fields with no names assumed. Splits history on dated or numbered headings, then on timestamped lines, then keeps one block. Reads PDFs, text, CSV and JSON; images are sent to the model. Unknown files become attachments. Honours a snapshot the case states. Practice mode hides answer sections. |
| Ledger | `src/facts/ledger.ts` | Deterministic facts: each party's messages and the requests to them still unanswered, amounts with VAT notes, dates mentioned (including "on Monday" or "tomorrow") and whether they have passed, failure markers, and repeated system notes. |
| Situate | `src/stages/model-stages.ts` | The model reads the case: the task, the stage, who the next move is waiting on, parties and their authority, requests made and answered, commitments, conflicts, missing information, failures, noise, risks, and any text that tries to instruct the agent. |
| Decide ×3 | same | Three independent proposals from a fixed set of actions (`send_message`, `request_information`, `chase`, `wait`, `escalate_to_human`, `update_record`, `close_case`, `other`). |
| Check | `src/stages/check.ts` | Rules that test the decision against exact facts only. Every citation must exist inside the snapshot. Every amount must come from the records or be derivable from them (a sum, or adding or removing VAT). It refuses to chase someone before a date they gave, to close with requests still open, or to leave a critical safety risk with a wait, close or record-only action. |
| Review | same | A separate model call acting as a strict operations lead returns pass, revise or escalate. The decision is revised once at most, then reviewed again. |
| Gate | `src/stages/gate.ts` | Deterministic choice between acting, asking and escalating, based on agreement between the samples, the review and the rule results. When a rule is still broken, it falls back to a clean sample before escalating. Every escalation carries a handover packet. |
| Write | `src/output/render.ts` | `ANSWER.md`, `REASONING.md` (what was received, what was hidden, the facts, the situation, the proposals, the checks, the review, the gate rule, failures, and every model call with its request id and token counts) and `trace.jsonl`. |

Domain knowledge lives in prose manuals, not code:
- `src/knowledge/property/manual.md`, learned from the 50 property examples: the stages, who has authority,
  measured chase timings, the re-ask ladder, escalation triggers, spend and approval rules, red flags, noise
  patterns, and worked examples.
- `src/knowledge/_default/manual.md`, learned from the 150 labelled escalation examples in the other tracks:
  how narrow a next action should be, recipient and channel patterns, boundary types, and judgement rules. It
  is always loaded, so a case from a track we never studied still gets sensible rules.

**Failure handling.** Each model call returns structured output through a forced tool and is validated with zod.
If the output is invalid, the call is retried with the error shown to the model, then tried on a fallback model.
If one stage fails, the next stage still runs without it. If every model stage fails, or there is no API key,
the case gets an honest escalation built from the ledger that names what failed. `runCase` never throws, and
there is a time budget per case. The manual and the case dossier are prompt-cached across stages.

## Run

```bash
# Reality Test (cases as supplied); writes <out>/<n>/{ANSWER.md,REASONING.md,trace.jsonl} and SUMMARY.md
pnpm --filter @casework/agent-b answer --in "data/challenges/Property Management" --out ANSWERS

# Practice on the examples with their outcomes hidden
pnpm --filter @casework/agent-b answer --in "data/public/Property Management" --withhold outcomes

# Evaluation: 150 labelled escalation examples + 258 property cut points, scored by a model judge
pnpm --filter @casework/agent-b eval --set all --limit 40
```

Options: `--track auto|property|insurance|banking|logistics`, `--cases 001,002`, `--concurrency 4`,
`--samples 3`, `--offline`. The default output is `.casework/agent-b/` (gitignored).

Environment variables (read from the repo's `.env`):
- `ANTHROPIC_API_KEY` is required for model stages.
- Every stage runs on `claude-haiku-5-5` by default. Agent B ignores the shared `MODEL_DECIDE`.
- `AGENT_B_MODEL_DECIDE` overrides the model for decide and review.
- `AGENT_B_MODEL_READ` overrides the model for situate, digest and the eval judge.
- `AGENT_B_MODEL_FALLBACK` overrides the model used after two failed attempts. If it is the same as the main model, the last attempt is skipped.

## Test

```bash
pnpm --filter @casework/agent-b typecheck
pnpm --filter @casework/agent-b test
```

There are 38 tests. They cover:
- every one of the 200 public examples parsing with no anomalies
- malformed fixtures: other file names, a plain-text history, no history, odd headings, duplicate event
  numbers, CSV attachments, injected instructions
- the snapshot and withholding rules
- the ledger, the hard rules and the gate
- the full pipeline against a mock model: revise, then re-review; partial and total model failure; an unreadable folder
- the schemas sent to the API

## Limitations

- The model stages and the eval judge have not yet run against the live API from this machine (there is no API
  key here). The pipeline is tested end to end with a mock model, and offline runs over all 50 property cases
  produce an answer for every case.
- The "possible failures" detector and the unanswered-request counts are keyword heuristics. They are shown to
  the model as hints and are never used to block an action.
- Chase timings in the property manual are medians from 50 cases. Gas, fire and electrical emergencies hardly
  appear in the data, so those triggers are generalised rather than observed.
