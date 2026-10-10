# 02 · Stack and libraries

One language (TypeScript) across web, API and agent, so schemas are written once. Exact versions live in `pnpm-lock.yaml`.

| Package | Layer | Used for | Why this one |
|---|---|---|---|
| `react, react-dom` | web | All UI | Every Claude instance and teammate knows it well |
| `next (App Router)` | web | Pages, layouts, API route handlers, SSE, per-route code splitting | UI and API in one app; file-based routes are easy for agents to find |
| `typescript (strict)` | all | Types everywhere | Contracts shared by web, API and agent |
| `@tanstack/react-query` | web | Server state: cases, runs, tools | Caching, retries, optimistic decisions |
| `zustand` | web | UI state: direction, track, autonomy | Tiny, no provider, persist middleware |
| `tailwindcss v4` | web | Utility styling bound to tokens | Fast to write; tokens stay the source of truth |
| `class-variance-authority, clsx, tailwind-merge` | web | Component variants | Typed variants without class conflicts |
| `@radix-ui/react-*` | web | Dialog, Popover, DropdownMenu, Tooltip, Tabs, ToggleGroup, Switch, Select, ScrollArea, Slot | Keyboard and ARIA handled; we only add the skin |
| `motion` | web | Presence and layout animation: trace steps, toasts, segment thumb | LazyMotion keeps it small; honours reduced motion |
| `sonner` | web | Toasts | Small, accessible, stacks well |
| `cmdk` | web | Command palette (/ and ⌘K) | Fast fuzzy search, works with Radix |
| `lucide-react` | web | Icons | Tree-shaken per icon, consistent stroke |
| `@tanstack/react-virtual` | web | Long inbox lists and traces | Windowing with no layout lock-in |
| `@elevenlabs/react` | web | Live voice call in the browser | useConversation hook exposes volume for the waveform |
| `next/font` | web | Self-hosted Google fonts with CSS variables | Built in; no runtime request to Google |
| `msw` | web (dev, test) | Mock API and SSE from recorded runs | Frontend never waits on the backend |
| `vitest, @testing-library/react` | web, core | Unit and component tests | Fast, ESM-native, no Babel |
| `@playwright/test` | e2e | Demo flow, screenshots for the README | Also used by the webapp-testing skill |
| `eslint-plugin-boundaries` | all | Enforces import rules between layers | Keeps the module boundaries honest |
| `zod v4` | core | Case, event and handover schemas; JSON Schema for Claude tools | One source of truth via z.toJSONSchema |
| `@anthropic-ai/sdk` | core | Tool-use loop, structured outputs, prompt caching | Official SDK |
| `drizzle-orm, better-sqlite3` | web (server) | Event store, cases, decisions | One file DB, easy to export traces |
| `p-limit, p-retry` | core, cli | Batch concurrency, tool retries with backoff | Small and well tested |
| `pino` | web (server), cli | Structured logs saved next to ANSWERS | JSON lines judges can read |
| `@elevenlabs/elevenlabs-js` | web (server) | Signed voice sessions, server tools | Official SDK |
| `tsx` | dev | Runs TypeScript CLIs directly | No build step for scripts |

Already installed in the skeleton: next, react, react-dom, zod, zustand, clsx, tailwind-merge, class-variance-authority, lucide-react, server-only, tailwindcss, vitest, tsx. Add the others when the component that needs them is built.

## Models

| Job | Env var | Default |
|---|---|---|
| Decisions, handover, judgement | `MODEL_DECIDE` | `claude-opus-5-5` |
| Triage, source summaries, extraction | `MODEL_FAST` | `claude-haiku-4-5-20251001` |
| Voice agent turns | `ELEVENLABS_AGENT_ID` | ElevenLabs agent, Claude as LLM |

All env vars are listed in `.env.example`.

## Not using, on purpose

- **A separate API server.** Next.js route handlers serve REST and SSE. The agent lives in `packages/core`, so the Reality Test CLI runs it without Next.
- **Redux or a big state library.** Server state comes from route handlers (add TanStack Query when client fetching grows). UI state is three values in Zustand.
- **A charting library.** The Reality Test grid and tool sparklines are small enough to draw with CSS or SVG.
- **An agent framework.** The loop is ~150 lines on the Anthropic SDK; owning it keeps retries, the policy guard and event emission explicit.
- **A vector database.** Each case brings its own sources; prompt caching covers the rest.
