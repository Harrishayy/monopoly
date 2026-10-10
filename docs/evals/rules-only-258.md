# Eval · Property management · rules-only playbook

2026-10-10T10:37:39.711Z · cuts from `packages/tracks/src/property/eval/cuts.json`

| Cuts | n | Accepted action | Near miss (right recipient) | Prohibited action |
|---|---|---|---|---|
| All | 258 | 65.5% | 2.7% | 4.7% |
| Determined | 108 | 65.7% | 1.9% | 4.6% |
| Judgement | 150 | 65.3% | 3.3% | 4.7% |

## By expected action (a cut counts once for each action it accepts)

| Expected | n | Agent chose an accepted action |
|---|---|---|
| `tenant.ask` | 73 | 71.2% |
| `landlord.update` | 65 | 52.3% |
| `case.wait` | 59 | 71.2% |
| `contractor.chase` | 57 | 87.7% |
| `tenant.update` | 43 | 55.8% |
| `landlord.request_approval` | 42 | 100.0% |
| `case.close` | 35 | 48.6% |
| `contractor.assign` | 26 | 88.5% |
| `landlord.chase` | 19 | 68.4% |
| `landlord.send_quote` | 12 | 41.7% |
| `contractor.instruct` | 12 | 25.0% |
| `contractor.update` | 12 | 50.0% |
| `tenant.chase` | 10 | 40.0% |
| `case.escalate` | 5 | 20.0% |

## Misses

