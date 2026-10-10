# How to demo Casework

A step-by-step script for showing the live product: a tenant phones or emails, the case appears in
the agency's console, the agent decides, and a person approves what needs approving.

Allow **15 minutes** for setup the first time and **2 minutes** after that.

---

## 1. One-time setup (backend)

### 1.1 Install

```bash
pnpm i
brew install cloudflared        # public tunnel so ElevenLabs can reach localhost
cp .env.example .env            # if you haven't already
```

### 1.2 Keys in `.env`

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API keys |
| `AGENTMAIL_API_KEY` | console.agentmail.to → API keys (free: 3 inboxes, 3,000 emails/month) |

Leave these empty. The setup scripts fill them in: `ELEVENLABS_AGENT_ID`, `ELEVENLABS_TOOL_ID`,
`ELEVENLABS_WEBHOOK_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `PUBLIC_URL`, `AGENTMAIL_INBOX`.

### 1.3 Create the email inbox (once)

```bash
pnpm email:setup
```

This prints the agency's address, e.g. **`casework-lettings@agentmail.to`**. Anyone can email it from
Gmail, Outlook or a phone.

### 1.4 Optional: make a demo person "known"

The directory (Architecture → Directory) is a small fictional register of tenants, landlords and
contractors. To show the agent recognising a caller and knowing their landlord and consent limit, put
real contact details on the first tenant, **Alex Demo**, and their landlord:

```bash
# .env
DEMO_TENANT_EMAIL=colleague@gmail.com     # whoever will play the tenant
DEMO_TENANT_PHONE=+447700900123           # number they'll give on the call
DEMO_LANDLORD_EMAIL=you@gmail.com         # whoever will play the landlord (receives approved emails)
```

Anyone not in the directory still gets a case. The agent then just doesn't know their landlord yet,
and says so.

---

## 2. Before every demo (2 minutes)

Use **three terminals**.

```bash
# Terminal 1: the app on http://localhost:3100
pnpm demo

# Terminal 2: the public tunnel. It points ElevenLabs at this machine. Keep it open.
pnpm tunnel
```

`pnpm tunnel` prints a public URL like `https://some-words.trycloudflare.com` and re-registers the
ElevenLabs voice agent's mid-call tool and post-call webhook with it. **Every restart gives a new
URL.** That's fine, because the script re-points ElevenLabs automatically.

Check it worked:

- The Terminal 1 log shows `[email] polling casework-lettings@agentmail.to every 10s` and
  `[voice] polling agent … every 15s`.
- `http://localhost:3100/inbox` loads.
- `<tunnel URL>/portal` loads from your phone. This proves the tunnel works.

### Clean slate (optional)

The store lives at `~/.casework/casework.db`, outside the repo on purpose. To start with an empty
inbox, stop Terminal 1, then:

```bash
rm ~/.casework/casework.db*
```

To keep a couple of finished cases for showing escalations, don't delete anything.

---

## 3. What to prepare

| Who | What they need |
|---|---|
| **You (the agency)** | `http://localhost:3100/inbox` on the big screen |
| **Colleague playing the tenant (email)** | The agency address: `casework-lettings@agentmail.to` |
| **Colleague playing the tenant (phone)** | The portal link `<tunnel URL>/portal` on their phone or laptop (needs a mic) |
| **Colleague playing the landlord** | Their inbox, if you set `DEMO_LANDLORD_EMAIL` |

Have a scenario ready for each. Some that show different behaviour:

| Scenario | What the tenant says | What you should see |
|---|---|---|
| Routine | "The kitchen tap has been dripping since Monday, it's pooling under the sink." | New case → agent asks the landlord how to proceed → **held for approval** (landlord messages always are) |
| Needs info | "Something's wrong with the shower." | Agent asks the tenant for detail or photos → **sent automatically** to the tenant (low-stakes, confident) |
| Safety | "I can smell gas in the kitchen." | The voice agent gives the gas emergency line immediately. The case is **escalated** to a person, not handled automatically |
| Urgent + vulnerable | "No heating or hot water, and I've got a two-year-old." | Urgent landlord approval request with the child flagged, **held for approval** |
| Complaint | "This is the third time I've reported the damp. I want to speak to a manager." | **Escalated** with full context and options |

