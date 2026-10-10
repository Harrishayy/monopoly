# Casework

An operations agent for messy real-world cases. It reads calls, emails, documents, CRM records and tickets, takes actions with real tools, recovers from failures, and resolves what it safely can. Everything else goes to a person as a single handover card that has all the context needed to decide.

https://app.notion.com/p/Dwelly-AI-Hackathon-2026-Hacker-Guide-3eaf87e8ff7280c3beb6fb2fab8e2123#a58d6cadf230424dace26b12063fc7ea

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
git clone --recurse-submodules <this repo>   # or: git submodule update --init
pnpm i
cp .env.example .env          # add ANTHROPIC_API_KEY
pnpm dev                      # http://localhost:3000
```

Reality Test (put the released cases in `data/challenges/` first, see [data/README.md](data/README.md)):

```bash
pnpm reality --track property --in data/challenges --out ANSWERS
```

The web app (`pnpm dev`) runs the same agent and has these screens:

| Route | What it's for |
|---|---|
| `/inbox`, `/cases/<ref>` | Step through a case: pick any point in its history, let the agent decide with only what came before it, and compare its choice with what really happened next and the eval label (accepted, missed or prohibited). Also shows the sources, the live run trace, the pipeline strip (Read → Assess → Decide → Guard → Act / hand over), the decision and any handover. `?cut=<n>` and `?run=<id>` open a specific point or run. |
| `/runs` | Every run in this session as a live card. |
| `/escalations` | Handover cards waiting for a person. Choosing an option is recorded with the run. |
| `/reality` | Run the eval on the labelled examples (rules-only runs are free) and Reality Test batches, and read `ANSWERS/` written by the CLI. |
| `/tools` | Tools, policy rules, always-escalate triggers, tool health and how a run moves through the pipeline. |
| `/agents` | For the team: how agent A and agent B work, and their eval results side by side on the same labelled moments. Reads what each agent wrote under `.casework/`. |
| `/design` | Every component in every state, under all three visual directions. |

Runs started in the UI are kept in memory and disappear when the server restarts. `pnpm reality` is still what writes `ANSWERS/`.

Checks: `pnpm typecheck && pnpm test && pnpm build`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Claude API |
| `MODEL_DECIDE` | no | Decision model (default `claude-opus-5-5`) |
| `MODEL_FAST` | no | Triage and extraction model (default `claude-haiku-4-5-20251001`) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | voice only | ElevenLabs voice agent |
| `DATA_DIR` | no | Case folder the web app reads (default `./data/public`) |
| `DATA_WITHHOLD` | no | `outcomes` (default) hides how example cases ended; `none` loads cases as supplied |
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
