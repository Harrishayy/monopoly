# 03 · Architecture

> **Mixed.** NOW: The agent loop, Track packs. LATER (UI/demo): the web and API layers, the UI and mascot columns of the event table, State and storage.

Five layers. Imports only point downwards. Track knowledge lives only in a track pack, so the other layers never name a track.

```
Web app         apps/web/src            routes (app/) → features → domain → ui → tokens
                  │ HTTP + SSE from route handlers; client code imports core types/schemas only
API + CLI       apps/web/src/app/api    REST + SSE route handlers, server-only code in src/server
                apps/cli                Reality Test runner and replay (no Next needed)
                  │ plain function calls
Core            packages/core           schema · agent (loop, guard, retry, decide, handover) · run/view · answers
                  │ implements TrackPack
Track packs     packages/tracks         claims · property · banking · logistics (+ meta.ts for the browser)
                  │ network
Outside         Claude API · ElevenLabs · supplied synthetic tools · data/ · SQLite
```

## One run, end to end

> **Mixed.** NOW: the event names and the ANSWER.md column, because the ANSWERS writer uses them. LATER (UI/demo): the UI and Mascot columns.

Every screen, the mascot and `ANSWERS/` are views of one append-only event stream:

`run.started → step.read → tool.called → tool.failed → tool.succeeded → action.blocked → decision.made → escalation.created → run.completed`

| Event | Emitted by | UI that reacts | Mascot | ANSWER.md section |
|---|---|---|---|---|
| `run.started` | agent/loop | Live runs card, trace header shows Running | think | Header |
| `step.read` | agent/loop (after triage) | TraceStep(read), cited sources highlighted | think | What the system received |
| `tool.called` | agent/guard (when allowed) | TraceStep(tool) with spinner | act | Actions taken |
| `tool.succeeded` | agent/retry | ToolCallBlock result and latency | act | Actions taken |
| `tool.failed` | agent/retry | TraceStep(fail), RetryBadge, toast | fail | What failed |
| `action.blocked` | agent/guard | BlockedAction in decision panel and trace | think | Actions refused |
| `decision.made` | agent/decide | TraceStep(decide), ConfidenceMeter | think | REASONING.md steps |
| `escalation.created` | agent/handover | HandoverCard, Escalations count, toast | esc | Escalated |
| `run.completed` | agent/loop | OutcomeStamp, Reality Test cell | done / esc | Final result |
| `human.decided` | api/decisions | HumanDecisionRecord, case status | done | Not part of ANSWERS |

`packages/core/src/run/view.ts` reduces events into a `RunView`. The web app (`lib/sse.ts`), replay and the ANSWERS writer all use it, so what the demo shows and what judges read can't drift apart.

**Adding an event type** means updating four places: `schema/events.ts`, `run/view.ts`, `run/mascot.ts` and `answers/render.ts`.

## The agent loop (`packages/core/src/agent/loop.ts`)

> **NOW (results).** Not implemented yet: `runCase` throws.

1. Emit `run.started`.
2. Triage each source once with `MODEL_FAST` and emit `step.read`.
3. Run the tool-use loop with `MODEL_DECIDE`, capped at 12 turns. Every call goes through `guard()` (policy, autonomy, argument validation) and then `withRetry()` (timeout, backoff, idempotency key). Errors go back to the model as a `tool_result` with `is_error`, so it can recover or escalate.
4. Decide, which emits `decision.made`. When escalating, build the handover, which emits `escalation.created`. The handover builder rejects facts that cite a source not in the case.
5. Emit `run.completed`. The loop never throws: an unexpected error ends in an escalation with the context gathered so far.

Order the prompt for caching: system, then tool definitions, then track policy, then case sources.

## Track packs

> **NOW (results).** The property tool names and the £300 limit in this table are placeholders. Replace them with what the example cases show.

A pack (`packages/core/src/track.ts` → `TrackPack`) supplies vocabulary, a loader, tools, policy rules, must-escalate conditions, a prompt and a default autonomy. The UI reads its labels from `@casework/tracks/meta`, so a property manager sees "Job" and an insurer sees "Claim" from the same component.

| Track | A case is a… | Customer | Typical tools | Autonomy limit | Always escalate when |
|---|---|---|---|---|---|
| Claims | Claim | Policyholder | policy.lookup · claims.update · payments.schedule · weather.history · fraud.score | Settle up to £1,000 | Loss before inception, injury, fraud signals |
| Property | Job | Tenant / Landlord | property.get · tenancy.get · contractors.book · contractors.confirm · landlord.notify · sms.send | Spend up to the landlord's limit (£300 default) | Safety risk, vulnerable occupant, disputes |
| Banking | Case | Customer | cards.transactions · auth.events · cards.freeze · disputes.open · messages.send | Freeze yes, refund no | Account takeover, vulnerability, regulated complaints |
| Logistics | Delivery issue | Recipient | orders.get · pod.photo · gps.scan · reship.create · refund.issue | Reship or refund up to £150 | High value, repeat claims, customs |

To add a track, copy a pack folder, add it to `TRACK_META` and `PACKS`, and write its loader. Nothing else changes.

## State and storage

> **LATER (UI/demo): don't build yet.** 

- Runs are held in memory in `apps/web/src/server/runs.ts`. The next step is an SQLite event store (`src/server/db.ts`, drizzle + better-sqlite3) so runs survive restarts and can be replayed.
- UI-only state (direction, track, autonomy) lives in Zustand (`src/state/ui.ts`), persisted to localStorage.
