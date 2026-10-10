# Outside cases: a stress suite for the Reality Test

Fifty-two synthetic property-management cases written by the team, unlike any example case, to see how the agents
cope with what the Reality Test may contain. They are **not** organiser data and are never submitted.

## What we expect at 16:30 (from the rules PDF, the repo docs and the example formats)

- **Unseen "escalation cases"** (rules, section 4). In the other three tracks the examples come as an *escalation
  snapshot*: the history is cut just before the next action, sometimes with a `Context` section, `Stage` fields
  and a stated snapshot range. The property examples are full histories, so the property challenge cases may use
  either shape, or a new one.
- **Listed difficulties** (rules, sections 4 and 5): conflicting information, failed actions, missing context,
  unusual exceptions, ambiguity, noisy or irrelevant information, situations that need escalation, and larger
  or harder context. The system may need to request or infer missing information, and to avoid unsafe actions.
- **Grading** (rules, sections 5 and 11): required outcomes, acceptable alternatives, positive behaviours, red
  flags, prohibited actions and critical failures. Doing nothing or escalating can be correct. Manipulation
  attempts are tested for, so a case may contain text that tries to steer the agent.
- **Format drift.** Nothing guarantees the example layout. Files, headings, field names and date formats may
  differ.

## Categories

| Range | Category | What it tests |
|---|---|---|
| 101–110 | New scenarios, safety and escalation | Jobs not in the examples: heating, gas, roof, damp with a vulnerable tenant, legal threats, deposit disputes |
| 111–120 | Conflict, failure, missing context, ambiguity, waiting | Contradicting instructions, bounced emails, no-shows, vague reports, invoices above the quote, "wait" as the right answer |
| 121–130 | Pollution and format drift | Floods of automated notes, wrong-thread messages, injected instructions, 100+ events, missing or renamed files, JSON or CSV history, other languages, snapshot-style records |
| 131–152 | Evidence and verification | A document or claim from a contractor, tenant or landlord that does not hold up: certificates for another address or out of date, invoices for another job or above the quote, completion claims the tenant contradicts, approvals from the wrong person or for the wrong amount, a tenant's unqualified "fix", and cases where all three disagree. 150 and 152 are controls where the evidence does hold up, to catch over-caution |

## Layout

```
data/outside/
  Property Management/<101..152>/   index.md, history.md, attachments/ (or deliberately different files)
  labels.json                       per case: category, kind, accepted actions, prohibited actions, why
```

Labels use the property action list (`landlord.request_approval`, `landlord.send_quote`, `landlord.update`,
`landlord.chase`, `tenant.ask`, `tenant.update`, `tenant.chase`, `contractor.assign`, `contractor.instruct`,
`contractor.chase`, `contractor.update`, `case.wait`, `case.close`, `case.escalate`). The case folders never contain
a label, so neither agent can read the answer.

Run: `pnpm bench --suite outside --agent a,b`
