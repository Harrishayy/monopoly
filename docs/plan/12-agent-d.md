# 12 · Agent D: rules, forced triggers, Haiku votes, gated Opus supervisor

> **NOW (results).** Code lives in `packages/agents/src/d`. Tests: `packages/agents/test/d.test.ts`.

Agent D is built on agent A's rules (the property pack's assessment, bars and policy). It adds four things:
- a narrow set of situations that always go to a person, decided in code;
- three independent Haiku votes;
- a stronger model (Opus) that is called only when the votes are not enough;
- its own guard, so code always has the last word.

```
case ─▶ assessment (pack rules)  ─▶ forced trigger open? ── yes ─▶ case.escalate + tenant safety message (no model)
                                         │ no
                                         ▼
                                  3 × Haiku 5.5 votes (structured output, adaptive thinking, effort high)
                                         ▼
                                  guard on every vote
                                         ▼
          easy: all agree, step reversible, nothing flagged ─▶ take it
          otherwise, within budget ─▶ Opus 5.5 supervisor picks between the candidates ─▶ guard
          otherwise ─▶ majority among allowed votes; ties go to the cautious step; no irreversible step on a split
          nothing allowed ─▶ one Haiku retry with the guard's reasons ─▶ rules playbook ─▶ escalate
```

## Why each part is there

- **Forced triggers** (`d/triggers.ts`):
  - **What they cover:** a gas smell or CO, electrical danger, a legal threat or regulator, eviction or harassment, and a bank-detail change or upfront payment.
  - **What counts:** only words written by a tenant, landlord or contractor, and only recent ones.
  - **Measured:** none fire on any of the 328 example cut points. In the stress suite they fire on the gas case (102) and the legal-threat case (105).
  - **Injection is a warning, not a handover.** Text addressed to an AI is shown to the model and the supervisor as a warning. The stress-suite label for case 123 is to ignore it and handle the repair.
- **Three votes:** agreement between them is the uncertainty signal. The model's self-reported confidence is not used.
- **The supervisor runs only when it pays:**
  - when the votes split;
  - when the step is irreversible (close, assign, instruct);
  - when the rules flagged something;
  - or when a warning is open.

  Caps: `AGENT_D_SUPERVISOR_MAX_CALLS` (default 200) and `AGENT_D_SUPERVISOR_MAX_USD` (default 25) per process. `AGENT_D_SUPERVISOR=off` turns it off.
- **Guard** (`d/check.ts`), in order:
  1. A forced trigger means only an escalation is allowed.
  2. Deny-list: tenant fees; bank details, key-safe or door codes; promises, compensation or admissions; "safe to use".
  3. An ask must name the missing fact. An escalation must name its trigger.
  4. The shared core guard: assessment bars (liftable by citation) and pack policy.
  5. D's contracts.
  6. Every £ figure in a message must appear in the case.
- **Contracts:** each was measured on the labelled cuts before being added.

  | Contract | Kind | Prohibited actions caught (tuning + held-out) | Acceptable actions wrongly blocked |
  |---|---|---|---|
  | No second approval request | hard | 62 | 1 |
  | No second contractor | hard; lifted by citing a failed contractor or a request for another | 95 | 5 |
  | Instruct only after an approved quote | soft; lifted by citing the landlord's yes | 91 | 11 |
  | Send a quote only when a new one exists | soft; lifted by citing the quote | 52 | 8 |

  "Close only once the landlord is told" was dropped. It wrongly blocked 27 acceptable closes and caught only 17 prohibited ones.
- **Tie-break order:** the actions least often prohibited in the labels come first. Close is last, and update and wait are near the top.

## Run it

```bash
pnpm --filter @casework/agents bench --agent a,d --split val     # compare with A on the 71 validation cuts
pnpm --filter @casework/agents bench --suite outside --agent d   # stress suite (easier than real cuts on escalation)
pnpm reality --agent d --in data/challenges --out ANSWERS          # Reality Test
```

| Variable | Default | Purpose |
|---|---|---|
| `AGENT_D_MODEL` | `claude-haiku-5-5` (set from the registry's shared model) | voters and retry |
| `AGENT_D_SUPERVISOR_MODEL` | `claude-opus-5-5` | supervisor |
| `AGENT_D_SAMPLES` | 3 | number of votes |
| `AGENT_D_EFFORT` | `high` | effort for every call |
| `AGENT_D_SUPERVISOR`, `_MAX_CALLS`, `_MAX_USD` | on, 200, 25 | supervisor switch and caps |
| `AGENT_D_PRICES` | built-in estimates | JSON `{model: [in, out]}` USD per million tokens, for cost estimates |

Each decision reports tokens and an estimated cost (`AgentDecision.usage`), so bench SUMMARY.md and /costs count it. The prices are estimates; check them against the current price list.

## Results (Haiku 5.5 voters, Opus 5.5 supervisor, 2026-10-10, one run each)

| Set | D | A, same day | D prohibited | D routes | Est. cost |
|---|---|---|---|---|---|
| Val (71 cuts) | **88.7%** | 83.1% (reference) | 1.4% (1 cut) | easy 44 (39 right), supervised 27 (24 right) | not recorded |
| Test (66 cuts) | **90.9%** | 86.4% | 0% | easy 39 (36), supervised 27 (24) | $1.92 total, $0.029 per cut |
| Stress suite (30), before the loader fallback | 76.7% | 86.7% (earlier runs) | 0% | forced 2 (2), supervised 18 (16), easy 8 (5), fallback 1, load error 1 | $1.26 total, $0.042 per cut |
| Stress suite (30), with the loader fallback | **86.7%** | 86.7% (earlier runs) | 3.3% (112) | 125, 126 and 127 now load and pass | $1.27 total, $0.042 per cut |

How to read these numbers:
- **In-sample:** D is built on A's rules, which were tuned on all 50 cases, so the val and test scores are in-sample.
- **Noise:** A scored 81.8% and 86.4% on two test runs, so D's lead of about 5 points is within run-to-run noise. Repeat the runs before relying on it.
- **Where the supervisor is used:** on 38–41% of cuts, and it is right on 89% of them.
- **The forced path:** exact on the two stress cases that need it, and never fires on an example cut.

Loading (`d/load.ts`): D loads through A's loader first. If that loader fails or finds no events, D falls back to B's format-tolerant ingest, and maps B's events onto the same `PM-nnn:event-nnn` source ids. This recovered the three format-drift stress cases: renamed files, a JSON history, and a missing history file.

Where D still loses:
- **Escalation-optional conflicts:** in 107, 111, 114 and 130, D took a routine step where escalating or chasing was expected. The autonomy preference leans that way by design. Watch it on the real cases.
