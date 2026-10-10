---
name: demo-script
description: Builds the 60-second demo run order: which case, which screens, what to say, with a Playwright script to drive it. Example: “/demo-script property”
---

# demo-script

Builds the 60-second demo run order: which case, which screens, what to say, with a Playwright script to drive it.

## Steps

1. Pick the case that best shows judgement: a failure that recovers, a refused action, and a clean handover.
2. Write a shot list for at most 60 seconds: problem (5s), the case arriving (10s), the live run (20s), the handover or outcome (15s), the Reality Test grid (10s).
3. Write a Playwright script that drives the app through the shot list at a readable pace.
4. Use `pnpm replay` on a recorded trace so the demo never depends on live model latency.

Follow CLAUDE.md rules throughout.
