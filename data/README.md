# Data

Case folders use the organisers' layout. Each track uses the same shape:

```
data/
  public/                       git submodule → github.com/DwellyOrg/HackatonPublicCases
    Property Management/          (also Insurance Claims Processing, Banking & Financial Services, Delivery & Logistics)
      007/
        index.md                  case details, initial request; examples also have overview and outcome
        history.md                dated events: channel, from, to, body
        attachments/              pdf, png, csv, txt (not every case has them)
  challenges/                   Reality Test cases, released at 16:30. Same layout:
    Property Management/
      001/index.md …
```

- `data/public` holds the 200 public example cases (50 per track) for development and practice. The organisers say **not** to submit results for these. Fetch them with `git submodule update --init`.
- `data/challenges` is where the unseen Reality Test cases go (the organisers call the folder `HackatonChallendges/`). Copy the released track folder in so that `data/challenges/Property Management/001/index.md` exists. `--in` can also point straight at a track folder or at wherever the cases were released.

Each pack's loader (`packages/tracks/src/shared/cases.ts`) turns a case folder into a `Case`. The case file becomes a `ticket` source, each history event becomes a source (the channel is kept in `meta.channel`), and attachments become `doc` sources (PDF text is extracted; images are flagged and kept at `meta.path`). Refs are `<prefix>-<nnn>` (for example `PM-007`) because numbers repeat across tracks.

## Practice runs on the examples

Example cases record how they ended. Pass `withhold: 'outcomes'` (CLI `--withhold outcomes`, web default) to hide the Overview, Outcome, "Next action at escalation" and "Boundaries" sections, as well as the status and completion dates. Where a case records the action taken at escalation, the history is cut just before it, so the agent sees only what was known at that point.

```bash
pnpm reality --in data/public --out .casework/practice --withhold outcomes
```

Reality Test runs load cases exactly as supplied (`--withhold none`, the default).
