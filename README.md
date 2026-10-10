# Casework

**One inbox for a letting agency's maintenance work, with an AI agent on every case and a person on
every decision that matters.**

Tenants phone, email or use a web form. Each message becomes a case in one console, joined to the
caller's existing case when there is one. An AI agent reads the whole conversation, works out where
the job stands and proposes the agency's single best next step. Low-stakes replies to the tenant go
out on their own. Anything else waits for a person to approve with the full context beside it:
landlord approvals, contractors, money, safety, complaints, low confidence. When the agent shouldn't
act at all, it escalates with a handover a person can decide from in seconds.

The same agent also runs unattended over a folder of cases and writes `ANSWERS/` for the hackathon's
Reality Test.

> **Draft.** Sections marked _TBD_ are still being written. See [how_to_demo.md](how_to_demo.md) to run the live demo.

---

## 1. The problem

Real-world operations are rarely clean. A single boiler repair at a letting agency involves a tenant,
a landlord and a contractor, across phone calls, emails, texts, quotes, invoices and CRM notes. The
information is incomplete, people change their minds, systems fail and rules conflict. Today a
coordinator re-reads every thread to work out what's happening, then decides who to chase.

Casework does the reading and the routine moves, and knows when to stop:

- **Continue on its own** when the step is low-stakes and well supported, e.g. acknowledge the
  tenant or ask for a photo.
- **Ask for more information** when something's missing.
- **Stop and involve a person** for safety risks, disputes, complaints, money, conflicting facts,
  or anything a policy rule forbids. The person gets the case, the agent's reasoning with cited
  sources, why it stopped, and the options.

## 2. What it does: everything in one place

```
  Phone call ──► ElevenLabs voice agent ─┐  (case appears mid-call)
  Email ───────► AgentMail inbox ────────┤
  Web form ────► Tenant portal ──────────┤
                                         ▼
                              intake: open or join a case
                              + attach the CRM record (tenant, property, landlord, consent limit)
                                         │
                                         ▼
                              store (SQLite): every message, every agent step, every approval
                                         │
                                         ▼
                              ENGINE: rules assessment → Claude decides → policy guard
                                         │
                                         ▼
                              outbound gate ── low-stakes + confident ──► sent to the tenant
                                         └──── everything else ─────────► Needs approval
                                         └──── unsafe / disputed ───────► Escalated (handover)
                                         │
                                         ▼
                              console: Inbox · Live runs · Architecture (rules, tools, cost, directory)
```

| Capability | How |
|---|---|
| **Voice** | An ElevenLabs Conversational AI agent answers as the agency's tenant line. Mid-call it calls our `log_issue` tool, so the case appears while the caller is still talking. The post-call webhook (HMAC-verified) files the full transcript and the agent re-runs. A poller files calls that no webhook delivered. |
| **Email** | A real inbox (AgentMail, e.g. `casework-lettings@agentmail.to`). New mail becomes a case within about 10 s. Replies are sent in the same thread. A follow-up joins the existing case by thread, then by sender. |
| **Tenant portal** | `/portal`: a "Call us" button (browser voice call) and a report form, built for phones first. Before a call the caller types their name, contact and address, so the case opens under them at once and the assistant greets them by name. On a phone the transcript reads as a chat in the page, with the call controls fixed at the bottom. |
| **Deleting cases** | "Delete" on a live case hides it from the inbox, approvals, runs and counts (with Undo). It is a flag: the history and costs stay in the database, and new messages from the same person open a fresh case. |
| **One record** | Every message, every agent run (each step, tool call and refusal), every outbound message and every human decision is stored and survives restarts. |
| **Approvals** | The *Needs approval* inbox filter. Each case's **Review messages** tab shows why the gate held the message, the draft in an editor, and who's involved. Approve & send, or reject. |
| **Escalations** | The *Escalated* filter. A handover card shows the situation, known and missing facts, options with the recommended one first, and the risks. |
| **Transparency** | **Architecture** tab: the system diagram; the **rules** rendered from the code that enforces them; the agent's **tools**; **cost** per case, autonomy rate and person-time saved; the **directory**. |

## 3. Architecture

```
apps/web          Next.js: console, tenant portal, channel adapters (voice, email), API routes, SSE
apps/cli          Reality Test runner (`pnpm reality`), eval and replay
packages/agents   The engine: one interface over every agent (A, B, D), bench and few-shot memory
packages/core     Schemas, agent A's guarded tool loop, policy guard, run reducer, ANSWERS writer
packages/tracks   Track packs: data loader, tools, policy, prompt, vocabulary (property is live)
```

**One engine, two front ends.** `getEngine(id).run(case, pack, ctx)` (`packages/agents/src/engine.ts`)
is the only way a case is run. The live product calls it when a call or email arrives. `pnpm reality`
calls it over a folder of cases. Both get the same append-only event stream, so the console, replay
and `ANSWERS/` are views of identical work. What differs is only what wraps it:

