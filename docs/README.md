# Docs

Start with `../CLAUDE.md`. Then use these docs for whatever you're building.

| Doc | What it covers |
|---|---|
| [design/casework-design-directions.html](design/casework-design-directions.html) | The visual reference. Three directions (Docket, Switchboard, Relay), their mascots, live components and the full build spec. Open it in a browser. |
| [plan/00-hackathon.md](plan/00-hackathon.md) | What the event requires and how it's scored, in our words |
| [plan/01-directions.md](plan/01-directions.md) | The three visual directions and how to pick one |
| [plan/02-stack.md](plan/02-stack.md) | Every library and why, models, env vars, what we chose not to use |
| [plan/03-architecture.md](plan/03-architecture.md) | Layers, the run event stream, track packs |
| [plan/04-contracts.md](plan/04-contracts.md) | Schemas, API routes, ANSWERS format |
| [plan/05-components.md](plan/05-components.md) | All 112 components, hooks and server modules, with build briefs |
| [plan/06-tokens.md](plan/06-tokens.md) | Design tokens and scales |
| [plan/07-modules.md](plan/07-modules.md) | Folder tree, import rules, workstreams |
| [plan/08-performance.md](plan/08-performance.md) | Budgets and optimisation for UI and agent |
| [plan/09-skills.md](plan/09-skills.md) | Which Claude Code skill to use for which job |
| [plan/10-playbook.md](plan/10-playbook.md) | How a new Claude instance or teammate picks up work |

## Keeping docs in sync

The published artifact is the visual source of truth: <https://claude.ai/artifact/BAEcxpJUFUdyxiXRqU6Bbi> (private; share it from its Share menu).
`02-stack.md`, `05-components.md` and `09-skills.md` are generated from the `LIBS`, `CAT` and `SKILLS` arrays in the HTML file.
To change a component spec, edit the array in `design/casework-design-directions.html`, then regenerate those three files by asking Claude to "regenerate the plan docs from the design artifact".
