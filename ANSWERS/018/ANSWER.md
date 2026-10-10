# Case 018: Kitchen maintenance report

**Next action:** Chase landlord Gareth Vale by phone, followed by the same message in writing, for confirmation of who is doing the rodent proofing, which openings, the contractor, the rebooked date and any pest control report

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Chase (`chase`) | Gareth Vale (Landlord) | Phone call to 07700 900184, with the same message sent by email afterwards | 72% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 19 events (E001–E019), decision moment 2025-09-11 14:30.
- Attachments: none.

## Actions taken

1. **Chase landlord Gareth Vale by phone, followed by the same message in writing, for confirmation of who is doing the rodent proofing, which openings, the contractor, the rebooked date and any pest control report** (`landlord.chase`) → Gareth Vale (Landlord) via Phone call to 07700 900184, with the same message sent by email afterwards:

> Dear Mr Vale,
> 
> I'm following up on the rat activity in the kitchen at 14 Mosswold Crescent, which the tenant first reported on 14 August. When we spoke on 18 August, we noted that you would arrange the works directly. On the same day I emailed you asking for an expected completion date and for confirmation once the work was done. We have not had a reply to that email.
> 
> Here is what the tenant has told us since:
> - On 1 September she said pest control visits were still going on and the openings beneath the kitchen sink had not been sealed.
> - On 7 September she said pest control attended that morning and removed its equipment. She understood that a separate contractor would come on 8 September to work on the wall area.
> - On 8 September she told us that nobody came to fill the openings.
> 
> We have no written pest control report and no confirmation that any opening has been sealed. Rats have been inside the kitchen, so the tenant needs this resolved promptly.
> 
> By 5pm on Friday 12 September, could you please confirm:
> 1. That you are still arranging this yourself, or whether you would now like Northbridge Lettings to send our own contractor to inspect and quote.
> 2. The name of the contractor doing the proofing and the rebooked date for their visit.
> 3. Which openings are being sealed: beneath the sink, the wall area, external openings near the drain, or more than one of these.
> 4. Whether pest control treatment has finished. If so, please send us a copy of any report from the pest controller.
> 
> Please don't give the tenant's contact details to your contractor until we have confirmed that she agrees. We are asking her now and will pass on her details, or arrange access, once she has agreed.
> 
> If we have not heard from you by then, or if the tenant reports more rat activity indoors, we will need to refer the matter to a senior colleague to agree next steps with you.
> 
> Kind regards,
> Tara Wren
> Property Manager, Northbridge Lettings

2. Same turn (`tenant.update`) → Elise Rowan (Tenant) via Phone call (her stated preference), with a confirming email:

> Hello Elise, this is Tara from Northbridge Lettings. Thank you for letting us know that nobody came on 8 September to fill the openings. I have chased your landlord today. I've asked him who is doing the proofing, which openings will be sealed, the rebooked date, and for any pest control report. I'll call you with an update by the end of Friday 12 September. Can you confirm you're happy for us to give your phone number to the landlord's contractor so they can book the visit with you? We won't share it until you agree. In the meantime, please keep food in sealed containers and keep your dog away from any bait or traps left at the property. If you see rats inside again, or the problem gets worse, please call us straight away and we'll treat it as urgent. Thank you, Tara Wren, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.escalate: The landlord has not been chased once since E007. A chase with a 24-hour deadline comes first, and escalation follows if it fails or rat activity gets worse.
- contractor.assign: The landlord has not approved an agency contractor or any spend, and the only position on record is that he is arranging the work himself.
- case.wait: Both internal waits have run out and the expected visit on 8 September did not happen. Nobody has promised anything for a future date, so there is nothing to wait for.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The landlord confirms who is doing the proofing, which openings, the contractor and a new date, and sends any pest report. Or he asks Northbridge to arrange a contractor, which would then be a contractor.assign step with his approval on record.

**Follow up by:** 2025-09-12

### Why

The agency recorded this as a landlord-managed job (E007, E008). For landlord-managed works, the playbook says to chase the landlord about 3 days after any date given. The proofing visit the tenant expected on 8 September did not happen (E014, E017), and today is 3 days later. The landlord has not replied to the request for a completion date sent 24 days ago (E007). The agency's own internal waits have both run out without any landlord contact (E013, E016, E018), and nobody has chased him yet, so a chase is due now. He asked to be called (E004) and gave a number. The earlier request (E007) went by email, so this second contact goes by phone and then in writing. We cannot instruct our own contractor: the landlord's only position on record is that he will arrange the work himself, and he has not approved any spend by the agency. Rats indoors make the job urgent, but they are not one of the playbook's immediate escalation triggers. Pest treatment has been happening, and the open question is a decision only the landlord can make. So the right move is a firm chase with a short deadline, with escalation if he does not reply. The tenant prefers phone contact (E017) and has had no update since 8 September, so she is told the status and given a date in the same turn.

