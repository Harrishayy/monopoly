# 01 · Visual directions

> **LATER (UI/demo): don't build yet.** The visual direction is chosen once the agent works.

Three directions share one component inventory. Choosing a direction only changes the tokens (`apps/web/src/tokens/*.css`) and two skinned components: the mascot and the outcome stamp. Switch between them live at `/design`, or open `docs/design/casework-design-directions.html`.

| | A · Docket | B · Switchboard | C · Relay |
|---|---|---|---|
| Metaphor | A careful clerk: paper, ledgers, rubber stamps | A live operator at a switchboard | A friendly teammate passing the baton |
| Feel | Light, calm, legible | Dark, dense, control room | Bright, chunky, tactile |
| Mascot | **Thump**, a rubber stamp that only lands when it's sure and raises a "?" flag when it isn't | **Patch**, a plug with an LED face whose eyes change colour with the run | **Pip**, a pebble with an antenna that raises a hand when a person must decide |
| Type | Archivo (expanded for display) + IBM Plex Mono | Martian Mono + Onest | Bricolage Grotesque + Figtree + JetBrains Mono |
| Accent | Stamp violet | Phosphor amber | Cobalt with sunflower |
| Signature motion | Stamp lands (scale 1.9 → 1, rotate −12° → −4°) | LED blinks, active nodes glow | Outcome pops, buttons press into their shadow |
| Best for | Claims and banking, where auditability sells | Voice agents, many concurrent runs | The 60-second demo and people's choice |

## Mascot states

Each state maps to a run event (`packages/core/src/run/mascot.ts`):

| State | Means | Triggered by |
|---|---|---|
| idle | Watching the inbox | no run |
| think | Reading sources, deciding | run.started, step.read, decision.made, action.blocked |
| act | Calling a tool | tool.called, tool.succeeded |
| fail | A tool failed, retrying | tool.failed |
| esc | A person needs to decide | escalation.created, run.completed (escalated) |
| done | Case closed | run.completed (resolved) |

## Once a direction is picked

1. Set the default `data-dir` in `apps/web/src/app/layout.tsx`.
2. Delete the other two directions' fonts from `layout.tsx` (this saves roughly 200 KB of font files).
3. Keep the other token files so `/design` can still compare, or delete them.
