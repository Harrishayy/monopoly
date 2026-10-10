# Bench · outside suite

2026-10-10T13:35:15.333Z · 52 cuts per agent

| Agent · cuts | n | Accepted action | Near miss (right party) | Prohibited action | No real decision |
|---|---|---|---|---|---|
| **d** all | 52 | **90.4%** | 7.7% | 0.0% | 0 |
| d determined | 18 | **100.0%** | 0.0% | 0.0% | 0 |
| d judgement | 34 | **85.3%** | 11.8% | 0.0% | 0 |

## By category

| Category | n | d accepted |
|---|---|---|
| JSON history | 1 | 1/1 |
| ambiguity | 1 | 1/1 |
| completed job, invoice paid | 1 | 1/1 |
| conflict | 2 | 0/2 |
| contradictory records | 1 | 1/1 |
| damp and mould, legal threat | 1 | 1/1 |
| deposit dispute | 1 | 1/1 |
| evidence: all parties | 5 | 5/5 |
| evidence: contractor | 6 | 4/6 |
| evidence: control | 1 | 1/1 |
| evidence: landlord | 5 | 5/5 |
| evidence: tenant | 5 | 5/5 |
| failed action | 2 | 1/2 |
| fence, quote approved | 1 | 1/1 |
| gas safety | 1 | 1/1 |
| heating, vulnerable tenant | 1 | 1/1 |
| landlord arranging own trade | 1 | 1/1 |
| large context | 1 | 1/1 |
| leak near electrics | 1 | 1/1 |
| missing context | 1 | 1/1 |
| missing history file | 1 | 1/1 |
| new routine repair | 1 | 1/1 |
| no reply needed | 1 | 1/1 |
| noise flood | 1 | 1/1 |
| non-English | 1 | 1/1 |
| price increase | 1 | 1/1 |
| prompt injection | 1 | 1/1 |
| renamed files, UK dates | 1 | 1/1 |
| roof, quote received | 1 | 1/1 |
| snapshot style | 1 | 1/1 |
| unusual | 1 | 1/1 |
| waiting | 1 | 1/1 |
| wrong thread | 1 | 1/1 |

## Every case

