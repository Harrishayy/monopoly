# 04 · Contracts

The code is the source of truth. This page says where each contract lives and what it guarantees.

## Schemas (`packages/core/src/schema`, zod v4)

| File | Defines | Guarantees |
|---|---|---|
| `common.ts` | `TrackId`, `Autonomy`, `Money`, `Usage` | Money is always integer pence, GBP |
| `case.ts` | `SourceKind`, `CaseStatus`, `Source`, `Case`, `CaseSummary` | Every source has a stable `id`, which facts cite |
| `handover.ts` | `Outcome`, `HandoverOption`, `Handover`, `HumanDecision` | At least one fact and one option. Options state whether they are reversible |
| `events.ts` | `RunEvent` (discriminated union) | `seq` is monotonic per run and doubles as the SSE id |
| `../track.ts` | `TrackPack`, `AgentTool`, `Policy`, `PolicyRule`, `Vocabulary` | Tools declare an `effect` (`read`, `write` or `money`). Only `read` skips the guard |

Change a contract in its own commit, and update every user of it in the same pull request.

## API (`apps/web/src/app/api/**/route.ts`)

| Method | Route | Returns | Status |
|---|---|---|---|
| GET | `/api/tracks` | `TrackMeta[]` | working |
| GET | `/api/cases?track=` | `CaseSummary[]` | working (loader reads `data/<track>/*.json`) |
| GET | `/api/cases/[ref]` | `Case` | working |
| POST | `/api/runs` `{ caseRef, track?, autonomy? }` | `{ runId }` (202) | working; the agent loop is a stub |
| GET | `/api/runs/[id]/events` | SSE of `RunEvent`, then `event: end` | working, resumes with `Last-Event-ID` |
| GET | `/api/runs/[id]` | `RunView` + `done`, `error` | working |
| POST | `/api/cases/[ref]/decisions` `{ runId, optionId, note? }` | `HumanDecision` | 501 until the event store exists |
| GET | `/api/tools?track=` | tool names, descriptions, effects | working (no tools registered yet) |
| POST | `/api/reality` | `{ batchId }` | 501; use the CLI |
| POST | `/api/voice/session` | `{ signedUrl }` | 501 / 503 without ElevenLabs keys |

## CLI (`apps/cli`)

```
pnpm reality --track property --in data/reality --out ANSWERS [--concurrency 6]
pnpm replay ANSWERS/7/trace.jsonl [--speed 2]
```

## ANSWERS output (`packages/core/src/answers/render.ts`)

Each finished case writes `ANSWERS/<n>/ANSWER.md`, `REASONING.md` and `trace.jsonl`. ANSWER.md always has these sections: What the system received · Actions taken · Actions refused · Escalated · What failed · Final result. REASONING.md has one section per decision with citations and confidence, then the handover, then a pointer to the trace.
