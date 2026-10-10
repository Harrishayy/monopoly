# Evaluation summaries

Copied unchanged from the bench and eval runs on 2026-10-10 (the full per-cut results stay in the
local `.casework/` folder). Labelled cuts: `packages/tracks/src/property/eval`. Stress cases:
`data/outside`. How the cuts and labels work: [docs/plan/11-evals.md](../plan/11-evals.md) and
[docs/plan/12-agent-d.md](../plan/12-agent-d.md).

| File | Agent | Set |
|---|---|---|
| [d-test.md](d-test.md) | D (v4) | Test split, 66 cuts |
| [d-val.md](d-val.md) | D (latest, with the disagreement rule) | Validation split, 71 cuts |
| [d-perturbation.md](d-perturbation.md) | D (v4) | Perturbation suite, 120 cuts |
| [d-stress-suite.md](d-stress-suite.md) | D (latest) | Stress suite, 52 team-written cases |
| [a-test.md](a-test.md) | A | Test split, 66 cuts (same day reference) |
| [a-258.md](a-258.md) | A with Claude Haiku 5.5 | All 258 tuning cuts |
| [rules-only-258.md](rules-only-258.md) | Rules-only playbook | All 258 tuning cuts |
| [a-holdout.md](a-holdout.md) | A with Claude Haiku 5.5 | 70 held-out cuts |
| [rules-only-holdout.md](rules-only-holdout.md) | Rules-only playbook | 70 held-out cuts |

Each is one run. Run-to-run noise is about ±3 points on 71 cuts.
