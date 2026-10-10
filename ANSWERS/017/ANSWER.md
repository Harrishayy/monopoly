# Case 017: Flat entrance door maintenance request

**Next action:** Reply to the landlord's budget question by email. Set out the £186.00 paint-only quote and what it leaves out (the door catch), and ask for his written decision on the paint work and on whether to get the catch assessed. Nothing will be booked until the building manager replies.

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Send a message (`send_message`) | Elian Moss (Landlord, 14 Lantern Mews) | Email | 62% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 19 events (E001–E019), decision moment 2025-02-12 16:10.
- Attachments: A1 attachments/fire-door-quotation.pdf (pdf).

## Actions taken

1. **Reply to the landlord's budget question by email. Set out the £186.00 paint-only quote and what it leaves out (the door catch), and ask for his written decision on the paint work and on whether to get the catch assessed. Nothing will be booked until the building manager replies.** (`landlord.send_quote`) → Elian Moss (Landlord, 14 Lantern Mews) via Email:

> Dear Mr Moss,
> 
> Thank you for your email of 11 February about the entrance door at 14 Lantern Mews.
> 
> The quotation
> Pale Finch Decorating quotation NBL-017-Q1, dated 7 February 2025 and valid until 28 February 2025: £186.00 total, including materials and labour. It covers:
> - protecting the work area on the flat side of the door
> - lightly sanding loose coating on the flat-side face and the visible top edge
> - spot-filling minor marks
> - one undercoat and two finish coats of water-based interior paint
> - leaving the area tidy
> The quotation does not say whether VAT is included. We have asked the contractor today to confirm this. Any figure above £186.00, and any extra preparation the contractor finds is needed, will come back to you for approval before any work is done.
> 
> What the quotation does not cover
> It is for decoration only. It does not cover the door catching on the frame at the top, which Iona reported and the contractor saw on 7 February. It also excludes any adjustment of the door, frame or hinges, any hardware work, and any check of the door's construction or how it closes. The contractor makes no statement about the door's fire rating or fire safety. Painting alone is not expected to fix the catch.
> 
> Iona tells us the door has latched every time since the visit but still needs a firm pull. The building manager says the flat entrance doors are listed in the building file as fire-resisting. A common-area check last month recorded this door as closing slowly, but nothing was measured and the building office has no inspection or certification record for it. Because the door is listed as fire-resisting, we think the catch and slow closing should be looked at by someone qualified to assess door sets, and not left as a decorating job.
> 
> Your question about the repair budget
> We cannot approve the work from a budget on your behalf. The decision is yours, so please confirm it in writing.
> 
> Building response
> On 12 February we asked the building manager whether the painting needs building approval, particular materials or a particular procedure. We have not had a reply yet. As you asked, nothing will be booked until we have that reply and have shared it with you.
> 
> What we need from you, by Tuesday 18 February if possible:
> 1. Do you approve quotation NBL-017-Q1 at £186.00 for the decoration described above, once the building has replied? If VAT turns out to be extra, that will come back to you first.
> 2. Should we arrange for a suitably qualified person to inspect the catch and slow closing and send you a price? Nothing would be spent on this without your separate approval.
> 
> If Iona reports that the door stops latching or closing fully, we will contact you straight away, because that would need a quicker response.
> 
> We will update you by Monday 17 February with the building manager's reply and the contractor's VAT confirmation, or with where we are in chasing them.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

2. Same turn (`tenant.update`) → Iona Vale (Tenant, 14 Lantern Mews) via Portal:

> Dear Iona,
> 
> Thank you for your message of 10 February, and for letting us know the door has latched each time but still needs a firm pull.
> 
> You asked whether painting would affect the door. The decorator's quotation covers surface preparation and repainting of the inside face and top edge only. It does not cover the catch at the top, and the decorator does not give any view on the door's performance. Because the building lists the flat entrance doors as fire-resisting, we have asked the building manager whether painting needs approval, particular materials or a particular procedure. We are waiting for their reply. We have also sent the quotation and its limits to your landlord, who decides how to proceed, including whether the catch should be looked at separately.
> 
> No work has been booked. We will give you advance notice before anyone needs access, and any visit will be after 10:00 as you asked, with no photographs of personal items.
> 
> In the meantime, if the door stops latching, will not close fully, or gets harder to close, please tell us straight away by phone or through the portal.
> 
> We will update you by Monday 17 February.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

