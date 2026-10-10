---
name: add-track-pack
description: Copies a pack, wires the loader to data/<track>, registers it, and generates a test that parses every supplied case. Example: “/add-track-pack logistics”
---

# add-track-pack

Copies a pack, wires the loader to data/<track>, registers it, and generates a test that parses every supplied case.

## Steps

1. Copy `packages/tracks/src/property/` to `packages/tracks/src/<track>/` and update ids.
2. Add the track to `TRACK_META` in `packages/tracks/src/meta.ts` and `PACKS` in `packages/tracks/src/index.ts`. Add the id to `TrackId` in `packages/core/src/schema/common.ts` if it is new.
3. Write `loadCases` for the real data format in `data/<track>/` (use the pdf or xlsx skills for documents and sheets). Every source needs a stable id.
4. Write policy rules for anything that moves money or changes state, and list must-escalate conditions.
5. Add a test that loads every supplied case and parses it with the `Case` schema.
6. Run `pnpm typecheck && pnpm test`.

Follow CLAUDE.md rules throughout.
