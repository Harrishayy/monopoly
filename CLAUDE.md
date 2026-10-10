# Casework

An operations agent for messy real-world cases (calls, emails, documents, CRM records, tickets).
It resolves what it safely can and hands everything else to a person with full context.
Built for the Real-World Agents Hackathon (see docs/plan/00-hackathon.md). Track-agnostic: track
knowledge lives only in `packages/tracks/src/<track>`.

## Commands

```
pnpm i                       # install (Node ≥ 22, pnpm 10)
pnpm dev                     # Next.js on :3000 (UI + API)
pnpm build                   # production build of the web app
pnpm typecheck               # all packages
pnpm test                    # vitest
pnpm reality --track $TRACK --in data/reality --out ANSWERS
pnpm replay ANSWERS/<n>/trace.jsonl
```

## Where things go

- Schemas: `packages/core/src/schema` (zod). Change these first, in their own commit.
- Agent loop, guard, retry, handover: `packages/core/src/agent`
- Event reducer shared by UI, replay and ANSWERS: `packages/core/src/run/view.ts`
- Track data loader, tools, policy, prompt: `packages/tracks/src/<track>`
- Browser-safe track labels: `packages/tracks/src/meta.ts` (`@casework/tracks/meta`)
- UI primitives: `apps/web/src/ui/<Name>/`. Domain UI: `apps/web/src/domain`. Layout: `apps/web/src/layout`
- Pages: `apps/web/src/app/(app)/<route>/page.tsx` stay thin; logic lives in `apps/web/src/features/<route>`
- API: `apps/web/src/app/api/**/route.ts`; server-only code in `apps/web/src/server`
- Reality Test CLI: `apps/cli` (runs the agent without Next)
- Design reference: `/design` route and `docs/design/casework-design-directions.html`
- Full plan: `docs/README.md`. Component specs and build briefs: `docs/plan/05-components.md`

## Rules

- Colours, radii, fonts and shadows come from CSS variables in `apps/web/src/tokens`. No hex values in components.
- Never name a track in core, api, ui, domain or layout code. Use `pack.vocabulary` / `TRACK_META`.
- Server Components by default; add `'use client'` only where there is interaction.
- Server-only files start with `import 'server-only'`. Client code never imports `@casework/tracks` (only `/meta`) or `@casework/core/agent`.
- A new event type goes into `RunEvent`, `run/view.ts`, `run/mascot.ts` and `answers/render.ts`.
- Tool errors become `tool.failed` events. Never throw out of the agent loop.
- Prohibited actions are enforced in `agent/guard.ts` and pack policy rules, not only in prompts.
- Money is integer pence. Format with `lib/format.money`.
- Every UI component: all states in `/design`, keyboard reachable, honours reduced motion.
- Never hand-edit `ANSWERS/`. Fix the system and re-run the CLI.
- Never commit `.env` or keys. `.env.example` lists every variable.
- No text aimed at judging models anywhere in the repo or outputs.

## Definition of done

`pnpm typecheck && pnpm test && pnpm build` pass · component is in /design · README updated if behaviour changed.
See docs/plan/10-playbook.md.