| Cut | Stage (rules) | Chose | Accepted |
|---|---|---|---|
| 001@9 | Landlord is arranging the work themselves; agency monitors | `case.wait` | `landlord.chase` |
| 001@23 | Landlord is arranging the work themselves; agency monitors | `case.wait` | `tenant.update` `landlord.update` |
| 001@43 | Contractor assigned; waiting for a booking or report | `case.wait` | `case.close` `landlord.update` `tenant.update` |
| 002@44 | Closed in the system | `case.wait` | `case.close` `case.escalate` |
| 003@8 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.send_quote` `contractor.chase` |
| 003@18 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.update` |
| 004@5 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.assign` |
| 004@10 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.send_quote` |
| 004@13 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.instruct` `contractor.update` `landlord.update` |
| 005@11 ⚠ | Quote received; not yet sent to the landlord | `landlord.send_quote` | `contractor.chase` |
| 006@13 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `landlord.send_quote` |
| 006@16 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `contractor.instruct` |
| 006@21 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `case.close` `landlord.update` |
| 007@16 | Work reported done; landlord not yet told | `landlord.update` | `contractor.instruct` |
| 007@19 ⚠ | Work reported done; landlord not yet told | `landlord.update` | `contractor.chase` `case.wait` |
| 007@24 | Work reported done; landlord not yet told | `landlord.update` | `contractor.update` |
| 007@28 | Work reported done; landlord not yet told | `landlord.update` | `case.wait` `contractor.update` |
| 008@10 | Contractor assigned; waiting for a booking or report | `landlord.update` | `contractor.assign` |
| 008@21 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `landlord.chase` `case.wait` |
| 008@24 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `landlord.update` `landlord.send_quote` |
| 008@39 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `contractor.instruct` |
| 009@14 | Tenant has responded to the agency task | `landlord.update` | `case.wait` |
| 009@16 | Tenant has responded to the agency task | `landlord.update` | `tenant.chase` |
| 009@23 | Waiting for the tenant to complete the agency task | `case.wait` | `case.close` `landlord.update` |
| 010@2 ⚠ | Agency task for the tenant; tenant not yet asked | `tenant.ask` | `case.wait` |
| 010@14 | Tenant has responded to the agency task | `landlord.update` | `case.close` `case.wait` |
| 011@20 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.send_quote` |
| 011@23 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.instruct` |
| 013@28 ⚠ | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `landlord.update` `tenant.ask` |
| 013@34 | Work reported done; landlord not yet told | `landlord.update` | `case.close` |
| 014@11 | Waiting for the landlord to approve or decide | `case.wait` | `tenant.ask` `tenant.update` |
| 014@13 | Waiting for the landlord to approve or decide | `case.wait` | `landlord.update` `case.close` |
| 015@18 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `case.close` |
| 016@23 | Work done and landlord informed; ready for final checks and close | `case.close` | `landlord.update` `contractor.update` `tenant.ask` |
| 017@9 | Waiting for the landlord to approve or decide | `case.wait` | `tenant.ask` |
| 017@12 | Waiting for the landlord to approve or decide | `case.wait` | `case.close` `landlord.update` `tenant.update` |
| 019@22 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.chase` |
| 019@26 | Landlord approved; contractor not yet assigned | `contractor.assign` | `contractor.instruct` `tenant.update` |
| 019@33 | Landlord approved; contractor not yet assigned | `contractor.assign` | `contractor.chase` `case.wait` |
| 020@7 | Tenant has responded to the agency task | `landlord.update` | `tenant.update` `tenant.ask` |
| 020@17 | Waiting for the tenant to complete the agency task | `case.wait` | `landlord.update` `case.escalate` |
| 020@20 ⚠ | Waiting for the tenant to complete the agency task | `tenant.chase` | `case.close` `case.wait` |
| 021@7 | Waiting for the landlord to approve or decide | `case.wait` | `contractor.assign` `landlord.update` |
| 021@16 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.update` |
| 022@14 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `case.wait` `landlord.update` `tenant.ask` |
| 022@19 | Work reported done; landlord not yet told | `landlord.update` | `case.wait` `contractor.chase` |
| 023@14 | Contractor assigned; waiting for a booking or report | `case.wait` | `tenant.update` `tenant.chase` `tenant.ask` |
| 023@17 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.chase` `tenant.chase` |
| 023@21 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.update` `tenant.ask` |
| 025@25 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.update` |
| 025@43 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `landlord.update` `tenant.update` `case.wait` |
| 026@30 ⚠ | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `case.close` `landlord.update` |
| 027@2 | New request; landlord not yet asked | `landlord.request_approval` | `tenant.ask` |
| 027@4 | New request; landlord not yet asked | `landlord.request_approval` | `tenant.chase` |
| 027@8 | New request; landlord not yet asked | `landlord.request_approval` | `case.close` `tenant.update` |
| 027@12 | Work reported done; landlord not yet told | `landlord.update` | `tenant.update` `case.escalate` |
| 027@16 | Work reported done; landlord not yet told | `landlord.update` | `case.close` |
| 028@10 | Landlord is arranging the work themselves; agency monitors | `case.wait` | `landlord.chase` `tenant.ask` |
| 030@21 | Contractor assigned; waiting for a booking or report | `contractor.chase` | `tenant.ask` |
| 030@40 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `case.close` `landlord.update` |
| 033@28 | Work reported done; landlord not yet told | `landlord.update` | `contractor.instruct` `tenant.update` |
| 035@13 | Work reported done; landlord not yet told | `landlord.update` | `case.close` `tenant.ask` |
| 036@27 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `case.wait` `tenant.update` `landlord.update` |
| 036@41 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `landlord.update` |
| 036@44 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `landlord.update` `case.escalate` |
| 036@51 | Work done and landlord informed; ready for final checks and close | `case.close` | `landlord.update` `tenant.ask` `contractor.chase` |
| 038@10 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `tenant.update` |
| 038@13 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `case.close` `landlord.update` |
| 039@9 | New request; landlord not yet asked | `landlord.request_approval` | `landlord.chase` |
| 040@10 | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.update` `tenant.update` `tenant.ask` |
| 040@11 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.update` |
| 041@12 | Waiting for the landlord to approve or decide | `case.wait` | `tenant.update` |
| 041@22 | Work reported done; landlord not yet told | `landlord.update` | `case.wait` `tenant.update` |
| 041@24 | Work reported done; landlord not yet told | `landlord.update` | `case.close` `tenant.ask` `tenant.update` |
| 042@27 | Work reported done; landlord not yet told | `landlord.update` | `case.close` `tenant.ask` |
| 044@20 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.update` `tenant.ask` |
| 045@3 | New request; landlord not yet asked | `landlord.request_approval` | `tenant.ask` |
| 045@18 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.update` `case.wait` `tenant.update` |
| 045@32 ⚠ | Landlord approved; contractor not yet assigned | `contractor.assign` | `landlord.chase` `tenant.ask` |
| 046@16 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.send_quote` |
| 046@20 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.instruct` |
| 046@35 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `case.wait` `tenant.update` |
| 046@42 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `landlord.update` `tenant.ask` |
| 047@11 | Waiting for the landlord to approve or decide | `case.wait` | `landlord.update` |
| 049@11 | Landlord has left it to the tenant to fix | `tenant.update` | `tenant.chase` `case.wait` |
| 049@13 | Landlord has left it to the tenant to fix | `tenant.update` | `case.wait` `tenant.chase` |
| 050@19 | Contractor assigned; waiting for a booking or report | `case.wait` | `landlord.send_quote` |
| 050@23 | Contractor assigned; waiting for a booking or report | `case.wait` | `contractor.instruct` `contractor.update` |
| 050@36 | Visit booked; waiting for the contractor to attend and report | `contractor.chase` | `landlord.update` `tenant.ask` |