| | Live product (`apps/web`) | Reality Test (`apps/cli`) |
|---|---|---|
| Input | calls, emails, portal → SQLite store | case folders in `data/challenges/` |
| Around the engine | CRM context, persistence, outbound gate, approvals, live updates | nothing live: unattended, no network channels |
| Output | sent / held / escalated, visible in the console | `ANSWERS/<n>/ANSWER.md`, `REASONING.md`, `trace.jsonl` |

**Agent A (default)** has two halves:

- **Rules (deterministic).** `packages/tracks/src/property/events.ts` and `assess.ts` turn the
  history into parties, workflow signals and noise. From those they derive the stage, who we're
  waiting on, facts with citations, risk flags, playbook suggestions and *barred* actions. The rules
  were learned from the 50 example cases
  ([docs/plan/11-property-workflow.md](docs/plan/11-property-workflow.md)).
- **Model (judgement).** Claude reads the full history plus that assessment and picks one of 14
  action tools (ask the landlord, send a quote, chase a contractor, close, escalate, and so on). A
  policy guard refuses barred or invalid calls, e.g. sending a contractor without landlord approval,
  and hands the refusal back so the model can choose again. If the model is unavailable or fails,
  the top allowed playbook step is taken. The run never throws.

Agents B (a fixed pipeline with a fact ledger and few-shot memory) and D plug into the same engine. **D is the
default** (A's rules, forced triggers in code, three Haiku votes, a gated Opus supervisor and a code guard; see
`docs/plan/12-agent-d.md`). Pick another with `ENGINE=a|b` for the product, or `pnpm reality --agent a`. A case that never had a folder (a live call)
is written out in the organisers' case layout so folder-based agents read it like any other.

**Outbound gate** (`apps/web/src/server/live/intake.ts`). A message is sent automatically only when
all of these hold:

- it's a tenant acknowledgement, update or question;
- confidence is at least 70%;
- the run didn't escalate;
- no policy rule blocked an action;
- the recipient has an address and a live channel.

Everything else is held, and the reasons are shown to the reviewer. A newer run replaces older
drafts nobody acted on.

One run: `run.started → step.read → case.assessed → tool.called / action.blocked → decision.made →
escalation.created? → next.proposed → run.completed`. Details:
[docs/plan/03-architecture.md](docs/plan/03-architecture.md).

## 4. How to run it

Prerequisites: Node 22 or later, pnpm 10, and `cloudflared` for the voice webhooks (`brew install cloudflared`).

```bash
git clone --recurse-submodules <this repo>   # or: git submodule update --init
pnpm i
cp .env.example .env          # add ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, AGENTMAIL_API_KEY
pnpm email:setup              # once: creates the agency inbox and writes AGENTMAIL_INBOX
pnpm demo                     # console on http://localhost:3100 (inbox at /inbox, portal at /portal)
pnpm tunnel                   # separate terminal: public URL + points the ElevenLabs agent at it
                              # (or pnpm tunnel:ngrok; share <url>/portal so colleagues can call in)
```

`pnpm tunnel` creates or updates the ElevenLabs agent through its API (`scripts/voice-setup.mts`). No
dashboard clicks are needed. The full demo script, with what to prepare and how a colleague calls or
emails in, is in **[how_to_demo.md](how_to_demo.md)**.

Reality Test (put the released cases in `data/challenges/` first, see [data/README.md](data/README.md)):

```bash
pnpm reality --track property --in data/challenges --out ANSWERS            # agent A
pnpm reality --track property --in data/challenges --out ANSWERS --agent b  # same engine, agent B
```

Without `ANTHROPIC_API_KEY` the runner still works using only the rules-based playbook, and the table
it prints shows which cases that happened to.

Evaluate on the examples (each labelled cut hides the history from that point on, plus the outcome):

```bash
pnpm eval --offline                                   # rules only, no network
pnpm eval                                             # with the model; writes .casework/eval/SUMMARY.md
pnpm eval --resume .casework/eval                     # re-run only cuts that fell back to the rules
pnpm --filter @casework/tracks inspect 033 --cut 9    # how the rules read one case at one moment
```

