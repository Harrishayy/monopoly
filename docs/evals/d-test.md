# Bench · property · split test

2026-10-10T13:14:00.006Z · 66 cuts per agent

| Agent · cuts | n | Accepted action | Near miss (right party) | Prohibited action | No real decision |
|---|---|---|---|---|---|
| **d** all | 66 | **87.9%** | 1.5% | 0.0% | 0 |
| d determined | 27 | **88.9%** | 0.0% | 0.0% | 0 |
| d judgement | 39 | **87.2%** | 2.6% | 0.0% | 0 |

## Cost

| Agent | Cuts with usage | Input tokens | Output tokens | Total cost | Per cut |
|---|---|---|---|---|---|
| d | 66 | 28,733 | 460,473 | $1.36 | $0.0206 |

## By expected action

| Expected | n | d accepted |
|---|---|---|
| `contractor.chase` | 16 | 81.3% |
| `landlord.update` | 16 | 93.8% |
| `case.wait` | 15 | 93.3% |
| `tenant.ask` | 14 | 71.4% |
| `tenant.update` | 12 | 91.7% |
| `case.close` | 8 | 87.5% |
| `landlord.request_approval` | 8 | 100.0% |
| `contractor.update` | 7 | 85.7% |
| `landlord.chase` | 7 | 100.0% |
| `contractor.assign` | 5 | 100.0% |
| `contractor.instruct` | 4 | 75.0% |
| `tenant.chase` | 4 | 50.0% |
| `landlord.send_quote` | 3 | 100.0% |
| `case.escalate` | 2 | 100.0% |

## Misses

| Agent | Cut | Chose | Accepted |
|---|---|---|---|
| d | 007@16 | `landlord.update` | `contractor.instruct` |
| d | 019@29 | `contractor.instruct` | `contractor.chase` `tenant.ask` `contractor.update` |
| d | 019@33 | `landlord.update` | `contractor.chase` `case.wait` |
| d | 023@14 | `case.wait` | `tenant.update` `tenant.chase` `tenant.ask` |
| d | 023@17 | `case.wait` | `contractor.chase` `tenant.chase` |
| d | 030@21 | `contractor.update` | `tenant.ask` |
| d | 042@27 | `landlord.update` | `case.close` `tenant.ask` |
| d | 047@11 | `case.wait` | `landlord.update` |
