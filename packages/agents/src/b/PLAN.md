# Agent B: plan

A second, independent agent for the Reality Test, built next to the main one (`packages/core` + `packages/tracks`).
It shares nothing with those packages so both can be built at the same time and compared on the same eval.

## 1. What we are actually solving

From the rules PDF (§4, §5, §9, §11) and the example data:

- At 16:30 we get **unseen escalation cases**. The Banking, Insurance and Logistics examples show the format: an
  `index.md` and a `history.md` cut at an "escalation snapshot", and the expected answer is the **next action at
  escalation** (action, recipient, channel), plus the outcome it should lead to and the **boundaries and remaining
  work** (what this action does *not* prove or settle).
- The Property examples don't have those sections, so Property challenge cases may arrive in a format we have
  never seen. **Don't trust any field name, heading or section to exist.**
- Grading uses required outcomes, acceptable alternatives, positive behaviours, red flags, prohibited actions
  and critical failures. Doing nothing or escalating can be correct. Coverage is 20% of the technical score, so
  **every case must produce an answer**, even when every model call fails.
- The cases may include: conflicting information, failed actions, missing context, unusual exceptions,
  ambiguity, noise, situations needing escalation, and large context.

So each case gets a single, defensible decision: *the next action, who it goes to, through which channel, the
message itself, why, what it does not settle, and whether a person must take over*. Every claim cites its evidence.

## 2. Architecture

```
case folder (any shape)
   │
   ▼
1. INGEST            deterministic, schema-tolerant      → CaseFile (generic, nothing assumed)
   │
   ▼
2. FACTS             deterministic                        → Ledger (times, gaps, amounts, chase counts, failures)
   │
   ▼
3. SITUATE           model, structured output             → Situation (task, stage, parties, open asks, conflicts)
   │
   ▼
4. DECIDE  ×3        model, structured output, sampled    → 3 candidate decisions
   │
   ▼
5. CHECK             hard rules (code) + critic (model)   → verdict: pass / revise / force escalation
   │
   ▼
6. GATE              deterministic                        → final Decision (act / ask / wait / escalate)
   │
   ▼
7. WRITE             deterministic                        → ANSWER.md, REASONING.md, trace.jsonl
```

Why this shape:
- A **fixed pipeline, not a free tool loop.** Every case takes the same steps, so runs are reproducible,
  the trace is readable, and a failure at one stage has an obvious fallback. A loop that "decides when it's
  done" is where coverage gets lost.
- **Code handles anything with an exact answer** (dates, gaps, counts, amounts, which events exist).
  **The model handles anything that needs reading** (what the landlord meant, what stage the case is at).
  This addresses the weakness in agent A: nothing that is read from free text becomes a hard block.
- **Three samples plus a critic** turn "how sure are we?" into something measurable. If the samples disagree,
  the case is ambiguous, and the gate leans towards asking or escalating. That's the judgement-and-safety score.

### 2.1 Ingest: handles any schema

`src/ingest/`
- `markdown.ts`: a generic parser. Headings become sections, `- **Key:** value` and `Key: value` lines become
  fields, and anything else is kept as body text. **No field names are hard-coded.** We use known names when
  they're present (`Created`, `Channel`, `From`, `To`, `Stage`) and carry everything else through as is.
- `history.ts`: splits events on any heading that contains a timestamp and/or `event N`. If no events are found,
  the whole file becomes one raw source and an anomaly is logged.
- `attachments.ts`: extracts text from PDFs (`unpdf`), reads csv/txt/json/md as text, sends images to the model
  as image blocks (vision), and records anything else by name.
- **Unknown files** in the case folder are read as text and included.
- **Snapshot discipline:** if the case states a snapshot (for example "snapshot comprises events 001–002" or
  "Recorded action: event 003"), only events inside the snapshot are used. If the case contains its own answer
  sections (`Next action at escalation`, `Outcome`), they're removed and logged.