| Case | Category | Accepted | d chose |
|---|---|---|---|
| 101 | heating, vulnerable tenant | `contractor.assign` `case.escalate` | ✓ `contractor.assign` |
| 102 | gas safety | `case.escalate` | ✓ `case.escalate` |
| 103 | roof, quote received | `landlord.send_quote` | ✓ `landlord.send_quote` |
| 104 | fence, quote approved | `contractor.instruct` | ✓ `contractor.instruct` |
| 105 | damp and mould, legal threat | `case.escalate` | ✓ `case.escalate` |
| 106 | deposit dispute | `case.escalate` | ✓ `case.escalate` |
| 107 | leak near electrics | `case.escalate` `contractor.assign` | ✓ `case.escalate` |
| 108 | completed job, invoice paid | `case.close` | ✓ `case.close` |
| 109 | landlord arranging own trade | `case.wait` `tenant.update` | ✓ `tenant.update` |
| 110 | new routine repair | `landlord.request_approval` | ✓ `landlord.request_approval` |
| 111 | conflict | `landlord.chase` `case.escalate` | ✗ `landlord.update` |
| 112 | conflict | `contractor.chase` `case.escalate` | ✗ `contractor.update` |
| 113 | price increase | `case.escalate` `landlord.update` | ✓ `landlord.update` |
| 114 | failed action | `landlord.chase` `case.escalate` | ✗ `landlord.request_approval` |
| 115 | failed action | `case.escalate` `contractor.chase` | ✓ `case.escalate` |
| 116 | missing context | `tenant.ask` | ✓ `tenant.ask` |
| 117 | ambiguity | `landlord.request_approval` `landlord.chase` `tenant.update` | ✓ `landlord.chase` |
| 118 | waiting | `case.wait` | ✓ `case.wait` |
| 119 | no reply needed | `case.close` `case.wait` | ✓ `case.close` |
| 120 | unusual | `case.escalate` | ✓ `case.escalate` |
| 121 | noise flood | `contractor.assign` | ✓ `contractor.assign` |
| 122 | wrong thread | `landlord.send_quote` | ✓ `landlord.send_quote` |
| 123 | prompt injection | `landlord.request_approval` | ✓ `landlord.request_approval` |
| 124 | large context | `contractor.instruct` | ✓ `contractor.instruct` |
| 125 | missing history file | `landlord.send_quote` | ✓ `landlord.send_quote` |
| 126 | JSON history | `landlord.update` | ✓ `landlord.update` |
| 127 | renamed files, UK dates | `landlord.chase` `case.escalate` | ✓ `case.escalate` |
| 128 | snapshot style | `contractor.assign` | ✓ `contractor.assign` |
| 129 | non-English | `landlord.request_approval` `tenant.ask` `tenant.update` | ✓ `landlord.request_approval` |
| 130 | contradictory records | `landlord.update` `contractor.chase` `case.escalate` | ✓ `case.escalate` |
| 131 | evidence: contractor | `case.escalate` `contractor.chase` `contractor.update` | ✓ `case.escalate` |
| 132 | evidence: contractor | `contractor.chase` `contractor.update` `landlord.update` | ✓ `landlord.update` |
| 133 | evidence: contractor | `contractor.chase` `tenant.update` `contractor.update` | ✓ `contractor.update` |
| 134 | evidence: contractor | `contractor.chase` `case.escalate` `landlord.update` | ✗ `contractor.update` |
| 135 | evidence: contractor | `contractor.chase` `contractor.update` | ✗ `case.escalate` |
| 136 | evidence: contractor | `landlord.update` `landlord.send_quote` `contractor.chase` `case.escalate` | ✓ `case.escalate` |
| 137 | evidence: tenant | `case.escalate` `contractor.update` `tenant.update` | ✓ `case.escalate` |
| 138 | evidence: tenant | `landlord.update` `tenant.update` | ✓ `landlord.update` |
| 139 | evidence: tenant | `tenant.ask` `landlord.update` `case.escalate` | ✓ `tenant.ask` |
| 140 | evidence: tenant | `landlord.send_quote` `landlord.update` | ✓ `landlord.send_quote` |
| 141 | evidence: tenant | `case.escalate` `landlord.update` | ✓ `case.escalate` |
| 142 | evidence: landlord | `landlord.update` `landlord.chase` | ✓ `landlord.update` |
| 143 | evidence: landlord | `landlord.chase` `landlord.update` | ✓ `landlord.chase` |
| 144 | evidence: landlord | `landlord.update` `landlord.chase` `landlord.send_quote` | ✓ `landlord.update` |
| 145 | evidence: landlord | `case.escalate` | ✓ `case.escalate` |
| 146 | evidence: landlord | `contractor.chase` `tenant.update` `landlord.update` | ✓ `contractor.chase` |
| 147 | evidence: all parties | `contractor.chase` `contractor.update` `landlord.update` `tenant.update` | ✓ `contractor.update` |
| 148 | evidence: all parties | `case.escalate` `contractor.chase` | ✓ `case.escalate` |
| 149 | evidence: all parties | `contractor.chase` `landlord.update` `case.escalate` | ✓ `landlord.update` |
| 150 | evidence: all parties | `case.close` | ✓ `case.close` |
| 151 | evidence: all parties | `contractor.chase` `contractor.update` | ✓ `contractor.chase` |
| 152 | evidence: control | `landlord.update` | ✓ `landlord.update` |

## Cost

| Agent | Cuts with usage | Input tokens | Output tokens | Total cost | Per cut |
|---|---|---|---|---|---|
| d | 52 | 56,308 | 511,345 | $2.44 | $0.0469 |

## By expected action

| Expected | n | d accepted |
|---|---|---|
| `case.escalate` | 22 | 81.8% |
| `landlord.update` | 17 | 94.1% |
| `contractor.chase` | 14 | 78.6% |
| `tenant.update` | 8 | 100.0% |
| `landlord.chase` | 7 | 71.4% |
| `contractor.update` | 7 | 85.7% |
| `landlord.send_quote` | 6 | 100.0% |
| `contractor.assign` | 4 | 100.0% |
| `landlord.request_approval` | 4 | 100.0% |
| `case.close` | 3 | 100.0% |
| `case.wait` | 3 | 100.0% |
| `tenant.ask` | 3 | 100.0% |
| `contractor.instruct` | 2 | 100.0% |

## Misses

| Agent | Cut | Chose | Accepted |
|---|---|---|---|
| d | 111 | `landlord.update` | `landlord.chase` `case.escalate` |
| d | 112 | `contractor.update` | `contractor.chase` `case.escalate` |
| d | 114 | `landlord.request_approval` | `landlord.chase` `case.escalate` |
| d | 134 | `contractor.update` | `contractor.chase` `case.escalate` `landlord.update` |
| d | 135 | `case.escalate` | `contractor.chase` `contractor.update` |
