# Submission

Real-World Agents Hackathon, 10 October 2026.

| Field | Value |
|---|---|
| Project | Casework |
| Team name | TODO (team to fill in) |
| Track | Property Management |
| Team members | TODO (team to fill in: full names, one per line) |
| Repository | https://github.com/Harrishayy/monopoly |
| Code freeze commit (16:30) | TODO (team to fill in) |
| Reality Test results | [`ANSWERS/`](ANSWERS/) |
| Demo video | [`demo/demo.mp4`](demo/demo.mp4) |
| Competing for Best Voice Agent | Yes: the ElevenLabs voice line opens and updates real cases in the console |
| LinkedIn post | TODO (team to fill in) |
| X post | TODO (team to fill in) |

## How the results were produced

`ANSWERS/` was written by the submitted system, unattended, with one command:

```bash
pnpm reality --track property --in data/challenges --out ANSWERS
```

Each case folder holds `ANSWER.md`, `REASONING.md` and the full `trace.jsonl`; `ANSWERS/run.json` records
the agent, track and timings. Nothing in it is edited by hand. Details: [ANSWERS/README.md](ANSWERS/README.md).
