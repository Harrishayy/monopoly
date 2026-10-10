# 06 · Tokens

Components use semantic tokens only. Each direction is one CSS file (`apps/web/src/tokens/<direction>.css`) that sets these variables under `[data-dir]`. Tailwind exposes them as `bg-surface`, `text-ink-2`, `border-line`, `rounded-ui`, `font-display`, and so on (see `app/globals.css`).

| Token | Role | Rule |
|---|---|---|
| `--bg` | Page ground | Body background only |
| `--surface` / `--surface-2` | Cards / wells and hovers | Don't nest a surface in a surface without a rule between them |
| `--ink` / `--ink-2` | Text / secondary text | Never use ink-2 for anything a person must act on |
| `--line` / `--line-strong` | Rules / input borders | Inputs and selected items use line-strong |
| `--accent` / `--accent-ink` | Primary action, focus, active state | At most one accent-filled element per pane |
| `--accent-soft` | Selected rows, citations | Background only |
| `--ok` `--hold` `--info` `--bad` `--neutral` | Resolved, escalated, needs info, failed, blocked | Always paired with a text label. Status classes `s-<status>` set `--c` |
| `--font-d` `--font-b` `--font-m` | Display, body, data | Machine output (refs, tool calls, money in tables) uses `--font-m` |
| `--r` `--r-lg` `--bw` `--shadow` | Shape of the direction | Docket 3/4/1/none · Switchboard 6/10/1/soft · Relay 12/20/2/offset |
| `--ease` `--out` `--spring` | Motion curves | `--spring` only on the stamp and Relay pops |
| `--m-*` | Mascot colours | Set per direction |

## Shared scales (`tokens/base.css`)

| Scale | Values |
|---|---|
| Space (4px base) | 2 4 6 8 12 16 20 24 32 40 56 64 |
| Type (px) | 11 12.5 13.5 15 17 20 26 30, display 40–84 |
| Line height | 1.1 headings · 1.5 body · 1.65 code |
| Durations | 120 fast · 200 base · 350 slow · 420 stamp |
| Z-index | 10 sticky · 40 nav · 50 toast · 60 dialog · 70 palette |
| Breakpoints | 560 · 860 · 1120 |
| Hit target | ≥ 36px desktop · ≥ 44px touch |
| Focus ring | 2px accent, 2px offset |
