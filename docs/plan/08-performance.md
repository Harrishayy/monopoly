# 08 · Performance and reliability

Two kinds of speed matter. The UI has to feel instant in the demo, and the agent has to finish every unseen case in the Reality Test window without anyone stepping in.

## Budgets

> **Mixed.** NOW: the prompt cache and unhandled errors rows. LATER (UI/demo): the other four rows.

| Budget | Target |
|---|---|
| First-load JS on /inbox (gzip) | ≤ 170 KB |
| Largest contentful paint on /inbox | ≤ 1.2 s |
| SSE event to trace step on screen | ≤ 100 ms |
| Animations | 60 fps, transform and opacity only |
| Prompt cache hit rate (system + tools + policy) | ≥ 90% |
| Unhandled errors that end a batch | 0 |

## Frontend

> **LATER (UI/demo): don't build yet.** 

- **Server Components by default.** Next splits per route. Only interactive pieces (trace, controls, voice) are client components.
- **Lightweight motion.** The mascot, chips and stamp use CSS keyframes. If `motion` is added, use `LazyMotion` + `domAnimation`.
- **One stream per run.** `useRunStream` parses with zod, reduces with `applyEvent`, batches with `startTransition`, and resumes from `Last-Event-ID`.
- **Memoise trace steps** keyed by `seq`. Virtualise traces past 200 steps and the inbox past 100 cases (`@tanstack/react-virtual`).
- **Fonts.** `next/font` self-hosts latin subsets. Drop the unused directions' fonts once one is chosen.
- **Icons.** Named imports from lucide-react, so only the icons used are bundled.
- **Shared clock.** One 30 s ticker drives every RelativeTime and SlaTimer.

## Agent and API

> **NOW (results).** 

- **Prompt caching.** Order the prompt as system, then tool definitions, then track policy, then case sources, with cache breakpoints after policy and after sources.
- **Two models.** The fast model summarises each source once (cache by content hash). The decision model sees summaries plus the passages it cites.
- **Parallel tools.** Let Claude make independent tool calls in one turn and run them with `Promise.all` behind the guard.
- **Retries.** `withRetry`: per-tool timeout, 3 attempts, exponential backoff with jitter, and the same idempotency key on every attempt. Each failure emits `tool.failed`.
- **Failures become events, not crashes.** A tool error returns to the model as a `tool_result` with `is_error`.
- **Hard limits.** 12 turns and a token budget per case. If either is hit, the run escalates with the context so far.
- **Batch throughput.** The CLI runs cases with bounded concurrency (`REALITY_CONCURRENCY`) and backs off as a whole on 429s. Each case is written as soon as it finishes.
- **Replay without spend.** Stored events let the demo and UI work replay runs with no model calls.
