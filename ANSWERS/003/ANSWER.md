# Case 003: Bathroom and kitchen maintenance

**Next action:** Hand the vent leak, bedroom damp and the landlord's insurance and roof-history request to a property-management supervisor. Send the routine invoice and report chase to the plumber and the update to the tenant now.

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Property-management supervisor, Northbridge Lettings | Internal note / escalation queue | 60% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 23 events (E001–E023), decision moment 2025-09-14 09:20.
- Attachments: A1 attachments/tap-works-invoice.pdf (pdf).

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Property-management supervisor, Northbridge Lettings via Internal note / escalation queue (see Escalated).

2. Same turn (`contractor.chase`) → Gareth Lune, Copper Finch Plumbing via Email:

> Hi Gareth,
> 
> Thank you for attending Flat 4, 8-12 Juniper Mews, Vellumford on Friday 12 September and for your invoice NBL-003-INV-14. Before we can pass it on, please could you:
> 
> 1. Reissue the invoice as a PDF showing the correct property (Flat 4, 8-12 Juniper Mews, Vellumford, ZZ1 1ZZ). The current one shows Flat 4, 28 Larkspur Quay, Brindlewick. Please also include the amount, the VAT basis and the date the work was carried out.
> 2. Send a short visit report with photos of the completed tap work. Please confirm whether the kitchen tap was replaced rather than repaired, and why. We have no quote on record for a replacement mixer.
> 3. Tell us whether you looked at the rainwater coming through the bathroom vent and the damp on the smaller bedroom's ceiling and wall, and what you found.
> 4. Confirm whether any work was done on 11 September. Your email that day said the job was done, before you corrected it.
> 
> Please reply by Tuesday 16 September. We cannot process the invoice until it is corrected.
> 
> Kind regards,
> Priya Nair
> Northbridge Lettings

3. Same turn (`tenant.update`) → Elian Voss via Email:

> Dear Elian,
> 
> Thank you for letting the plumber in on Friday 12 September. He has told us he fitted a new kitchen mixer tap and a new insert and head on the bathroom basin hot tap. Please could you let us know whether both taps are now working properly.
> 
> We have no record yet that the rainwater through the bathroom vent or the damp in the smaller bedroom has been looked at. We are taking this up with your landlord. Please could you tell us whether water is still coming in when it rains, and whether the damp patches have grown. Photos would help.
> 
> In the meantime, please keep away from any area where water is coming in. If water gets near any light fitting, switch or socket, do not touch it, and tell us straight away. Please do the same if the ceiling bulges or the leak gets worse.
> 
> It would help to hear from you by Tuesday 16 September. We will update you on next steps by Wednesday 17 September.
> 
> Kind regards,
> Priya Nair
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- contractor.chase only: This deals with the invoice but leaves an 11-day water leak, possible roof damage and the landlord's 10-day-old insurance request without anyone who can decide them.
- landlord.update forwarding the invoice: The invoice names the wrong property and has no amount, and the replacement mixer may be outside the approval.
- case.close: The leak and damp are not dealt with, the invoice is unverified and the landlord's request is open.

## Escalated

Yes, to Property-management supervisor, Northbridge Lettings.

**Why a person is needed:** Choosing the trade for a possible roof leak, answering the building-insurance and history request, and judging whether the replacement mixer was within the approval need someone with authority and access to the agency's records.

**Summary:** The plumber invoiced for tap work, but the invoice names a different property and has no amount. The vent water leak and bedroom damp have not been inspected after 11 days. The landlord's request to check building insurance and the flat's repeated roof leaks ("some of the damage appeared severe") has gone unanswered for 10 days.

**Done so far:**
- E003 approval requested
- E004 landlord approved and asked about insurance and history
- E008 plumber referred all issues
- E020 visit 12 Sept
- E022 invoice received (A1, wrong address, no amount)
- This turn: plumber asked for a corrected invoice and visit report; tenant updated and asked about leak status

**Options:**
- Holding update to the landlord on Mon 15 Sept, then propose a roofer or building inspection of the vent and damp for his approval. Risk: Slight delay while he decides; water keeps coming in when it rains.
- Refer the roof and vent to block management or the freeholder if the roof is communal. Risk: Not knowing who is responsible could delay the repair.
- Send the plumber back to inspect the vent. Risk: Probably the wrong trade for a roof leak.

**Recommended:** Tell the landlord on Monday 15 Sept that his insurance and history request is being handled and that the vent and damp have not yet been inspected. Agree a roof or building inspection with him. Hold the invoice until it is corrected and checked against the approval.

## What failed

- Nothing failed.

## Final result

A supervisor takes ownership of the leak and damp response and the landlord's insurance and history question. The plumber sends a corrected invoice and a visit report. The tenant confirms whether the leak and damp are still active.

**Follow up by:** 2025-09-16

### Why

The tap work is evidenced only by an invoice that names a different property and has no amount, so it cannot go to the landlord (refinement 1; manual 0a.3–0a.4). The bigger open items need a person. Water has been coming in through the vent with damp on the bedroom ceiling and wall for 11 days with no inspection (E001, E021). The landlord says roof leaks keep happening and the damage looks severe, and asked for an insurance and history check that has gone unanswered for 10 days (E004, E005, E012). Choosing the right trade, dealing with building or insurance questions and judging whether the mixer replacement was in scope go beyond routine handling (manual s.5: water through a ceiling, spend beyond approval). Following refinement 6, the routine contractor chase and the tenant update go out now in alsoSend.

