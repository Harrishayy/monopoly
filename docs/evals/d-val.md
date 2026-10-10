# Bench · property · split val

2026-10-10T13:37:25.772Z · 71 cuts per agent

| Agent · cuts | n | Accepted action | Near miss (right party) | Prohibited action | No real decision |
|---|---|---|---|---|---|
| **d** all | 71 | **83.1%** | 5.6% | 1.4% | 0 |
| d determined | 34 | **82.4%** | 2.9% | 2.9% | 0 |
| d judgement | 37 | **83.8%** | 8.1% | 0.0% | 0 |

## Cost

| Agent | Cuts with usage | Input tokens | Output tokens | Total cost | Per cut |
|---|---|---|---|---|---|
| d | 71 | 58,866 | 813,652 | $3.03 | $0.0426 |

## By expected action

| Expected | n | d accepted |
|---|---|---|
| `landlord.update` | 20 | 100.0% |
| `case.wait` | 18 | 72.2% |
| `contractor.chase` | 17 | 70.6% |
| `tenant.ask` | 12 | 91.7% |
| `case.close` | 11 | 81.8% |
| `landlord.request_approval` | 8 | 100.0% |
| `contractor.assign` | 7 | 100.0% |
| `tenant.update` | 6 | 83.3% |
| `landlord.send_quote` | 5 | 80.0% |
| `contractor.instruct` | 5 | 100.0% |
| `contractor.update` | 5 | 80.0% |
| `tenant.chase` | 5 | 80.0% |
| `landlord.chase` | 3 | 100.0% |
| `case.escalate` | 1 | 0.0% |

## Misses

| Agent | Cut | Chose | Accepted |
|---|---|---|---|
| d | 002@44 | `landlord.update` | `case.close` `case.escalate` |
| d | 005@11 ⚠ | `landlord.send_quote` | `contractor.chase` |
| d | 005@30 | `landlord.update` | `contractor.chase` |
| d | 009@16 | `tenant.ask` | `tenant.chase` |
| d | 012@9 | `contractor.assign` | `case.wait` |
| d | 015@18 | `contractor.chase` | `case.close` |
| d | 032@34 | `contractor.update` | `case.wait` `contractor.chase` |
| d | 043@8 | `tenant.update` | `case.wait` |
| d | 043@14 | `tenant.ask` | `contractor.chase` `case.wait` |
| d | 050@19 | `contractor.chase` | `landlord.send_quote` |
| d | 050@27 | `tenant.ask` | `tenant.update` `contractor.update` `case.wait` |
| d | 050@33 | `contractor.update` | `contractor.chase` `tenant.ask` |
