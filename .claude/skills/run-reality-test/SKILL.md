---
name: run-reality-test
description: Runs the CLI on a folder, checks every case produced ANSWER.md and REASONING.md, and prints failures. Never edits answers. Example: “/run-reality-test data/challenges”
---

# run-reality-test

Runs the CLI on a folder, checks every case produced ANSWER.md and REASONING.md, and prints failures. Never edits answers.

## Steps

1. Confirm `.env` has `ANTHROPIC_API_KEY` and the right `TRACK`.
2. Run `pnpm reality --track <track> --in <folder> --out ANSWERS`.
3. Check every case folder has ANSWER.md, REASONING.md and trace.jsonl. List any case whose ANSWER.md contains "Runner error".
4. Report counts by outcome. Never edit files in ANSWERS/ by hand; if something is wrong, fix the system and re-run.

Follow CLAUDE.md rules throughout.