On the 258 labelled cuts, the rules alone choose an acceptable next step 65.5% of the time and a
prohibited one 4.7% of the time. With the model (Haiku 5.5), that becomes 81.0% and 1.6%, but the
prompt was tuned on those cuts. On 70 held-out cuts labelled afterwards, Haiku scores **74.3%** with
no prohibited steps, against 67.1% for the rules alone. Details are in
[docs/plan/11-property-workflow.md](docs/plan/11-property-workflow.md#evaluation).

### Screens

| Route | What it's for |
|---|---|
| `/inbox`, `/cases/<ref>` | Every live case, newest first. Filters: All · Open · Needs approval · Escalated · Step taken. A live case has **Review messages**, **Conversation** and **Agent actions** tabs. The right panel holds the decision and handover; drag the borders to resize. |
| `/portal` | The tenant-facing page: call the voice agent, report an issue, or email the agency. |
| `/runs` | Every agent run as it happens. |
| `/reality` | Run the eval on the labelled examples and Reality Test batches, and read `ANSWERS/`. |
| `/architecture` | Overview diagram, plus **Rules**, **Tools**, **Cost** and **Directory** subtabs. |
| `/agents` | For the team: how the agents work and their eval results side by side. |

Example cases from `data/public` are kept for evaluation and hidden from the inbox. Set
`INBOX_EXAMPLES=show` to list them.

Checks: `pnpm typecheck && pnpm test && pnpm build`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | recommended | Claude API. Without it, decisions come from the rules-only playbook |
| `MODEL_DECIDE` / `MODEL_FAST` | no | Models (default `claude-haiku-5-5`) |
| `MODEL_MAX_RETRIES` | no | SDK retries on rate limits and overload (default 8) |
| `ENGINE` | no | `d` (default), `a` or `b`: which agent the product and `pnpm reality` run |
| `ELEVENLABS_API_KEY` | voice | ElevenLabs. `ELEVENLABS_AGENT_ID`, `_TOOL_ID`, `_WEBHOOK_ID` and `_WEBHOOK_SECRET` are written by `pnpm tunnel` / `pnpm voice:setup` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | outbound call | Trial is enough. `pnpm voice:call` imports the number and rings `DEMO_TENANT_PHONE` |
| `ELEVENLABS_VOICE_ID`, `ELEVENLABS_LLM`, `AGENCY_NAME` | no | Voice agent voice, model and the agency name it uses |
| `PUBLIC_URL` | voice | Written by `pnpm tunnel`; where ElevenLabs sends the mid-call tool and post-call webhook |
| `AGENTMAIL_API_KEY` | email | AgentMail. `AGENTMAIL_INBOX` is written by `pnpm email:setup` |
| `AGENTMAIL_USERNAME`, `AGENTMAIL_DISPLAY_NAME`, `EMAIL_POLL_MS`, `SUPPORT_EMAIL` | no | Inbox name, sender name, poll interval, address shown on the portal |
| `DEMO_TENANT_EMAIL`, `DEMO_TENANT_PHONE`, `DEMO_LANDLORD_EMAIL` | no | Put real inboxes on the seeded demo tenant and their landlord |
| `DB_PATH` | no | Live store (default `~/.casework/casework.db`; keep it outside the repo, or `next dev` reloads in a loop) |
| `INBOX_EXAMPLES` | no | `show` lists the example cases in the inbox |
| `DATA_DIR`, `DATA_WITHHOLD` | no | Example case folder; `outcomes` (default) hides how examples ended |
| `TRACK` | no | `claims`, `property`, `banking` or `logistics` |
| `REALITY_CONCURRENCY`, `TOOL_TIMEOUT_MS` | no | Batch parallelism (default 6), per-tool timeout (default 8000) |

## 5. Models, APIs and services

- **Anthropic Claude** (`@anthropic-ai/sdk`). Haiku 5.5 (`claude-haiku-5-5`) decides every next step.
  Cost per case is a fraction of a penny; see Architecture → Cost.
- **ElevenLabs Conversational AI**: the voice agent (`@elevenlabs/react` in the browser; agents,
  tools, webhooks and conversations APIs on the server).
- **AgentMail**: the agency's email inbox (REST: poll, reply in thread, send).
- **Cloudflare quick tunnels** (`cloudflared`): a public URL so ElevenLabs can reach the local app
  during a call.
- **SQLite** through Node's built-in `node:sqlite`: no native dependencies.
- The hackathon's example cases (`data/public`, git submodule) for learning the workflow and for
  evaluation.
- Libraries: see [docs/plan/02-stack.md](docs/plan/02-stack.md).

## 6. Assumptions

- **Landlord approval first.** The landlord approves every job and every quote unless the history or
  the directory shows standing consent. The example cases contain no agency spending limit.
- **Only tenant replies auto-send.** Messages to landlords and contractors always wait for a person.
  That's the conservative default for a first deployment.
- **The directory is fictional.** A small seeded register stands in for the agency's CRM. Unknown
  callers still get a case; the agent says it doesn't know the landlord yet.
- **Inconsistent names are noise.** Names, addresses and company names that vary within one case are
  treated as record-keeping noise, not conflicts.
- **Decision time.** "Now" is the time of the latest event unless an evaluation cut sets it.

## 7. Known limitations

- Outbound is live for email only. SMS and phone call-backs are drafted and recorded, not sent.
- The quick tunnel's URL changes on every restart (the script re-points ElevenLabs), and it exposes
  the whole app while it runs. A deployment would use a fixed domain and authentication.
- There is no login or role model yet: anyone with the console URL can approve.
- The rules read signals with regular expressions. They miss some informal approvals, quotes with
  no £ figure, and tenants who fixed the problem themselves. The model catches most of these, but
  the playbook fallback doesn't.
- The eval labels were drafted by model reviewers. They are a strong baseline, not ground truth.
- Images in attachments are not read.

## 8. What we'd build next

_TBD._ Candidates: SMS and WhatsApp channels; contractor and landlord portals; a real CRM connector
in place of the seeded directory; roles and audit export; learning from approvals (an edited draft
becomes a few-shot example).

## Licence

Apache 2.0. See [LICENSE](LICENSE).
