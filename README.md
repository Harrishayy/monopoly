# Casework

An operations agent for messy real-world cases. It reads calls, emails, documents, CRM records and tickets, takes actions with real tools, recovers from failures, and resolves what it safely can. Everything else goes to a person as a single handover card that has all the context needed to decide.

https://app.notion.com/p/Dwelly-AI-Hackathon-2026-Hacker-Guide-3eaf87e8ff7280c3beb6fb2fab8e2123#a58d6cadf230424dace26b12063fc7ea

> **Status:** the property agent works end to end: rules-based assessment, model decision behind a policy guard, ANSWERS writer, and an evaluation harness over 258 labelled decision points. The web UI is still a shell. Sections marked _TBD_ get filled in as they're built.

## 1. What we built

An agent for property maintenance jobs: the repair requests a letting agency juggles between tenants, landlords and contractors. Given a job's history (emails, calls, SMS, CRM notes, holds, attachments), it works out where the job stands and takes the agency's single best next step. That step is one of 14 actions: ask the landlord, send a quote, chase a contractor, close, escalate, and so on. It explains the step with cited sources and says what it must not claim.

It is two systems working together:

- **Rules (deterministic).** `packages/tracks/src/property/events.ts` and `assess.ts` turn the history into parties, workflow signals and noise. They then derive the stage, who we're waiting on, facts with citations, risk flags, playbook suggestions and *barred* actions. The rules were learned from the 50 example cases ([docs/plan/11-property-workflow.md](docs/plan/11-property-workflow.md)).
- **Model (judgement).** Claude reads the full history plus that assessment and picks one action tool. A policy guard refuses barred or invalid calls, for example sending a contractor with no landlord approval, and hands the refusal back so the model can choose again. If no model is available, or it fails, the top allowed playbook step is taken instead. The run never throws.

The plan is in [`docs/`](docs/README.md), and the visual reference is [`docs/design/casework-design-directions.html`](docs/design/casework-design-directions.html).

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

One run: `run.started → step.read → case.assessed (rules) → tool.called / action.blocked (model + guard) → decision.made → escalation.created? → next.proposed → run.completed`. `ANSWER.md` leads with the next step: action, recipient, channel, message, what not to claim, and the remaining work. `REASONING.md` shows the rules' assessment with citations, every refused action and the decision.

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

Without `ANTHROPIC_API_KEY` the runner still works using only the rules-based playbook, and the table it prints shows which cases that happened to.

Evaluate on the examples (each labelled cut hides the history from that point on, plus the outcome):

```bash
pnpm eval --offline                                   # rules only, no network
pnpm eval                                             # with the model; writes .casework/eval/SUMMARY.md
pnpm eval --resume .casework/eval                     # re-run only cuts that fell back to the rules
pnpm --filter @casework/tracks inspect 033 --cut 9    # how the rules read one case at one moment
```

On the 258 labelled cuts, the rules alone choose an acceptable next step 65.5% of the time and a prohibited one 4.7% of the time. With the model (Haiku 5.5), that becomes 81.0% and 1.6%. The prompt was tuned on these same cuts, so treat 81% as optimistic. Details are in [docs/plan/11-property-workflow.md](docs/plan/11-property-workflow.md#evaluation).

The web app (`pnpm dev`) runs the same agent and has these screens:

| Route | What it's for |
|---|---|
| `/inbox`, `/cases/<ref>` | Step through a case: pick any point in its history, let the agent decide with only what came before it, and compare its choice with what really happened next and the eval label (accepted, missed or prohibited). Also shows the sources, the live run trace, the pipeline strip (Read → Assess → Decide → Guard → Act / hand over), the decision and any handover. `?cut=<n>` and `?run=<id>` open a specific point or run. |
| `/runs` | Every run in this session as a live card. |
| `/escalations` | Handover cards waiting for a person. Choosing an option is recorded with the run. |
| `/reality` | Run the eval on the labelled examples (rules-only runs are free) and Reality Test batches, and read `ANSWERS/` written by the CLI. |
| `/tools` | Tools, policy rules, always-escalate triggers, tool health and how a run moves through the pipeline. |
| `/agents` | For the team: how agent A and agent B work, and their eval results side by side on the same labelled moments. Reads what each agent wrote under `.casework/`. |

Runs started in the UI are kept in memory and disappear when the server restarts. `pnpm reality` is still what writes `ANSWERS/`.

Checks: `pnpm typecheck && pnpm test && pnpm build`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | recommended | Claude API. Without it, decisions come from the rules-only playbook |
| `MODEL_MAX_RETRIES` | no | SDK retries on rate limits and overload (default 8) |
| `MODEL_DECIDE` | no | Decision model (default `claude-haiku-5-5`) |
| `MODEL_FAST` | no | Triage and extraction model (default `claude-haiku-5-5`; not used yet) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | voice only | ElevenLabs voice agent |
| `DATA_DIR` | no | Case folder the web app reads (default `./data/public`) |
| `DATA_WITHHOLD` | no | `outcomes` (default) hides how example cases ended; `none` loads cases as supplied |
| `TRACK` | no | `claims`, `property`, `banking` or `logistics` |
| `REALITY_CONCURRENCY` | no | Parallel cases in a batch (default 6) |
| `TOOL_TIMEOUT_MS` | no | Per-tool timeout (default 8000) |

## 5. Models, APIs and services

- Anthropic Claude via `@anthropic-ai/sdk`: Haiku 5.5 (`MODEL_DECIDE`, `claude-haiku-5-5`) with adaptive thinking decides the next step. There is no separate triage model yet, because the rules do the triage.
- ElevenLabs for the voice agent (optional).
- The hackathon's supplied synthetic tools and data.
- Libraries: see [docs/plan/02-stack.md](docs/plan/02-stack.md).

## 6. Assumptions

- **No live channels.** The organisers supply no live channels for property, so actions are recorded to an outbox, not sent. Every answer says so.
- **Landlord approval first.** The landlord approves every job and every quote unless the history shows standing consent. The examples contain no agency spending limit.
- **Inconsistent names are noise.** Names, addresses and company names that vary inside one case are treated as record-keeping noise, not as conflicts.
- **Decision time.** "Now" is the time of the latest event unless a cut sets it.

## 7. Known limitations

- The rules read signals with regular expressions. They miss some informal approvals, quotes with no £ figure, and tenants who fixed the problem themselves. The model catches most of these, but the playbook fallback does not.
- The eval labels were drafted by model reviewers. They are a strong baseline, not ground truth.
- Images in attachments are not read.
- Runs are held in memory, and the decision, voice and batch-from-UI endpoints return 501.

## 8. What we'd build next

_TBD._

## Licence

Apache 2.0. See [LICENSE](LICENSE).