- Output: a `CaseFile` with `{ id, title, fields, sections[], events[], attachments[], anomalies[] }`. Every
  item gets a stable citation id (`E003`, `A1`, `S:context`).
- Anomalies (an unparsable date, an event with no sender, an unknown section) don't stop the run. They're passed
  to the model and listed in REASONING.md.

### 2.2 Facts: the deterministic ledger

`src/facts/`. Pure functions with no model calls; each one is unit-tested.
- A timeline sorted by time, with `asOf` set to the last event in the snapshot.
- For each party: their last inbound message, our last outbound to them, **how many times we've asked them the
  same thing without a reply**, and the days since.
- Money: every amount with its currency and source, net/gross when VAT appears, and any approval limit mentioned.
- Failure markers: bounced or failed messages, "no results", "parse failed", "not uploaded", missing documents,
  repeated identical notes (system loops).
- Dates in the future: promised visits, "will follow up Monday", deadlines. We record whether each one has
  passed as of `asOf`.
- Duplicate or contradicting fields (two addresses, two amounts for the same job).

The ledger is given to the model as a fact table. The model is told to trust it over its own arithmetic.

### 2.3 Situate: what task are we in, and what has already been said

`src/stages/situate.ts`. One model call with structured output. Produces:
- `task`: what the case is about, in one line, and the **lifecycle stage**. It uses a coarse, cross-track enum
  (`intake | triage | awaiting_party | approval | quote | scheduling | in_progress | verification | billing |
  closure | dispute | other`) plus a free-text label, so a new kind of case still gets a sensible stage.
- `parties`: roles in this case (tenant, landlord, contractor, agency, the system), with contact channels seen.
- `conversation`: for each party, what we asked, what they promised, and what is still unanswered, with citations.
- `conflicts`: statements that disagree, with both sides cited.
- `missing`: what we would need to know to act, and whether it can be inferred safely or must be asked for.
- `noise`: events that are irrelevant or automated, and why.
- `risks`: safety, legal, money, vulnerability and complaint signals.
- `injection`: any text in the case that tries to instruct the agent. It's treated as data and flagged, never
  followed.

With large cases (over roughly 150k tokens) the run first summarises each block of events in its own call,
keeping citations. Situate then works from those summaries and keeps the last 20 events verbatim.

### 2.4 Decide: the next action

`src/stages/decide.ts`. Uses the strongest model and runs 3 samples in parallel.

**Action vocabulary.** These are generic verbs; the domain words go in the parameters.