3. Same turn (`contractor.update`) → Tomas Ebb (Contractor, Pale Finch Decorating) via Email:

> Dear Tomas,
> 
> Thank you for quotation NBL-017-Q1 (7 February 2025, £186.00, valid until 28 February 2025) for the flat entrance door at 14 Lantern Mews, and for your email of 11 February confirming the scope.
> 
> The quotation says the total includes materials and labour but does not say whether VAT is included. Please confirm whether £186.00 is the full price including any VAT, and if not, the VAT-inclusive total. Please reply by Monday 17 February.
> 
> This is a request for information only. The landlord has not yet approved the work and nothing should be booked or started. We will contact you once the landlord and the building manager have replied.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.wait for the building manager's reply: The landlord's question of 11 February and the tenant's question of 10 February would both stay unanswered, and both are waiting on us.
- case.escalate as a fire-door safety risk: The door latches every time (E015), and nobody reports that it cannot be closed or secured. Putting the risk plainly to the landlord, who controls scope, and giving the tenant a way to report at once handles it for now. Escalate if it gets worse.
- contractor.instruct the paint work: The landlord has not approved the quote, the building has not replied, and the landlord asked for nothing to be booked before that.
- Chase the building manager: He was only asked at 09:30 today (E018), so a chase now is too early.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The landlord replies in writing. He either approves £186.00 for the paint work, subject to the building's reply, or declines it, and he says whether we should get a qualified assessment of the catch priced. The contractor confirms the VAT basis. The tenant knows where things stand and how to report a worsening door at once.

**Follow up by:** 2025-02-17

### Why

The landlord's email of 11 February (E017) is the latest real message, and no reply to it has been sent. E019 is only an internal note. He asked whether the quote can be approved from the repair budget, and he wants the scope and the building's response before anything is booked. Nothing in the records gives the agency budget authority, so the quote goes back to him for a written decision. Every quote goes to the landlord, and approving the inspection (E007) did not approve a quote. There is also a scope gap. The tenant's main problem is the door catching at the top, on a door listed as fire-resisting (E001, E005, E010, E013, E015), and the paint-only quote leaves it out (A1, E011, E016). The landlord controls scope, so that question goes to him as well. The quote does not state its VAT basis, so the contractor is asked about it in this same turn, and the landlord is told that any figure above £186.00 comes back to him. The building manager was only asked at 09:30 today (E018), so chasing him now would be too early, and the landlord has already said booking waits for that reply. The door still latches every time, so this is not an escalation now. The risk is put plainly to the landlord, and the tenant gets a way to report it at once. Her question of 10 February (E015) has had no answer, so she gets an update in the same turn.

### Boundaries (what this does not prove or settle)

- Sending the quote is not approval. No work is approved, booked or instructed.
- If the landlord approves the paint work, that does not fix the catch or slow closing, and it does not show the door works as a fire door.
- The VAT basis of the £186.00 is not yet confirmed. Any higher figure needs the landlord's approval.
- Nothing is booked until the building manager replies to the query of 12 February.
- No statement is made about the door's fire rating, compliance, or the cause of the catch.

### Remaining work

- Pass the contractor's VAT answer to the landlord. If the total is above £186.00, get the landlord's approval of the new figure.
- If the building manager has not replied, chase him on 17 February or later, asking again about building approval, materials or procedure, and any door record.
- Once the landlord and the building have both replied, instruct only the approved scope before the quote expires on 28 February. Arrange access after 10:00 with advance notice to the tenant, and no photographs of personal items.
- If the landlord agrees, get a qualified door-set assessment of the catch priced, and consult the building manager before any adjustment.
- If the door stops latching or closing fully, hand the case to a person as a safety matter.

### Assumptions

- The landlord has seen the quoted figure (E017 calls it affordable). The details are restated in case he has not had the written terms.
- No authority for a 'repair budget' is recorded on the case, so the agency cannot approve the spend itself.
- Email is the right channel for the landlord and the contractor, as both have used it (E007, E017, E011, E016).

### Evidence

