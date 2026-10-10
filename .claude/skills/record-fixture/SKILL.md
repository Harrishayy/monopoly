---
name: record-fixture
description: Runs one case against the real API and saves the event stream to tracks/<track>/fixtures for msw and tests. Example: “/record-fixture PM-7731”
---

# record-fixture

Runs one case against the real API and saves the event stream to tracks/<track>/fixtures for msw and tests.

## Steps

1. Start the app with `pnpm dev` and the real data in `data/<track>/`.
2. POST `/api/runs` with the case ref, then save every event from `/api/runs/<id>/events` as one JSON object per line.
3. Write it to `packages/tracks/src/<track>/fixtures/<ref>.jsonl`.
4. Validate each line with `RunEvent.parse` and check `runView` reduces it without errors.

Follow CLAUDE.md rules throughout.
