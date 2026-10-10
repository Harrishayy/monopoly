# Bench · property · split test

2026-10-10T12:06:55.890Z · 66 cuts per agent

| Agent · cuts | n | Accepted action | Near miss (right party) | Prohibited action | No real decision |
|---|---|---|---|---|---|
| **a** all | 66 | **86.4%** | 0.0% | 0.0% | 0 |
| a determined | 27 | **88.9%** | 0.0% | 0.0% | 0 |
| a judgement | 39 | **84.6%** | 0.0% | 0.0% | 0 |

## By expected action

| Expected | n | a accepted |
|---|---|---|
| `contractor.chase` | 16 | 87.5% |
| `landlord.update` | 16 | 87.5% |
| `case.wait` | 15 | 93.3% |
| `tenant.ask` | 14 | 78.6% |
| `tenant.update` | 12 | 91.7% |
| `case.close` | 8 | 62.5% |
| `landlord.request_approval` | 8 | 100.0% |
| `contractor.update` | 7 | 85.7% |
| `landlord.chase` | 7 | 85.7% |
| `contractor.assign` | 5 | 100.0% |
| `contractor.instruct` | 4 | 75.0% |
| `tenant.chase` | 4 | 75.0% |
| `landlord.send_quote` | 3 | 66.7% |
| `case.escalate` | 2 | 50.0% |

## Misses

| Agent | Cut | Chose | Accepted |
|---|---|---|---|
| a | 006@16 | `case.escalate` | `contractor.instruct` |
| a | 006@21 | `contractor.chase` | `case.close` `landlord.update` |
| a | 007@35 | `case.escalate` | `case.close` |
| a | 019@19 | `contractor.assign` | `landlord.chase` `landlord.send_quote` `case.escalate` |
| a | 019@29 | `case.escalate` | `contractor.chase` `tenant.ask` `contractor.update` |
| a | 019@33 | `case.escalate` | `contractor.chase` `case.wait` |
| a | 023@14 | `case.wait` | `tenant.update` `tenant.chase` `tenant.ask` |
| a | 040@13 | `case.escalate` | `landlord.update` |
| a | 042@27 | `landlord.update` | `case.close` `tenant.ask` |
