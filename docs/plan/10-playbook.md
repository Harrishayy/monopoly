# 10 · Playbook

> **Mixed.** NOW: steps 2, 5 and 6, "Done means: server module" and "Before the code freeze" (except the demo video). LATER (UI/demo): steps 1, 3 and 4, and "Done means: UI component".

How a new Claude instance or teammate picks up a piece of work.

1. Read `CLAUDE.md`, then the piece's entry in `05-components.md`. Use the build brief template there as your prompt.
2. Work only inside the folder your workstream owns (`07-modules.md`). Contract changes go in a separate commit.
3. Build against fixtures. Don't wait for the agent or the API.
4. Add UI components to `/design` with every state their entry lists.
5. Run `pnpm typecheck && pnpm test && pnpm build`, then look at the result in the browser (the `run` skill does this).
6. Run `/code-review` on the diff before committing.

## Done means: UI component

> **LATER (UI/demo): don't build yet.** 

- Uses tokens only and looks right in all three directions.
- Works with all four tracks, with no track words in the code (use `pack.vocabulary`).
- Every state listed in its catalogue entry renders in `/design`.
- Keyboard reachable, visible focus, and a label for every control.
- Status always has text as well as colour. Reduced motion gives a static pose.
- No horizontal scroll at 400px wide.

## Done means: server module

> **NOW (results).** 

- Input and output are validated with the shared zod schemas.
- Emits events for everything it does, including failures.
- Tested against recorded fixtures, with no network in unit tests.
- No secrets in code, logs or traces.

## Before the code freeze

> **NOW (results).** The demo video and social links are LATER.

- `pnpm reality` on the full batch, unattended. Commit `ANSWERS/` exactly as written.
- `/security-review`: no keys in the repo or in traces.
- README has all 8 required sections filled in with real content.
- Demo video in `demo/` (Git LFS), and social links in `SUBMISSION.md`.
