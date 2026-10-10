# Casework

An operations agent for messy real-world cases. It reads calls, emails, documents, CRM records and tickets, takes actions with real tools, recovers from failures, and resolves what it safely can. Everything else goes to a person as a single handover card that has all the context needed to decide.

> **Status:** project skeleton. The architecture, contracts, UI shell, design system and Reality Test runner are in place. The agent loop (`packages/core/src/agent/loop.ts`) and the track tools come next. Sections marked _TBD_ get filled in as they're built.

## 1. What we built

_TBD._ The plan is in [`docs/`](docs/README.md), and the visual reference is [`docs/design/casework-design-directions.html`](docs/design/casework-design-directions.html).

## 2. The operational problem

_TBD once the track is chosen._ The core idea: a lot of operations work arrives as unstructured, conflicting information and still needs human judgement. Casework handles the routine part on its own, and when it stops it tells a person exactly why, what it knows (with sources), what it already tried, and what the options are.

## 3. Architecture

```
apps/web        Next.js App Router: UI, API route handlers, run streaming (SSE)
apps/cli        Reality Test batch runner and replay
packages/core   Schemas, agent loop, policy guard, retries, run reducer, ANSWERS writer
packages/tracks One pack per track: data loader, tools, policy, prompt, vocabulary
```

Every screen, the mascot and the `ANSWERS/` files are views of one append-only event stream per run. Details: [docs/plan/03-architecture.md](docs/plan/03-architecture.md).

## 4. How to run it

Prerequisites: Node 22 or later, and pnpm 10.

```bash
pnpm i
cp .env.example .env          # add ANTHROPIC_API_KEY
# put the synthetic data in data/<track>/
pnpm dev                      # http://localhost:3000
```

Reality Test:

```bash
pnpm reality --track property --in data/reality --out ANSWERS
```

Checks: `pnpm typecheck && pnpm test && pnpm build`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Claude API |
| `MODEL_DECIDE` | no | Decision model (default `claude-opus-5-5`) |
| `MODEL_FAST` | no | Triage and extraction model (default `claude-haiku-4-5-20251001`) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | voice only | ElevenLabs voice agent |
| `DATA_DIR` | no | Synthetic data folder (default `./data`) |
| `TRACK` | no | `claims`, `property`, `banking` or `logistics` |
| `REALITY_CONCURRENCY` | no | Parallel cases in a batch (default 6) |
| `TOOL_TIMEOUT_MS` | no | Per-tool timeout (default 8000) |

## 5. Models, APIs and services

- Anthropic Claude via `@anthropic-ai/sdk`: Opus 5.5 for decisions, Haiku 4.5 for triage.
- ElevenLabs for the voice agent (optional).
- The hackathon's supplied synthetic tools and data.
- Libraries: see [docs/plan/02-stack.md](docs/plan/02-stack.md).

## 6. Assumptions

_TBD._

## 7. Known limitations

_TBD._ Current skeleton limits: the agent loop is a stub, runs are held in memory, and the decision, voice and batch-from-UI endpoints return 501.

## 8. What we'd build next

_TBD._

## Licence

Apache 2.0. See [LICENSE](LICENSE).
