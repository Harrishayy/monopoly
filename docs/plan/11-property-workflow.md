# 11 · Property maintenance: workflow, rules and evaluation

> **NOW (results).** This is what the property pack is built from. It was learned by reading all 50 example cases in `data/public/Property Management`: every history in full, plus the checkout and quote PDFs.

## What the examples are

- **All 50 are complete.** Every case is marked Completed and has an Overview and an Outcome.
- **None records a decision point.** Unlike Banking, Insurance and Delivery, none has a "Next action at escalation" or "Boundaries" section. A property case is a full CRM export from intake to closure.
- **One agency throughout.** All 50 are run by Northbridge Lettings with the same automation, whose lines (for example "Please complete landlord approval step first") are the most reliable signals in the data.
- **Three kinds of job:**
  - **Tenant repairs** (42 cases): appliances, plumbing, doors, windows, gardens.
  - **Void and check-out works** (003–008): cleaning, carpets, paint. These are raised by the agency on an empty property.
  - **Agency tasks for the tenant** (009, 010, 020): garden upkeep, meter-reading photos, an inspection.

**Is there one right answer?** Mostly the right *kind* of next step, not one exact message. About 40% of decision points have one clearly correct move, for example "a quote arrived, so send it to the landlord". The rest have several defensible moves, such as chasing now or waiting, or asking the tenant first. The recorded human action is sometimes worse than a good agent's. For example, 040 closed without telling the landlord, 015 emailed the landlord about the wrong property, and 020 told the landlord "no issues" when the report listed a defect and an unapproved dog flap. So we score against a set of acceptable actions, not against what happened.

## The workflow

```
INTAKE (+ AI triage Q&A, often misclassified: 014, 042, 049)
  → GATE: "Please complete landlord approval step first" / "Please approve selection of provider and category"
  → optional: ask the tenant (clarify, photos, self-help such as a plunger for a slow drain, 027)
  → LANDLORD DECIDES ─┬─ approves our contractor ─────────────────────────────┐
                      ├─ arranges their own contractor → monitor, chase ~weekly (001, 028, 035, 041, 045)
                      ├─ tenant may fix it / tenant already did → tell everyone, close (017, 038, 040, 049)
                      └─ names a contractor or warranty route (015, 025) ────┤
  → ASSIGN contractor (templated emails to tenant and contractor) ◄──────────┘
  → BOOKING: contractor ↔ tenant; confirm to both; SMS reminder. Vacant: keys or caretaker.
  → QUOTE loop (when they quote): quote → landlord → approval → "go ahead". Every quote, even £35 (050).
  → VISIT → "No work results" about 2 days later if silent → chase
  → INVOICE (ask for a PDF if the format is wrong) → forward to the landlord, or "landlord pays directly" / no charge
  → FINAL CHECKS (landlord confirmation, key return) → CLOSE
```

Agency tasks for the tenant run a short loop instead: ask the tenant → chase → pass the result to the landlord → close.

## Rules the guard enforces

| Rule id | Bars | Lifted by |
|---|---|---|
| `property.landlord_approval` | `contractor.assign` / `contractor.instruct` with no landlord approval or standing consent on record | Citing the landlord message that approves it |
| `property.landlord_self_managing` | `contractor.assign` while the landlord arranges their own contractor | — |
| `property.quote_approval` | `contractor.instruct` on a quote the landlord has not approved | Citing the landlord's approval after the quote |
| `property.completion_evidence` | `case.close` with no completion report from the contractor, landlord or tenant | — |
| `property.nothing_to_chase` / `property.already_replied` | Chasing someone we never contacted, or who has already answered | — |
| `property.must_escalate` | `case.close` / `case.wait` when a safety emergency or legal threat is flagged | — |
| `property.cite_real_sources` | Any action citing a source that is not in the case | — |
| `property.instruct_within_quote` | Telling a contractor to go ahead for more than any quoted amount (+ VAT) | — |

There is **no agency spending limit** in the data. The old £300 default was our own placeholder and has been removed. Quotes of £35, £90 and £172.51 all went to the landlord. Work was approved without asking only where the landlord had agreed earlier: 012 ("LL already agreed"), 013 (the agency told the landlord it was proceeding) and 043 ("if it's easy and cheap, fix it").

**Chase cadence** (`CHASE_AFTER_DAYS`):
- landlord after 3 days without a reply;
- contractor after 2 days, or after the system's "3+ reminders" alert;
- "no work results" 2 days after the visit;
- tenant after 3 days;
- a landlord arranging their own contractor about weekly.

**Always a person** (`policy.mustEscalate`): a safety emergency, a legal threat, disputes over deposits, recharges, liability or warranty, complaints, alterations the landlord never approved, and price increases. Only safety emergencies and legal threats *force* a handover. The others are flagged for the model to weigh.

## Noise vs real conflict