---

## 4. Running the demo

### 4.1 A phone call (ElevenLabs voice agent)

1. The colleague opens `<tunnel URL>/portal` and taps **Call us**, then allows the microphone.
2. They talk to the "Northgate Lettings tenant line". It asks one question at a time: name, contact,
   address, the problem.
3. **While they are still talking**, a toast pops up in your console ("New call · LIVE-0xx") and the
   case appears at the top of the Inbox. The voice agent reads the reference back to the caller.
4. When they hang up, the full transcript is attached and the agent re-runs on the whole conversation.

No tunnel? Calls still arrive, just about 15 seconds after hang-up, through the poller. You can also
call from your own laptop at `http://localhost:3100/portal`.

### 4.2 An email (AgentMail)

1. The colleague emails `casework-lettings@agentmail.to` from Gmail, e.g. subject "Kitchen tap leaking",
   body describing the problem.
2. Within about 10 seconds a toast appears ("New email · LIVE-0xx") and the case is at the top of the
   Inbox.
3. If the agent's reply is a low-stakes message back to the tenant, it is **sent automatically into
   the same Gmail thread**. Ask the colleague to show it on their phone.
4. If they reply to that email, the reply joins the **same case**, matched by their address, and the
   agent runs again.

### 4.3 The tenant portal form

`/portal` → **Report an issue**. It opens a case just like an email or call. Useful if Wi-Fi or the
mic is unreliable.

---

## 5. What to show in the console

| Where | What to point at |
|---|---|
| **Inbox** filters | *Needs approval* and *Escalated* are filters with counts. These are a person's to-do list. |
| A live case → **Review messages** | Why it was held (e.g. "landlord.request_approval needs a person's sign-off"), the draft in a large editor, and who's involved from the directory. Edit a line, then **Approve & send**. If `DEMO_LANDLORD_EMAIL` is set, the landlord's inbox receives it. |
| **Conversation** tab | The call transcript turn by turn (Caller / Voice agent) or the email thread |
| **Agent actions** tab | Every run on the case: read → assess (rules) → decide (model) → guard → act or hand over. Re-runs are kept. |
| Right panel | The agent's decision, confidence, cited sources and what it must not claim. Drag the border or click ⤢ to widen it. |
| An **escalated** case | The handover card: the situation, what's known and what's missing, and options with the recommended one first |
| **Architecture → Overview** | One diagram: channels → intake → store → engine → outbound gate → console, and the separate offline Reality Test path |
| **Architecture → Rules** | The guard checks, the policy rules and the outbound gate, rendered from the code that enforces them |
| **Architecture → Cost** | Model spend per case (fractions of a penny), autonomy rate, and estimated person-hours saved, with every assumption listed |
| **Live runs** | Every agent run as it happens |

A 60-second order that works: start the call → toast appears → open the case while the caller is
still talking → hang up → transcript lands → **Review messages** → approve → show the landlord's inbox →
**Architecture → Cost**.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| No toast for a call | Is Terminal 2 (`pnpm tunnel`) still running? If not, restart it. The poller still files the call about 15 s after hang-up. |
| No email case | Terminal 1 must show `[email] polling …`. If not, check `AGENTMAIL_API_KEY` / `AGENTMAIL_INBOX` in `.env` and restart `pnpm demo`. |
| "Call us" does nothing | The browser blocked the mic. Allow it in the address bar. Remote callers must use the `https://…trycloudflare.com` URL, not `http://<your-ip>`. |
| Approve says "No address" | The recipient isn't in the directory. Set `DEMO_LANDLORD_EMAIL`, or edit the seed in `apps/web/src/server/live/directory.ts`. |
| Page keeps reloading | Something is writing into the repo while `next dev` watches it. The store must stay outside the repo (`DB_PATH=~/.casework/casework.db`). |
| Port 3100 busy | Run `PORT=3200 pnpm tunnel` and `pnpm --filter @casework/web exec next dev -p 3200`. |

**Security note:** the tunnel exposes the whole app, the console included, at a random public URL for
as long as it runs. Stop it (Ctrl-C) after the demo.
