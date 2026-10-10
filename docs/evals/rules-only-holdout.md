# Eval · Property management · rules-only playbook

2026-10-10T10:51:10.682Z · cuts from `packages/tracks/src/property/eval/holdout.json`

| Cuts | n | Accepted action | Near miss (right recipient) | Prohibited action |
|---|---|---|---|---|
| All | 70 | 67.1% | 7.1% | 2.9% |
| Determined | 15 | 60.0% | 0.0% | 0.0% |
| Judgement | 55 | 69.1% | 9.1% | 3.6% |

## By expected action (a cut counts once for each action it accepts)

| Expected | n | Agent chose an accepted action |
|---|---|---|
| `case.wait` | 32 | 78.1% |
| `tenant.update` | 24 | 54.2% |
| `landlord.update` | 19 | 84.2% |
| `contractor.chase` | 17 | 82.4% |
| `contractor.update` | 16 | 50.0% |
| `case.close` | 12 | 100.0% |
| `tenant.ask` | 9 | 66.7% |
| `landlord.chase` | 7 | 42.9% |
| `contractor.assign` | 4 | 25.0% |
| `contractor.instruct` | 3 | 66.7% |
| `landlord.send_quote` | 2 | 50.0% |
| `landlord.request_approval` | 2 | 100.0% |
| `tenant.chase` | 1 | 100.0% |
| `case.escalate` | 1 | 0.0% |

## Misses

| Cut | Stage (rules) | Chose | Accepted |
|---|---|---|---|
| 001@13 | Landlord is arranging the work themselves; agency monitors | `case.wait` | `landlord.chase` |
| 001@27 | Landlord is arranging the work themselves; agency monitors | `case.wait` | `landlord.update` `tenant.update` |
| 002@23 | Work reported done; landlord not yet told | `landlord.update` | `contractor.instruct` `tenant.update` |
| 005@21 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `contractor.update` `case.wait` |
| 005@30 | Work reported done; landlord not yet told | `landlord.update` | `contractor.chase` |
| 008@28 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `landlord.chase` |
| 012@9 | Landlord approved; contractor not yet assigned | `contractor.assign` | `case.wait` |
| 019@19 | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.chase` `landlord.send_quote` `case.escalate` |
| 019@29 | Landlord approved; contractor not yet assigned | `contractor.assign` | `contractor.chase` `tenant.ask` `contractor.update` |
| 020@13 | Waiting for the tenant to complete the agency task | `tenant.chase` | `tenant.update` `case.wait` |
| 021@11 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.assign` `tenant.update` |
| 022@7 | Visit booked; waiting for the contractor to attend and report | `case.wait` | `contractor.update` `tenant.update` |
| 026@13 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.assign` `tenant.update` |
| 026@26 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `case.wait` `contractor.update` |
| 030@7 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.assign` `tenant.update` |
| 030@25 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `contractor.update` `tenant.update` |
| 031@12 | Visit booked; waiting for the contractor to attend and report | `case.wait` | `contractor.update` `tenant.update` |
| 033@37 | Work reported done; landlord not yet told | `landlord.update` | `case.wait` `contractor.chase` |
| 039@19 | Visit booked; waiting for the contractor to attend and report | `case.wait` | `contractor.update` `tenant.update` `tenant.ask` |
| 040@13 | Closed in the system | `case.wait` | `landlord.update` |
| 045@21 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `tenant.update` `landlord.update` `case.wait` |
| 045@23 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.chase` `tenant.ask` `case.wait` |
| 046@25 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.update` |
