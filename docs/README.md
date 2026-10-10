# Docs

Start with `../CLAUDE.md`. Then use these docs for whatever you're building.

**Current focus: results first.** Every doc and section is tagged **NOW (results)** or **LATER (UI/demo)**. Don't build anything tagged LATER yet. See "Current focus" in `../CLAUDE.md`.

| Doc | When | What it covers |
|---|---|---|
| [design/casework-design-directions.html](design/casework-design-directions.html) | LATER | The visual reference. Three directions (Docket, Switchboard, Relay), their mascots, live components and the full build spec. Open it in a browser. |
| [plan/00-hackathon.md](plan/00-hackathon.md) | NOW | What the event requires and how it's scored, in our words |
| [plan/01-directions.md](plan/01-directions.md) | LATER | The three visual directions and how to pick one |
| [plan/02-stack.md](plan/02-stack.md) | Mixed | Every library and why, models, env vars, what we chose not to use. Models and agent libraries are NOW |
| [plan/03-architecture.md](plan/03-architecture.md) | Mixed | Layers, the run event stream, track packs. The agent loop and track packs are NOW |
| [plan/04-contracts.md](plan/04-contracts.md) | Mixed | Schemas, API routes, ANSWERS format. Only the API routes are LATER |
| [plan/05-components.md](plan/05-components.md) | Mixed | All 112 components, hooks and server modules, with build briefs. Only the Server section is NOW |
| [plan/06-tokens.md](plan/06-tokens.md) | LATER | Design tokens and scales |
| [plan/07-modules.md](plan/07-modules.md) | Mixed | Folder tree, import rules, workstreams. Each workstream is tagged |
| [plan/08-performance.md](plan/08-performance.md) | Mixed | Budgets and optimisation for UI and agent. Agent and API is NOW |
| [plan/09-skills.md](plan/09-skills.md) | Mixed | Which Claude Code skill to use for which job. The UI skills are LATER |
| [plan/10-playbook.md](plan/10-playbook.md) | Mixed | How a new Claude instance or teammate picks up work. UI component work is LATER |

## Keeping docs in sync

The published artifact is the visual source of truth: <https://claude.ai/artifact/BAEcxpJUFUdyxiXRqU6Bbi> (private; share it from its Share menu).
`02-stack.md`, `05-components.md` and `09-skills.md` are generated from the `LIBS`, `CAT` and `SKILLS` arrays in the HTML file.
To change a component spec, edit the array in `design/casework-design-directions.html`, then regenerate those three files by asking Claude to "regenerate the plan docs from the design artifact".
Regenerating overwrites the NOW/LATER tags in those three files, so add them back afterwards.
