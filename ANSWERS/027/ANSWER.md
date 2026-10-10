# Case 027: Move-out maintenance at 46 Fernwick Lane

**Next action:** Ask Alderwick Property Works for an itemised price, VAT basis and exclusions for quote NBL-027-Q1, and confirm that nothing is approved yet

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Chase (`chase`) | Iris Bell, Alderwick Property Works | Email | 55% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 17 events (E001–E017), decision moment 2025-09-15 16:25.
- Attachments: A1 attachments/checkout-report.pdf (pdf), A2 attachments/move-out-works-quotation.pdf (pdf).

## Actions taken

1. **Ask Alderwick Property Works for an itemised price, VAT basis and exclusions for quote NBL-027-Q1, and confirm that nothing is approved yet** (`contractor.chase`) → Iris Bell, Alderwick Property Works via Email:

> Dear Iris,
> 
> Re: 46 Fernwick Lane, Aldermead – quotation NBL-027-Q1 (15 September 2025), £3,865.68
> 
> Thank you for the quotation. I have sent it to the landlord. Before he can decide, I need a few more details:
> 
> 1. A price for each task listed (newel post, door frame, uPVC window frame holes, wall damage, threshold, toilet-roll holder, smoke detector, rehanging the kitchen radiator, each of the two extractor fans, en-suite radiator, ceiling stain-blocking, decoration), rather than one "Labour & Materials" figure.
> 2. The VAT basis. Does £3,865.68 include VAT, is VAT to be added, or are you not VAT-registered?
> 3. Please confirm that the two "renew an extractor fan" lines are two separate fans.
> 4. What the quote excludes. The check-out report also lists replacement carpets (quote requested), kitchen flooring damage, chipped living-room laminate, the bedroom curtain pole, curtains and bulbs, the warped kitchen worktop, the boiler casing, and rusting radiators other than the en-suite. Please say whether any of these are included. If you can price any of them, please list them separately.
> 5. Please confirm which check-out report you priced from (reference NBL-027-CHECKOUT, the current report) and whether you need to inspect before work starts. If you do, keys can be collected from our office.
> 
> Please note that the landlord has not approved this quote or any works yet, even though our original job email suggested otherwise. Please do not book or start any work until we confirm his approval in writing.
> 
> Could you reply by Wednesday 17 September? If anything is unclear, please call me.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

2. Same turn (`landlord.update`) → Owen Vale (Landlord) via Email:

> Dear Owen,
> 
> Re: 46 Fernwick Lane – move-out works quotation, £3,865.68
> 
> I tried to call you this afternoon but couldn't get through. Following my earlier email, I have asked the contractor to break the £3,865.68 down by task, to confirm whether VAT is included or added, and to list anything that is excluded. I will send you this by Wednesday 17 September.
> 
> Please be aware that the quote does not cover these items from the check-out report:
> - replacement carpets (a quote was requested)
> - kitchen flooring damage and the chipped living-room laminate
> - bedroom curtain pole, curtains and bulbs
> - the warped kitchen worktop with reported water ingress
> - rusting radiators other than the en-suite
> - the boiler casing, which appears to be held with tape and was noted as needing inspection
> 
> Could you let me know which of these you would like us to add or get priced, and which you would rather leave or arrange yourself? Please let me know whether you would like a qualified engineer to inspect the boiler. That decision is yours. The quote does include renewing the non-working top-floor smoke detector.
> 
> No works have been approved or booked. Nothing will go ahead until you confirm in writing, against a firm figure.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.wait until the landlord replies: The landlord would be deciding on a lump sum with no VAT basis and with scope gaps. Also, the contractor's belief that the works are agreed would go uncorrected.
- landlord.chase: The ask went out only hours ago. A chase is not due until about 18 Sep.
- case.escalate over the boiler casing or the size of the spend: The property is vacant, so no occupant is exposed. The landlord can decide on an inspection himself. Above-threshold spend is already going to the landlord for approval, which is the normal route.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

By 17 Sep the contractor sends an itemised quote with the VAT basis and exclusions, and confirms she will not book until approval is given. The landlord knows about the scope gaps and can decide which items to add before approving.

**Follow up by:** 2025-09-17

### Why

