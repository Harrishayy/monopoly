# Case 015: Vacant Property Preparation

**Next action:** Keep the post-tenancy works on hold for three working days until the separate maintenance is done, ask the landlord now to clarify her approval, and recheck on Tue 30 Sep 2025

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Wait (`wait`) | — | — | 50% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 21 events (E001–E021), decision moment 2025-09-25 08:34.
- Attachments: A1 attachments/move-out-inspection-report.pdf (pdf), A2 attachments/property-preparation-quotation.pdf (pdf).

## Actions taken

1. **Hold** (`case.wait`) until 2025-09-30. What to check then:

> HOLD – 18 Thistlevaunt Lane, post-tenancy sanitation, waste removal and garden clearance (Brindlewick quote NBL-015-Q1, £665.00).
> Reason: on 25 Sep Mira Venn told us to wait three more working days, because the separate major maintenance must be finished before this work can be booked (E021). The contractor has agreed not to book until we instruct them (E012, E013, E015). No visit is booked.
> Sent in this turn: an email to the landlord, Nessa Quill, asking which quote her 17 Sep 'approved quote' meant, whether the £665 work can go ahead before the deposit claim is decided, whether she approves the carpet and garden items, and whether she wants the disturbed soil made good. Reply requested by Tue 30 Sep.
> Recheck on Tue 30 Sep 2025:
> 1. Has the separate major maintenance been approved, scheduled and completed? Is there evidence on record?
> 2. Has the landlord replied to today's email? If not, phone her the same day. That is the second attempt, so use a different channel.
> 3. Do not instruct or book Brindlewick until the landlord has given an approval that does not depend on bond recovery. The 8 Sep message to the contractor (E009) left out her condition. Once her position is clear, send the contractor a contractor.update with the confirmed scope and the landlord's position, and ask for the VAT basis and written visit dates (E019).
> 4. Ask Mira Venn about the prospective tenant's 28 Sep move-in (E015). The hold runs past that date. Is the move-in still going ahead, and has the incoming party been told? This is the property manager's decision.
> 5. If the landlord will not proceed without guaranteed recovery, or anyone disputes a deposit deduction, hand that decision to a person.

2. Same turn (`landlord.chase`) → Nessa Quill (Landlord) via Email:

> Dear Ms Quill,
> 
> Re: 18 Thistlevaunt Lane – post-tenancy cleaning, waste removal and garden clearance
> 
> I'm following up on our email of 10 September and your message of 17 September. Before we book anything, we need to be sure we have understood your instructions.
> 
> 1. On 17 September you wrote 'approved quote'. Could you confirm which quote you meant? Was it the Brindlewick Turnover Services quote for the post-tenancy work (reference NBL-015-Q1, £665.00), or the separate maintenance quote?
> 
> 2. You approved the £665.00 quote on condition that the cost is recovered from the former tenants' deposit. We are preparing a claim through the deposit process, but we cannot guarantee how much will be recovered. The deposit held is £650, and the post-tenancy costs and tenant damage together come to more than that. Are you happy for this work to go ahead before the deposit claim is decided, whatever the outcome?
> 
> 3. The quote includes carpet shampooing in bedroom one, the stairs and the landings, and weeding, grass cutting and tidying in the rear garden. Our earlier email did not list these. Please confirm you are happy for them to be included.
> 
> 4. The move-out inspection noted that soil in the rear garden has been disturbed by digging. The quote does not cover making this good. Would you like us to ask the contractor to price it, or leave it?
> 
> The work is on hold for now while the separate maintenance is completed first. Please reply by Tuesday 30 September. If we have not heard from you by then, we will phone you to go through it. We will not book the contractor until we have your confirmation.
> 
> Kind regards,
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.escalate to a lettings manager: The property manager already holds the deposit claim and has just made the hold decision, so a handover would repeat her decision. Escalate only if the landlord refuses to proceed without guaranteed recovery or a deposit deduction is disputed.
- contractor.chase for written dates: This goes against the hold instruction (E021). The contractor cannot be booked until the separate maintenance is done and the landlord's approval is clear.
- contractor.instruct: The approval depends on bond recovery (E008, E010) and has not been confirmed without that condition. Instructing now would be spending without approval.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

By 30 Sep the separate maintenance is confirmed as scheduled or done. The landlord has said which quote she approved, whether the £665 work can go ahead whatever the deposit outcome, and what scope she wants. The contractor can then get a clear instruction with the full scope.

**Follow up by:** 2025-09-30

### Why

The latest real event is an internal instruction from the property manager to wait three more working days, because the separate major maintenance has to come first (E021). The contractor has agreed to hold (E013, E015), so nothing can be booked yet. Chasing or instructing the contractor now would go against that instruction. Mira Venn already owns the deposit claim (E011) and has made the call to hold, so a handover would only repeat her decision. Three working days from Thu 25 Sep is Tue 30 Sep. The wait is the time to clear up the approval, so the landlord is asked now. She made her approval conditional on bond recovery (E008, E010). Her answer to the 10 Sep question about going ahead meanwhile is still outstanding after 15 days (E011). Her 'approved quote' (E016) does not say which quote she means; the only quote mentioned as awaiting approval at that point is the separate maintenance quote (E015). The approval request did not list the carpet and garden items (E007, A2), and the disturbed soil is not in the quote (A1, E006). The work cannot be booked without these answers, so asking her runs alongside the hold rather than breaking it. E018–E020 add nothing new. In the computed-facts party list, the unanswered-request flags for E007 and E014 are out of date: E008 answered E007 and E015 answered E014.