- **Noise. Ignore it and never escalate on it:**
  - Names, addresses, phone numbers and contractor brands change within a case (an anonymisation artefact).
  - Odd dates: wrong years, wrong weekdays, reports dated after the job.
  - Attachments marked "(unavailable)": they were not supplied to us, but the agency has them.
  - A landlord approval missing from the record once a contractor is already working. It usually happened by phone or in a system step.
  - System lines such as "Priority cannot be decreased", "Manually updated via Change Mode" and "[Text/transcription absent]".
  - Duplicate sends.
  - Automated chasers that fire after the work is done.
  - Messages that are only thanks.
- **Real conflict. Act on it or escalate:**
  - an invoice clearly above the approved quote;
  - work done well beyond the approved scope (023, 048);
  - a summary that contradicts an attachment you can read (020);
  - a later quote that is higher (019: £500 → about £600).

Approval gates the *start* of work: before any contractor is involved, and whenever a new price arrives. Once a contractor is assigned or instructed, the agent treats approval for that visit as given and moves the job forward. A first Haiku run showed why this matters. Without the rule, 56 of its 89 misses re-asked the landlord, or escalated, because approval was not on record.

## What the answer must not claim

These are the property versions of Delivery's "Boundaries":
- landlord approval to attend is not approval of a quote;
- booked is not visited;
- the contractor saying "done" is not the tenant confirming the fix;
- an invoice forwarded is not an invoice paid;
- the landlord's own contractor is not the agency's job.

Also: don't share the tenant's number without their consent (045), and don't invent a spending limit.

## How the system decides

```
case folder ─▶ loader (shared/cases.ts)
            ─▶ events.ts   parties, workflow signals, noise, amounts      (rules)
            ─▶ assess.ts   stage · waiting on · facts · flags ·             (rules)
                           playbook suggestions · barred actions · boundaries
            ─▶ runCase     model chooses ONE action tool, reading the        (Claude)
                           history + assessment; may add one routine companion message
            ─▶ guard       refuses barred or invalid calls; the refusal goes back to the model
            ─▶ fallback    no model, or it fails → the top allowed playbook suggestion
            ─▶ ANSWER.md   next step, recipient, channel, message, boundaries, remaining work
               REASONING.md the assessment with citations, refusals, decision, handover
```

There are 14 actions:
- landlord: `request_approval`, `send_quote`, `update`, `chase`
- tenant: `ask`, `update`, `chase`
- contractor: `assign`, `instruct`, `chase`, `update`
- case: `wait`, `close`, `escalate`

No live channels are supplied, so every action is recorded to an outbox and the answer says so.

## Evaluation

`packages/tracks/src/property/eval/cuts.json` holds **258 labelled cut points**, 3–6 per case across all 50 cases: 108 marked *determined* and 150 *judgement*. Each cut has:
- `cutBefore`: the first event hidden from the agent;
- `asOf`: the decision moment;
- `accept`: every defensible action;
- `prohibit`: actions that break a rule;
- `boundaries`;
- `happened`: what the agency actually did, plus a `note` where that was poor.

The labels were drafted by model reviewers reading each history in full, so treat them as a strong baseline, not ground truth.

```bash
pnpm eval --offline                    # rules-only playbook, no network
pnpm eval                              # with the model (ANTHROPIC_API_KEY), writes .casework/eval/SUMMARY.md
pnpm eval --only 011,046 --limit 10    # a slice
pnpm --filter @casework/tracks inspect 033 --cut 9   # how the rules read one case at one moment
```

Results on all 258 cuts, run on 2026-10-10:

| Configuration | All | Determined (108) | Judgement (150) | Prohibited action chosen |
|---|---|---|---|---|
| Rules-only playbook | 65.5% | 65.7% | 65.3% | 4.7% |
| **`claude-haiku-5-5` (configured) + rules + guard, current prompt** | **81.0%** | 80.6% | 81.3% | **1.6%** |
| `claude-haiku-5-5`, first prompt | 65.5% | 67.6% | 64.0% | 1.9% |
| Reference only, not used: `claude-opus-5-5`, first prompt | 77.5% | 78.7% | 76.7% | 1.2% |

The current prompt fixed three faults the first Haiku run exposed:
- it re-asked the landlord, or escalated, when approval was simply not on record (56 of 89 misses);
- it treated scrambled dates as conflicts;
- it would not close, and chased for attachments marked "(unavailable)".

Escalations fell from 30 to 6, and closes rose from 1 to 4. The fix gained 45 cuts and lost 5. These changes were made by studying misses on this same set of cuts, so 81% is an optimistic estimate. The rules behind them are general, not case-specific, but there is no held-out set.

The remaining misses are spread thin. The largest groups are chasing the contractor when a price should go to the landlord (3), and telling the landlord when the label wants the job closed (3). These are defensible but not labelled. Run batches at concurrency 5 or lower; higher rates hit API rate limits, which made most cuts fall back to the rules in a first attempt.

## Known limits

- Signals come from regular expressions. Quotes stated without a £ figure, informal approvals, and tenants fixing things themselves are often missed by the rules. The model reads the full text and catches most of them; that is why it decides and the rules only ground it.
- The challenge cases may not be cut where the examples are. If a history runs to closure, the right answer is usually "nothing to do" or "close", and the system says so.
- Images in attachments are not read.