- **E001** · 2025-02-03 08:20 · Iona Vale (Tenant, 14 Lantern Mews) → Maya Chen (Property Manager, Northbridge Lettings): “Reported flaking paint on the flat-side face of the entrance door and said it catches near the top when closing. Door still closes if pulled firmly. No injury or immediate access issue reported.”
- **E003** · 2025-02-03 10:12 · Iona Vale (Tenant, 14 Lantern Mews) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed the latch engages after a firm pull. Paint is flaking on the flat-side face; the top edge has a rub mark. Asked that any visit be arranged after 10:00 because of a scheduled home-care visit …”
- **E005** · 2025-02-04 08:35 · Ravi Dast (Building Manager, Brindlewick Court) → Maya Chen (Property Manager, Northbridge Lettings): “Said the building file lists the flat entrance doors as fire-resisting doors but did not have a current door-by-door inspection sheet to hand. Asked that no drilling or alterations be arranged without…”
- **E007** · 2025-02-04 13:15 · Elian Moss (Landlord, 14 Lantern Mews) → Maya Chen (Property Manager, Northbridge Lettings): “Authorized an inspection and requested a price before any chargeable work. Asked whether the issue could be limited to decorating. No spending limit or authority for replacement was specified.”
- **E009** · 2025-02-05 11:02 · Iona Vale (Tenant, 14 Lantern Mews) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed access after 10:30 and asked the visitor not to photograph personal items inside the flat.”
- **E010** · 2025-02-07 10:42 · Tomas Ebb (Contractor, Pale Finch Decorating) → Maya Chen (Property Manager, Northbridge Lettings): “Attended to inspect the door surface and operation. Recorded flaking coating on the flat-side face and a rub mark at the upper edge. The leaf contacted the frame at the top during closing; it latched …”
- **E011** · 2025-02-07 11:18 · Tomas Ebb (Contractor, Pale Finch Decorating) → Maya Chen (Property Manager, Northbridge Lettings): “Sent a quotation for preparation, sanding, spot filling, and repainting the flat-side face and visible top edge. Said the visit was visual only and did not include door adjustment, hardware work, or a…”
- **E013** · 2025-02-10 09:10 · Ravi Dast (Building Manager, Brindlewick Court) → Maya Chen (Property Manager, Northbridge Lettings): “Reported that a common-area check last month noted the flat entrance door as closing slowly, but the checker did not record a gap measurement or inspect the door set. No individual report or certifica…”
- **E014** · 2025-02-10 10:25 · Maya Chen (Property Manager, Northbridge Lettings) → Elian Moss (Landlord, 14 Lantern Mews): “Updated the landlord on the contractor's visual-only visit and the building manager's note that the door had previously been recorded as closing slowly. Explained that the quotation excludes adjustmen…”
- **E015** · 2025-02-10 15:40 · Iona Vale (Tenant, 14 Lantern Mews) → Maya Chen (Property Manager, Northbridge Lettings): “Said the door has latched on each use since the visit but still needs a firm pull. Asked whether painting would affect the door and requested advance notice before any further access.”
- **E016** · 2025-02-11 08:55 · Tomas Ebb (Contractor, Pale Finch Decorating) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed the quotation price remains available through 28 February. Said Pale Finch Decorating's work would be limited to the listed surface preparation and repainting, and that no fire-door survey, …”
- **E017** · 2025-02-11 12:20 · Elian Moss (Landlord, 14 Lantern Mews) → Maya Chen (Property Manager, Northbridge Lettings): “Replied that the quotation appears affordable and asked whether it can be approved from the repair budget. Asked for the proposed scope and any building response to be confirmed before work is booked.”
- **E018** · 2025-02-12 09:30 · Maya Chen (Property Manager, Northbridge Lettings) → Ravi Dast (Building Manager, Brindlewick Court): “Forwarded the quotation scope and asked whether surface preparation and painting of the flat-side face and top edge require building approval or any specified materials or procedure. Requested any ins…”
- **E019** · 2025-02-12 16:10 · Maya Chen (Property Manager, Northbridge Lettings) → Elian Moss (Landlord, 14 Lantern Mews): “Quotation, tenant access preference, contractor's visual-only observations, and building manager's limited check information are on file. Building manager's response to the scope query is pending. No …”
- **A1** · attachment attachments/fire-door-quotation.pdf

---

Generated by agent-c on 2026-10-10 15:39:29 UTC from `Property Management/017`. Full reasoning in REASONING.md, trace in trace.jsonl.