### Boundaries (what this does not prove or settle)

- Waiting does not approve or book the £665 work.
- The landlord's conditional approval is not one we can act on, and the agency cannot guarantee recovery from the deposit.
- The 17 Sep 'approved quote' is not confirmed as approval of this quote.
- Nothing here decides whether the former tenants are liable or what is deducted from the deposit.
- No date is promised to the landlord, the contractor or the prospective tenant.
- Sending the email does not mean the landlord has received or read it.

### Remaining work

- Confirm the separate major maintenance is completed or scheduled.
- Get the landlord's reply on which quote she approved, whether to proceed before the deposit claim is decided, the carpet and garden items, and the soil.
- Send the contractor the confirmed scope and the landlord's position (correcting E009), and ask for the VAT basis and written dates.
- Ask the property manager about the 28 Sep move-in.
- Deposit claim: get the itemised figures; a person decides any dispute.

### Assumptions

- 'Three more working days' from Thu 25 Sep 2025 ends on Tue 30 Sep 2025.
- The property manager has the 28 Sep move-in timing in hand, since her hold instruction runs past it.
- Email is still the right channel for the landlord; she has replied by email before (E008, E010).

### Evidence

- **E021** · 2025-09-25 08:34 · Mira Venn (Property Manager, Northbridge Lettings) → Tovan Rusk (Maintenance Coordinator, Northbridge Lettings): “Recorded the instruction to wait three more working days because the separate major maintenance work must be completed before the sanitation work can be booked. No date is booked, and no update confir…”
- **E008** · 2025-09-08 15:45 · Nessa Quill (Landlord, Property Owner) → Mira Venn (Property Manager, Northbridge Lettings): “Replied: “Happy to approve if they are recovered from the bond as there is no way it was in that state when they moved in.””
- **E010** · 2025-09-08 16:43 · Nessa Quill (Landlord, Property Owner) → Mira Venn (Property Manager, Northbridge Lettings): “Reiterated that approval depended on recovering the cost from the former tenants’ bond.”
- **E011** · 2025-09-10 10:27 · Mira Venn (Property Manager, Northbridge Lettings) → Nessa Quill (Landlord, Property Owner): “Reported that post-tenancy costs and tenant-attributed damage together exceed the £650 deposit held, and that a claim for the full deposit amount was being prepared through the deposit process. Said f…”
- **E012** · 2025-09-10 10:54 · Mira Venn (Property Manager, Northbridge Lettings) → Elian Wren (Contractor, Brindlewick Turnover Services): “Asked the contractor not to book the work until further notice while the deposit dispute was being handled.”
- **E013** · 2025-09-10 11:07 · Elian Wren (Contractor, Brindlewick Turnover Services) → Mira Venn (Property Manager, Northbridge Lettings): “Said the next availability would be the following week and agreed to wait for further instructions.”
- **E015** · 2025-09-16 07:31 · Mira Venn (Property Manager, Northbridge Lettings) → Elian Wren (Contractor, Brindlewick Turnover Services): “Confirmed the work should remain on hold because separate major maintenance was outstanding. A prospective tenant wanted to move in on 28 September; at that point, landlord approval of the separate ma…”
- **E016** · 2025-09-17 15:38 · Nessa Quill (Landlord, Property Owner) → Mira Venn (Property Manager, Northbridge Lettings): “Sent the brief update “approved quote” without identifying which quote it referred to.”
- **E007** · 2025-09-08 13:26 · Mira Venn (Property Manager, Northbridge Lettings) → Nessa Quill (Landlord, Property Owner): “Asked whether the £665 quote could proceed. The approval request described the work generally as post-tenancy work according to the inspection instructions, without listing the quoted carpet and garde…”
- **E006** · 2025-09-08 13:25 · Elian Wren (Contractor, Brindlewick Turnover Services) → Mira Venn (Property Manager, Northbridge Lettings): “Sent a £665 quote covering oven, hob and extractor degreasing; carpet shampooing in bedroom one, stairs and landings; rubbish removal; kitchen grease and bathroom limescale work; general sanitation el…”
- **E009** · 2025-09-08 15:46 · Mira Venn (Property Manager, Northbridge Lettings) → Elian Wren (Contractor, Brindlewick Turnover Services): “Told the contractor the quote was approved and asked for the earliest visit date, noting the property was vacant and keys could be collected from the office. The message did not mention the landlord’s…”
- **E019** · 2025-09-21 17:41 · Mira Venn (Property Manager, Northbridge Lettings) → Elian Wren (Contractor, Brindlewick Turnover Services): “Call note records that the contractor would provide possible dates, but the post-tenancy work still depended on the separate maintenance being scheduled first. No visit date was confirmed.”
- **A1** · attachment attachments/move-out-inspection-report.pdf
- **A2** · attachment attachments/property-preparation-quotation.pdf

---

Generated by agent-c on 2026-10-10 15:39:25 UTC from `Property Management/015`. Full reasoning in REASONING.md, trace in trace.jsonl.