The quote went to the landlord at 13:53 today (E014). The call at 16:25 did not reach him (E017). It is too soon to chase him, since a chase is usually about 3 days after the ask. The quote itself is not enough for a firm approval. It is one lump sum with no task prices, VAT basis or exclusions (E013, A2). It also leaves out several items from the check-out report (A1). The rules say to settle price and scope before the visit and to always state the VAT basis. These are new questions for the contractor, not a repeat of an earlier ask, so they can go now. The contractor was also told the works had been agreed with the landlord (E004), but the system records that approval is still needed (E015). That has to be corrected before she books anything. Who controls scope is a landlord matter, so the landlord gets a scope note in alsoSend with a date for the itemised figures.

### Boundaries (what this does not prove or settle)

- Asking for itemisation does not approve the quote or any works.
- The landlord has not approved £3,865.68 or any scope.
- This does not decide who pays for any item. Any recharge to the outgoing tenant needs check-in evidence.
- No safety assessment of the boiler casing or the ceiling water damage is made or implied.
- No attendance date is promised.

### Remaining work

- Send the itemised quote and VAT basis to the landlord once received.
- Chase the landlord on Thu 18 Sep by phone and email if there is no decision.
- Get prices for any omitted items the landlord wants added.
- Instruct the contractor only against a firm approved figure.
- Before any recharge, check the check-in inventory to see who bears the cost of the defects.

### Assumptions

- 15 September 2025 is a Monday, so 17 September is a working day.
- The contractor priced from the current check-out report, A1. This is unconfirmed, so the email asks.
- The property is still vacant and the keys are at the office (E003).

### Evidence

- **E001** · 2025-09-03 18:03 · Maya Chen (Property Manager, Northbridge Lettings) → Northbridge Lettings workflow (System): “Move-out list records damage to the staircase newel posts and a bedroom door frame; screw damage to an upstairs uPVC window frame; wall holes, plugs, nail holes and sticker residue; kitchen flooring d…”
- **E004** · 2025-09-04 17:20 · Northbridge Lettings workflow (System) → Maya Chen (Property Manager, Northbridge Lettings): “A handyman provider was selected and asked to quote remotely. The job email said the move-out works had been agreed with the landlord, and requested the provider's price, proposed work and earliest av…”
- **E005** · 2025-09-04 17:21 · Maya Chen (Property Manager, Northbridge Lettings) → Owen Vale (Landlord): “Advised that a provider had been asked to quote for the move-out works. No specific price or contractor scope was included in this update.”
- **E013** · 2025-09-15 13:52 · Iris Bell (Contractor, Alderwick Property Works) → Maya Chen (Property Manager, Northbridge Lettings): “Sent a quotation for the property and invited questions. The listed tasks are: repair damaged newel post; address screw damage to a door frame; fill holes in uPVC window frames; make good wall damage;…”
- **E014** · 2025-09-15 13:53 · Maya Chen (Property Manager, Northbridge Lettings) → Owen Vale (Landlord): “Forwarded the quote with a stated total of £3,865.68 and asked whether the landlord was happy to proceed at that cost.”
- **E015** · 2025-09-15 13:54 · Maya Chen (Property Manager, Northbridge Lettings) → Northbridge Lettings workflow (System): “Quote received; the stated total is £3,865.68 and is above the approval threshold. The workflow records that landlord approval is required before proceeding.”
- **E016** · 2025-09-15 16:23 · Maya Chen (Property Manager, Northbridge Lettings) → Northbridge Lettings workflow (System): “Waiting for the landlord to respond to the request to approve or reject the specific quotation.”
- **E017** · 2025-09-15 16:25 · Maya Chen (Property Manager, Northbridge Lettings) → Owen Vale (Landlord): “Call transcript contains an automated recording notice and a brief unclear utterance. No substantive discussion, approval or rejection was captured.”
- **A1** · attachment attachments/checkout-report.pdf
- **A2** · attachment attachments/move-out-works-quotation.pdf
- **E009** · 2025-09-08 11:58 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Bell (Contractor, Alderwick Property Works): “Asked whether the corrected report gave enough information to quote or whether an inspection was needed. Requested the quote and earliest availability while re-letting preparations were underway.”
- **E011** · 2025-09-11 11:33 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Bell (Contractor, Alderwick Property Works): “Chased for the quotation and asked whether an inspection was required. Repeated that keys could be collected from the office.”
- **E012** · 2025-09-14 13:32 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Bell (Contractor, Alderwick Property Works): “Followed up again for the quotation or confirmation that an inspection was needed.”

---

Generated by agent-c on 2026-10-10 15:42:28 UTC from `Property Management/027`. Full reasoning in REASONING.md, trace in trace.jsonl.
