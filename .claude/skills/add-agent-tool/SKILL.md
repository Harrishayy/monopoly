---
name: add-agent-tool
description: Adds a tool to a pack: zod input, execute(), retry settings, policy rule if it spends money or changes state, and a fixture. Example: “/add-agent-tool property contractors.cancel”
---

# add-agent-tool

Adds a tool to a pack: zod input, execute(), retry settings, policy rule if it spends money or changes state, and a fixture.

## Steps

1. Add the tool to `packages/tracks/src/<track>/tools.ts`: name, description, zod `input`, `effect` (read | write | money), `timeoutMs`, `execute(input, ctx)`.
2. Pass `ctx.idempotencyKey` to the external API so retries cannot act twice.
3. If the tool writes or moves money, add a rule to `policy.ts` (use `spendLimit` for amounts in pence).
4. Record a fixture of a real call to `fixtures/` and test `execute` against it with no network.
5. Run `pnpm typecheck && pnpm test`.

Follow CLAUDE.md rules throughout.
