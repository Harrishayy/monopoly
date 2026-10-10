---
name: add-component
description: Scaffolds ui/<Name> or domain/<area>/<Name>: component, index, test, and a /design entry with every state. Reads the catalogue entry first. Example: “/add-component ConfidenceMeter”
---

# add-component

Scaffolds ui/<Name> or domain/<area>/<Name>: component, index, test, and a /design entry with every state. Reads the catalogue entry first.

## Steps

1. Find the component's entry in docs/plan/05-components.md (file, interface, states, libraries, notes). If it has none, write one first.
2. Create the folder from the entry: `apps/web/src/ui/<Name>/` for primitives or `apps/web/src/domain/<area>/<Name>.tsx` for domain UI, with an `index.ts` re-export. Add it to the parent `index.ts`.
3. Style with Tailwind token names (`bg-surface`, `text-ink-2`, `border-line`, `rounded-ui`) or CSS variables. No hex values, no track words.
4. Add a section to `apps/web/src/features/design/DesignView.tsx` showing every state in the entry.
5. Add a Vitest test for any logic.
6. Run `pnpm typecheck && pnpm build`, then open `/design` and check all three directions.

Follow CLAUDE.md rules throughout.
