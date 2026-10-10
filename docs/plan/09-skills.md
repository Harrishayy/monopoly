# 09 · Skills

Claude Code skills and the job each one is for. Invoke by name (`/frontend-design`) or describe the task.

| Skill | Area | Use it for | Example ask |
|---|---|---|---|
| `frontend-design` | UI | Build any screen or component from this spec with production quality. | “Build HandoverCard from the catalogue brief.” |
| `impeccable` | UI | Critique, polish, audit and harden UI; catches generic AI-looking patterns. | “Polish the inbox pane and audit its states.” |
| `emil-design-eng` | UI | Motion and interaction detail: the stamp, segmented thumb, toasts. | “Tune the outcome stamp animation.” |
| `design:design-system` | UI | Audit token use and naming; document component variants. | “Audit apps/web/src/ui for hard-coded values.” |
| `design:accessibility-review` | UI | WCAG pass on the shell, dialogs and handover. | “Check the handover flow for a11y.” |
| `design:ux-copy` | UI | Button labels, error and empty states, escalation wording. | “Write the empty state for /escalations.” |
| `design:design-handoff` | UI | A spec sheet for a component before a teammate builds it. | “Hand off VoiceCallCard.” |
| `dataviz` | UI | RealityMeter, tool-health sparklines, any chart. | “Design the tool health sparkline.” |
| `claude-api` | Agent | Agent loop, tool use, structured outputs, prompt caching, model choice. | “Implement agent/loop.ts with caching.” |
| `mcp-builder` | Agent | Optional: expose track tools as an MCP server for other agents. | “Wrap the property pack tools as MCP.” |
| `pdf · xlsx` | Agent | Parse synthetic documents and spreadsheets in a track loader. | “Write the claims loader for these PDFs.” |
| `run` | Quality | Launch the app and confirm a change works in the browser. | “Run it and show me the inbox.” |
| `webapp-testing` | Quality | Playwright flows and screenshots for the README and demo. | “Script the demo flow and capture screenshots.” |
| `code-review` | Quality | Review a diff for bugs before merging. | “/code-review high” |
| `simplify` | Quality | Clean up for reuse and clarity after a feature lands. | “/simplify the agent folder.” |
| `security-review` | Quality | Check for leaked keys and unsafe handling before going public. | “/security-review before freeze.” |
| `init` | Repo | Create or refresh CLAUDE.md from the codebase. | “/init” |
| `skill-creator` | Repo | Scaffold the project skills below. | “Create the add-track-pack skill.” |
| `commit-and-push` | Repo | Stage, write a commit message, push. | “Commit and push this.” |
| `Artifact (this page)` | Repo | Keep this spec current; republish when contracts change. | “Update the catalogue with the new component.” |

## Project skills

These live in `.claude/skills/` so every instance does common jobs the same way.

| Skill | What it does | Example |
|---|---|---|
| `add-component` | Scaffolds ui/<Name> or domain/<area>/<Name>: component, index, test, and a /design entry with every state. Reads the catalogue entry first. | “/add-component ConfidenceMeter” |
| `add-track-pack` | Copies a pack, wires the loader to data/<track>, registers it, and generates a test that parses every supplied case. | “/add-track-pack logistics” |
| `add-agent-tool` | Adds a tool to a pack: zod input, execute(), retry settings, policy rule if it spends money or changes state, and a fixture. | “/add-agent-tool property contractors.cancel” |
| `run-reality-test` | Runs the CLI on a folder, checks every case produced ANSWER.md and REASONING.md, and prints failures. Never edits answers. | “/run-reality-test data/reality” |
| `record-fixture` | Runs one case against the real API and saves the event stream to tracks/<track>/fixtures for msw and tests. | “/record-fixture PM-7731” |
| `demo-script` | Builds the 60-second demo run order: which case, which screens, what to say, with a Playwright script to drive it. | “/demo-script property” |
