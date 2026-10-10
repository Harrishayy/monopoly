# Eval · Property management · model claude-haiku-5-5

2026-10-10T10:52:57.882Z · cuts from `packages/tracks/src/property/eval/holdout.json`

| Cuts | n | Accepted action | Near miss (right recipient) | Prohibited action |
|---|---|---|---|---|
| All | 70 | 74.3% | 4.3% | 0.0% |
| Determined | 15 | 66.7% | 0.0% | 0.0% |
| Judgement | 55 | 76.4% | 5.5% | 0.0% |

## By expected action (a cut counts once for each action it accepts)

| Expected | n | Agent chose an accepted action |
|---|---|---|
| `case.wait` | 32 | 78.1% |
| `tenant.update` | 24 | 75.0% |
| `landlord.update` | 19 | 84.2% |
| `contractor.chase` | 17 | 76.5% |
| `contractor.update` | 16 | 56.3% |
| `case.close` | 12 | 83.3% |
| `tenant.ask` | 9 | 66.7% |
| `landlord.chase` | 7 | 71.4% |
| `contractor.assign` | 4 | 75.0% |
| `contractor.instruct` | 3 | 100.0% |
| `landlord.send_quote` | 2 | 50.0% |
| `landlord.request_approval` | 2 | 100.0% |
| `tenant.chase` | 1 | 100.0% |
| `case.escalate` | 1 | 0.0% |

## Misses

| Cut | Stage (rules) | Chose | Accepted |
|---|---|---|---|
| 001@13 | Landlord is arranging the work themselves; agency monitors | `tenant.update` | `landlord.chase` |
| 003@22 | Work done and landlord informed; ready for final checks and close | `landlord.send_quote` | `case.close` `case.wait` |
| 005@30 | Work reported done; landlord not yet told | `landlord.update` | `contractor.chase` |
| 007@35 | Work done and landlord informed; ready for final checks and close | `case.escalate` | `case.close` |
| 012@9 | Landlord approved; contractor not yet assigned | `contractor.assign` | `case.wait` |
| 019@19 | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.chase` `landlord.send_quote` `case.escalate` |
| 019@29 | Landlord approved; contractor not yet assigned | `contractor.assign` | `contractor.chase` `tenant.ask` `contractor.update` |
| 021@11 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.assign` `tenant.update` |
| 022@7 | Visit booked; waiting for the contractor to attend and report | `case.wait` | `contractor.update` `tenant.update` |
| 025@14 | Contractor assigned; waiting for a booking or report | `contractor.update` | `landlord.update` `case.wait` |
| 026@26 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `case.wait` `contractor.update` |
| 031@12 | Visit booked; waiting for the contractor to attend and report | `case.wait` | `contractor.update` `tenant.update` |
| 033@37 | Work reported done; landlord not yet told | `tenant.ask` | `case.wait` `contractor.chase` |
| 037@19 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `contractor.update` `tenant.update` `case.wait` |
| 039@19 | Visit booked; waiting for the contractor to attend and report | `case.wait` | `contractor.update` `tenant.update` `tenant.ask` |
| 045@21 | Landlord approved; contractor not yet assigned | `contractor.update` | `tenant.update` `landlord.update` `case.wait` |
| 046@25 | Contractor assigned; waiting for a booking or report | `tenant.ask` | `contractor.update` |
| 048@25 | Work reported done; landlord not yet told | `case.escalate` | `landlord.update` `contractor.chase` `tenant.ask` |
