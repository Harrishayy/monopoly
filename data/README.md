# Data

Put the synthetic operating environment for each track here, one folder per track:

```
data/claims/  data/property/  data/banking/  data/logistics/  data/reality/<track>/
```

The default loader (`packages/tracks/src/shared/loader.ts`) reads `*.json` files that already match the
`Case` schema. Once the real format is known, write a loader per track in `packages/tracks/src/<track>/`.

Before committing supplied data, check that the event allows it to be published under Apache 2.0.