| action | when |
|---|---|
| `send_message` | proceed with the workflow: instruct, inform, confirm, forward |
| `request_information` | something is missing or unclear and a named party can supply it (this is "re-ask the landlord") |
| `chase` | an ask is overdue; repeats the original ask, cites it, and gives a date |
| `wait` | waiting is correct (a promised date hasn't arrived yet); gives a date to check again |
| `escalate_to_human` | the case falls outside what we're authorised to do, there is a safety risk, a conflict we can't resolve, repeated non-response, or low confidence |
| `update_record` | an internal note or status change only |
| `close_case` | the work is verified done and nothing is owed |
| `other` | escape hatch: free-text action, always reviewed by the critic and penalised by the gate |

Each decision includes: `action, recipient, channel, message (the actual text), rationale, citations[],
expected_outcome, boundaries[] (what this does not prove or settle), remaining_work[], assumptions[],
alternatives_considered[], confidence`.

**Operating manual.** `knowledge/<track>/manual.md`. This is plain prose rules learned from the 50 Property
examples and loaded into the prompt; there are no keyword rules. It covers:
- the usual stages and the typical next step at each one
- **re-ask policy:** ask once; chase after N working days (from the data: about 3 for landlords and tenants,
  2 for contractors); after two unanswered chases, **change channel** (email to phone); after three, or
  sooner if the matter is urgent, **escalate to a person**; never chase before a date the party gave
- **escalation triggers:** safety (gas, electrics, water ingress, fire, structural, damp affecting health),
  vulnerable occupant, legal or deposit dispute, complaints, threats, spending over the authorised limit
  or without approval, conflicting instructions from people with authority, identity or authority
  doubts, a failed action with no safe retry
- **prohibitions:** instructing works without landlord approval or standing consent; claiming work is done
  without evidence; promising dates or money that nobody confirmed; sharing one party's personal data
  with another; closing a case with an open invoice or unanswered complaint
- a generic `knowledge/_default/manual.md` for any track we haven't learned, so a case from an unexpected
  track still gets sensible rules

### 2.5 Check: hard rules and critic

`src/stages/check.ts`
- **Hard rules (code)** run only on facts from the ledger or on fields in the decision itself, never on how
  the model reads free text:
  - every citation exists and falls inside the snapshot
  - the message doesn't state an amount or date that isn't in the ledger
  - `chase` isn't sent before a date the party promised
  - `close_case` isn't chosen while the ledger shows an open invoice or unanswered ask
  - an action that spends money above the limit isn't allowed without approval evidence; it becomes an escalation
  - `other` is always sent to the critic for review
- **Critic (model, separate prompt, sees the case and the decision).** It plays the role of a strict operations
  lead and returns `{ verdict: pass | revise | escalate, problems[] }`. It checks for: facts that aren't
  supported, a missed conflict, a premature action, an unnecessary escalation (this costs points too), a wrong
  recipient, and anything said to the wrong party.
- A `revise` verdict gets **one** revision call, then the decision is checked again. There are no infinite loops.

### 2.6 Gate: act, ask, wait or escalate

`src/stages/gate.ts`. Deterministic.
- When the 3 samples agree on the action and recipient, the critic passes it and confidence is at least 0.6,
  we **act**.
- When the samples disagree, or the critic says `revise` twice, we **ask** if a named party can resolve the gap;
  otherwise we **escalate**.
- When a hard rule fails, the critic says `escalate`, or there's a mandatory trigger, we **escalate**.
- **An escalation always includes a handover packet:** a summary, what we've already done, what is blocking,
  the options with their risks, the recommended option, and citations. This is the "preserving context for
  human handover" the Best Exception Handling award asks for.
- **Escalation is also judged.** Escalating when the playbook clearly covers the case counts as a failure
  ("unnecessary human intervention", §9), so the gate must not escalate by default.

### 2.7 Write

`src/output/`. Writes `ANSWERS/<n>/ANSWER.md` (the decision, the message, boundaries, remaining work, escalation
packet if any), `REASONING.md` (what the system received, anomalies, ledger, situation, the samples and how they
voted, critic verdict, gate rule fired, failures) and `trace.jsonl` (every stage's input hash, output and
timing, plus every model call's id and token use). It's generated only, never edited by hand.

### 2.8 Failure handling (coverage)

- Each model call: schema-validated structured output (tool-use with zod → JSON schema), 3 retries with
  backoff, then fall back to a second model, then to the stage's **deterministic fallback**.
- Deterministic fallback for the whole case: a `escalate_to_human` answer built from the ledger, stating
  honestly which stage failed. A failure is never hidden and never replaced by hand (rules §6D).
- One case failing never stops the batch. It runs with a concurrency limit and a time budget per case.
- Runs are reproducible: temperature 0 for situate/critic, fixed seeds where supported, and model ids written
  to the trace.

## 3. Edge cases → mechanism

| Edge case (from the PDF) | Detected by | Response |
|---|---|---|
| Conflicting information | ledger (duplicate or contradicting fields), situate `conflicts` | ask the party with authority to confirm; escalate if the conflict is between people with authority or it blocks a safety decision |
| Failed actions | ledger failure markers | retry through a different channel or route; escalate if there's no safe retry |
| Missing context | situate `missing` | infer only when low-risk and say so in `assumptions`; otherwise `request_information` from the named party |
| Unusual exceptions | stage `other`, action `other`, low sample agreement | critic review; gate leans towards escalation, with a handover packet |
| Ambiguity | 3-sample disagreement | ask if someone can resolve it, otherwise escalate |
| Noise | situate `noise` and repeated system notes in the ledger | ignored; listed in REASONING so it's visible |
| Needs escalation | manual triggers, risks, hard rules | `escalate_to_human` with packet |
| Large context | token count | summarise blocks with citations, keep the latest events verbatim |
| Unknown schema or new fields | ingest anomalies | carried through as raw sections; confidence lowered; never crashes |
| Re-asking the landlord | ledger ask counts and promised dates | the re-ask ladder in the manual, enforced by the hard rule on promised dates |
| Text in the case that tries to instruct the agent | situate `injection` | ignored, flagged, and escalated if it asks for anything risky |
| Using facts from after the snapshot | ingest cut + citation-in-snapshot rule | removed |

## 4. Evaluation

`src/eval/`. Built before tuning the prompts.
- **Labelled set A, in the Reality Test's own format:** 150 escalation cases from the other three tracks.
  Each has `Next action at escalation` (with recipient and channel) and `Boundaries`. We hide those sections,
  run the agent, and score against them. This tests generalisation to schemas and domains we didn't tune for.
- **Labelled set B, Property:** cut each Property history at decision points and compare with what happened next.
  We can reuse agent A's `cuts.json` (258 cuts) read-only, so both agents are scored on the same cuts.
- **Scorer:** an LLM judge with a fixed rubric that mirrors §5: correct action type, right recipient, right
  channel, allowed alternative, boundaries respected, prohibited action taken, unnecessary escalation. Plus
  exact checks for recipient and action class.
- Results go to `eval/results/<date>.json` with per-category accuracy, so we can compare agent A and agent B.

## 5. Layout

```
packages/agent-b/
  PLAN.md
  package.json            @casework/agent-b; deps: @anthropic-ai/sdk, zod, unpdf (already in the lockfile)
  src/
    ingest/               markdown.ts, history.ts, attachments.ts, snapshot.ts, casefile.ts
    facts/                ledger.ts, parties.ts, money.ts, failures.ts, dates.ts
    stages/               situate.ts, decide.ts, check.ts, gate.ts, handover.ts
    llm/                  client.ts (retry, fallback model, structured output, prompt caching)
    knowledge/            _default/manual.md, property/manual.md, banking/…, …
    output/               answer.ts, reasoning.ts, trace.ts
    eval/                 labels.ts, judge.ts, run.ts
    cli.ts                agent-b --in <dir> --out <dir> [--track auto] [--withhold outcomes]
  test/                   ingest fixtures (including deliberately malformed cases), ledger unit tests
```

Models: `claude-opus-5-5` for decide and critic, and `claude-sonnet-5-5` for situate and the summaries of large
cases. Both can be overridden with environment variables. Track detection is `auto` (from the folder name, then
from the contents) with `_default` as the fallback.

## 6. Build order (by score impact)

1. Ingest + tests on all 200 examples, plus hand-made malformed cases. *Nothing else works without this.*
2. Ledger + tests.
3. Situate + decide (single sample) + write → end-to-end answers for every case. **Coverage is secured here.**
4. Eval set A + set B runner and judge. We get a baseline score.
5. Property manual (read the 50 histories; write down the stages, the re-ask ladder and the triggers).
6. Hard rules + critic + gate + 3 samples. Re-score; keep only what moves the numbers.
7. Failure fallbacks, the large-context path, a full dry run on `data/public` with the answer sections hidden.
8. CLI wired into `pnpm` scripts; a README section comparing agent A and agent B on the eval.

## 7. Open decisions

- Whether agent B replaces agent A's `pnpm reality` output or both answers are kept and the better agent on
  the eval writes `ANSWERS/`. Proposed: the eval decides, before 16:00.
- The re-ask timings (N days) come from the data in step 5; the numbers above are placeholders.