### Boundaries (what this does not prove or settle)

- This chase does not show that any treatment or proofing has been done.
- The tenant's accounts of the 7 and 8 September visits have not been independently checked.
- It does not authorise Northbridge to instruct a contractor or spend money.
- It does not settle which openings need sealing or whether sealing them is feasible.
- It does not give the landlord's contractor permission to have the tenant's contact details.

### Remaining work

- Get the landlord's reply by 5pm on Friday 12 September. If he does not reply, escalate to a senior colleague with the full history.
- Get the tenant's consent before her details go to the landlord's contractor.
- Get the pest control report and evidence that the proofing is complete, then have the tenant confirm she has seen no further activity before closing.
- Call the tenant with an update by Friday 12 September.

### Assumptions

- The job is still landlord-managed, based on the agency's note (E007). The landlord has not confirmed this in writing.
- The landlord's phone number from E004 is still current.
- No vulnerable occupant is known. The household has not been asked about this.

### Evidence

- **E001** · 2025-08-14 11:05 · Elise Rowan (Tenant) → Tara Wren (Property Manager, Northbridge Lettings): “Reports rats outside near the kitchen and says they have entered the kitchen, including beneath the sink, after the household returned from four days away. Says the landlord previously arranged baitin…”
- **E004** · 2025-08-17 15:25 · Gareth Vale (Landlord) → Tara Wren (Property Manager, Northbridge Lettings): “Asks for an urgent call back and provides 07700 900184. Does not give written approval or specify whether he will arrange the work himself.”
- **E006** · 2025-08-18 10:49 · Gareth Vale (Landlord) → Tara Wren (Property Manager, Northbridge Lettings): “Discusses an earlier property record that he recalls from December 2024: traps had been placed inside and outside, a kitchen kickboard was replaced during investigation, and the record reportedly said…”
- **E007** · 2025-08-18 11:26 · Tara Wren (Property Manager, Northbridge Lettings) → Gareth Vale (Landlord): “Records that the landlord will arrange the works directly and asks him to provide an expected completion date and confirm when they are complete. No contractor, scope, or target date is included in th…”
- **E008** · 2025-08-18 11:26 · Tara Wren (Property Manager, Northbridge Lettings) → Elise Rowan (Tenant): “Advises that the landlord will arrange the works directly and that he or a contractor he appoints may contact the tenant about access and timing.”
- **E010** · 2025-09-01 12:02 · Elise Rowan (Tenant) → Tara Wren (Property Manager, Northbridge Lettings): “Says pest-control visits are ongoing, with a final visit expected the following Monday. Says the landlord wants openings beneath the kitchen sink blocked, but this has not been done yet.”
- **E013** · 2025-09-07 14:11 · Tara Wren (Property Manager, Northbridge Lettings) → Northbridge Lettings workflow (System): “Records a decision to allow one additional business day for an update from the landlord. No new contractor or appointment details are entered.”
- **E014** · 2025-09-07 14:14 · Tara Wren (Property Manager, Northbridge Lettings) → Elise Rowan (Tenant): “Tenant says pest control attended that morning and removed its equipment, which they understood to be the final visit. They believe separate contractors are due the next day to open or work on the wal…”
- **E016** · 2025-09-08 14:26 · Tara Wren (Property Manager, Northbridge Lettings) → Northbridge Lettings workflow (System): “Records a further three-business-day wait for confirmation from the landlord. The case remains under landlord-arranged works; no Northbridge Lettings contractor is recorded as instructed.”
- **E017** · 2025-09-08 14:29 · Tara Wren (Property Manager, Northbridge Lettings) → Elise Rowan (Tenant): “Tenant says nobody has attended that morning to fill the openings, despite their understanding that contractors were expected. They are at work and say phone contact is more convenient than email. The…”
- **E018** · 2025-09-11 14:26 · Northbridge Lettings workflow (System) → Tara Wren (Property Manager, Northbridge Lettings): “Automated waiting-period expiry recorded. No confirmation has arrived that the separate proofing work was completed. The latest tenant report says the expected contractor did not attend.”

---

Generated by agent-c on 2026-10-10 15:39:51 UTC from `Property Management/018`. Full reasoning in REASONING.md, trace in trace.jsonl.