### Boundaries (what this does not prove or settle)

- The invoice text does not prove the work was done at this property: it names 28 Larkspur Quay.
- Landlord approval to attend is not approval of a replacement kitchen mixer or its price.
- Nothing here says whether building insurance covers the damage or who is responsible for the roof.
- The vent leak and bedroom damp are not resolved or diagnosed.
- Nothing is paid, deducted from rent or forwarded to the landlord by this step.

### Remaining work

- Supervisor to arrange inspection of the vent leak and damp by a suitable trade, with the landlord's agreement.
- Answer the landlord's insurance and roof-history request.
- Check the corrected invoice against the approval, then forward it to the landlord with how it will be paid.
- Get the tenant's confirmation that both taps now work.
- Check agency key records for whether keys were issued for the visit and are back.

### Assumptions

- The plumber's visit on 12 Sept is the only attendance; the 11 Sept 'Job was done today' message was a mistake.
- The Larkspur Quay address on the invoice may be an error, but this is not assumed until the plumber confirms.
- The calculated 'on Friday' 19 Sept date is a keyword artefact; E020 contains no such promise.

### Evidence

- **S:initial-request** · Initial request: “The tenant reports that the kitchen tap drips and the bathroom hot tap drips and is difficult to shut off. During heavy rain, water drips through the bathroom vent. Damp patches have appeared on the c…”
- **S:case-details** · Case details: “- **Source role:** Tenant - **Status:** Requires decision - **Created:** 2025-09-03 17:43:00 UTC - **Updated:** 2025-09-14 09:20:00 UTC - **Property:** Flat 4, 8-12 Juniper Mews, Vellumford, ZZ1 1ZZ”
- **E001** · 2025-09-03 17:43 · Elian Voss (Tenant) → Priya Nair (Property Manager, Northbridge Lettings): “Submitted a maintenance request covering the dripping kitchen tap, bathroom hot tap that is hard to close, rainwater dripping through the bathroom vent, and damp patches on the smaller bedroom ceiling…”
- **E003** · 2025-09-04 08:15 · Priya Nair (Property Manager, Northbridge Lettings) → Owen Vale (Landlord): “Sent the tenant's reported issues for approval, including both taps, water through the bathroom vent during heavy rain, and bedroom damp. Asked whether Northbridge Lettings could arrange attendance.”
- **E004** · 2025-09-04 08:32 · Owen Vale (Landlord) → Priya Nair (Property Manager, Northbridge Lettings): “Replied, “Yes, please proceed.” Also asked Northbridge Lettings to check what may be covered by building insurance and to review the flat's history, saying roof leaks had occurred repeatedly and that …”
- **E005** · 2025-09-04 09:10 · Priya Nair (Property Manager, Northbridge Lettings) → Priya Nair (Property Manager, Northbridge Lettings): “Recorded landlord approval to proceed. The approval response also contains separate requests about insurance and prior roof-leak history. No insurance enquiry or history review is recorded as complete…”
- **E008** · 2025-09-04 16:40 · Priya Nair (Property Manager, Northbridge Lettings) → Gareth Lune (Plumber, Copper Finch Plumbing): “Forwarded the reported symptoms and asked Gareth to arrange a visit. The referral included both tap problems and the vent/bedroom water-ingress reports; it did not separate them into distinct work ord…”
- **E012** · 2025-09-05 09:00 · Priya Nair (Property Manager, Northbridge Lettings) → Owen Vale (Landlord): “Updated the landlord that a contractor visit was booked for Friday 12 September. The email did not report any progress on the insurance or property-history requests.”
- **E014** · 2025-09-11 10:15 · Gareth Lune (Plumber, Copper Finch Plumbing) → Priya Nair (Property Manager, Northbridge Lettings): “Wrote, “Please cancel appointment. Job was done today.” The message did not identify which reported issues had been completed or provide a visit report or invoice.”
- **E015** · 2025-09-11 10:35 · Gareth Lune (Plumber, Copper Finch Plumbing) → Priya Nair (Property Manager, Northbridge Lettings): “Sent a correction: “Booked for tomorrow.” No time or explanation accompanied the correction.”
- **E020** · 2025-09-12 10:55 · Gareth Lune (Plumber, Copper Finch Plumbing) → Elian Voss (Tenant): “Gareth called from outside the building and asked about the entrance, describing the address as 8-10 Juniper Mews. Elian confirmed the building as 8-12 Juniper Mews, Flat 4, and let Gareth in after th…”
- **E021** · 2025-09-12 12:20 · Priya Nair (Property Manager, Northbridge Lettings) → Priya Nair (Property Manager, Northbridge Lettings): “Visit access was confirmed by the contractor's call to the tenant. No attendance findings or confirmation that the vent leak or bedroom damp had been investigated had yet been recorded.”
- **E022** · 2025-09-14 09:00 · Gareth Lune (Plumber, Copper Finch Plumbing) → Priya Nair (Property Manager, Northbridge Lettings): “Submitted invoice text stating that a new kitchen mixer tap was installed and a new brass insert and chrome head were fitted to the basin hot tap.”
- **E023** · 2025-09-14 09:20 · Priya Nair (Property Manager, Northbridge Lettings) → Priya Nair (Property Manager, Northbridge Lettings): “The invoice was added to the maintenance record.”
- **A1** · attachment attachments/tap-works-invoice.pdf

---

Generated by agent-c on 2026-10-10 15:37:04 UTC from `Property Management/003`. Full reasoning in REASONING.md, trace in trace.jsonl.
