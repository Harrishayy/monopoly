# Case 025: Kitchen tap maintenance request

**Next action:** Ask Bracken & Vale Plumbing for the invoice amount and VAT, a completion report and photos for the new kitchen tap, and confirmation that the spare key was returned, before the invoice goes to the landlord

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Chase (`chase`) | Ivo Fenlock, Bracken & Vale Plumbing | Email | 60% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 22 events (E001–E022), decision moment 2025-09-15 11:11.
- Attachments: A1 attachments/corrected-plumbing-invoice.pdf (pdf).

## Actions taken

1. **Ask Bracken & Vale Plumbing for the invoice amount and VAT, a completion report and photos for the new kitchen tap, and confirmation that the spare key was returned, before the invoice goes to the landlord** (`contractor.chase`) → Ivo Fenlock, Bracken & Vale Plumbing via Email:

> Hi Ivo,
> 
> Thank you for the corrected invoice (ref NBL-025-INV-15) for 18 Thistlewick Row, Fenmere, ZZ1 1ZZ, which now shows the right postcode.
> 
> Before I can pass it to the landlord, I need the following, please:
> 
> 1. A readable PDF of the invoice showing the amount, the VAT basis (VAT-registered or not, and the VAT figure if it applies) and the line items. The copy we have shows the work but no amount.
> 2. The date you attended and a short completion note. Please tell us whether the old mixer tap could have been repaired, and why you fitted a new mono tap instead. The landlord approved maintenance on the dripping tap. He did not approve a particular replacement or price.
> 3. Before and after photos of the tap.
> 4. Did you notice or check anything about the tenant's report of cloudy-looking water when filling a glass? If so, please tell us what you found.
> 5. Confirmation that you collected the agency's spare key and returned it to our office, and the date you returned it.
> 
> Please reply by Wednesday 17 September 2025. Please do not carry out any further work at the property until we confirm the landlord's approval.
> 
> The boiler matter you raised on today's call is separate, and I'll pick it up with the relevant engineer apart from this job.
> 
> Kind regards,
> Tessa Wren
> Property Manager, Northbridge Lettings

2. Same turn (`tenant.ask`) → Nia Calder via Email:

> Dear Nia,
> 
> I'm sorry it has taken so long to update you on the kitchen tap. The plumber, Bracken & Vale Plumbing, has told us they have fitted a new kitchen tap. Please could you confirm by Wednesday 17 September:
> 
> 1. Has the new tap been fitted, and has the dripping stopped?
> 2. Does the water still look cloudy when you fill a glass?
> 
> If the tap is still dripping or anything gets worse, please let us know straight away.
> 
> Thank you for reporting the loose top kitchen drawer with the snapped metal brackets. We are raising it with your landlord as a separate repair and will tell you his decision. Until it is fixed, please avoid putting weight on that drawer.
> 
> I will update you by Wednesday 17 September.
> 
> Kind regards,
> Tessa Wren
> Property Manager, Northbridge Lettings

3. Same turn (`landlord.update`) → Orin Bell via Email:

> Dear Orin,
> 
> An update on the dripping kitchen mixer tap at 18 Thistlewick Row. The plumber has sent an invoice for supplying and fitting a new mono kitchen sink tap. I'm checking the amount, the VAT, the reason for replacing rather than repairing the tap, and photos with them, and asking the tenant to confirm the drip has stopped. I will send you the invoice and evidence once I have them, by Wednesday 17 September where possible. Nothing will be paid until you have seen it.
> 
> Separately, the tenant has reported that the top kitchen drawer is loose and its metal front brackets appear to have snapped. Would you like us to send our contractor to look at it and quote, or would you prefer to arrange your own?
> 
> Kind regards,
> Tessa Wren
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- landlord.update forwarding the invoice as completed work: There is no amount or VAT on the readable copy, no completion evidence, and the tap was replaced when the approval covered maintenance. Forwarding now would present unverified work and cost.
- case.escalate over the unapproved replacement: The amount is not known yet, and the replacement may fall within the approved on-the-spot repair. We should get the facts first; escalate only if the landlord disputes it or the cost is unreasonable.
- case.close: No fix is confirmed, the invoice has not been forwarded, the key is not confirmed back, and the drawer question is open.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The contractor sends an invoice PDF with the amount and VAT, the visit date, the reason for replacing the tap, photos, and confirmation that the key was returned. The tenant confirms whether the drip has stopped. We can then send the invoice to the landlord with the evidence, flagging the replacement against his approval.

**Follow up by:** 2025-09-17

### Why

The stage is "evidence before forwarding the invoice". A corrected invoice for a new mono kitchen tap has arrived (E022, A1), but the readable copy shows no amount or VAT basis. We cannot check it against an approval or forward it as it stands. The only sign the work was done is the contractor's own invoice. Nothing records whether the 10 Sep visit happened (E016–E018), and there are no photos or completion notes. The landlord approved "maintenance works" (E003), and we had asked the contractor for a quote or advice (E004). A full replacement tap needs explaining before it goes to the landlord, so the contractor holds every missing fact. The agency spare key was authorised for the visit (E015), and the office needs to know it has come back. In the same turn, the tenant is asked to confirm the fix. She has heard nothing from us since 12 Aug (E009), and her drawer report (E012) is unanswered. The landlord gets a status update and is asked about the drawer, without being told the work is complete.

### Boundaries (what this does not prove or settle)

- An invoice is not evidence of completion until the tenant or a completion report confirms it.
- This does not approve or pay the invoice. The landlord has approved maintenance, not a specific replacement or price.
- This does not diagnose the cloudy water or say it is safe.
- The drawer repair is not authorised; it needs the landlord's decision.
- The boiler matter is not part of this job and is not settled here.

### Remaining work

- Once the amount is known, compare it with the landlord's approval and send the invoice to the landlord with the evidence, flagging that the tap was replaced rather than repaired.
- Get the landlord's decision on the drawer, then assign if he approves.
- Check the office key log to confirm the spare key is back.
- Check the boiler matter with the relevant engineer, separately from this job.
- Close the job once the fix is confirmed, the landlord has the invoice, the payment route is noted and the key is back.

### Assumptions

- The visit probably happened between 10 and 15 Sep, given the invoice, but this is not confirmed.
- The landlord is back from abroad and email is still the best route (E003).

### Evidence

- **E001** · 2025-08-04 18:10 · Nia Calder (Tenant) → Tessa Wren (Property Manager, Northbridge Lettings): “Reports a constantly dripping kitchen mixer tap and cloudy-looking water when filling a glass. Says limescale may be involved and asks whether a replacement tap could be considered. No urgency or acce…”
- **E003** · 2025-08-05 08:52 · Orin Bell (Landlord) → Tessa Wren (Property Manager, Northbridge Lettings): “Approves proceeding with the maintenance works. Says they are abroad until the following Wednesday and email is the best way to contact them.”
- **E004** · 2025-08-05 09:30 · Tessa Wren (Property Manager, Northbridge Lettings) → Ivo Fenlock (Contractor, Bracken & Vale Plumbing): “Requests a quote or advice on whether a site visit is needed for the dripping mixer tap and cloudy-water report. No water sample or test result is available.”
- **E012** · 2025-09-05 19:40 · Nia Calder (Tenant) → Tessa Wren (Property Manager, Northbridge Lettings): “Says they are still waiting for contact about the leaking tap despite providing availability. Separately reports the top kitchen drawer is loose and its metal front brackets appear snapped; asks if it…”
- **E013** · 2025-09-07 09:50 · Tessa Wren (Property Manager, Northbridge Lettings) → Ivo Fenlock (Contractor, Bracken & Vale Plumbing): “The contractor says other jobs prevent a firm date, but expects to review the schedule later that day and book the visit during the week. There is some confusion about the property address, which the …”
- **E015** · 2025-09-09 16:39 · Nia Calder (Tenant) → Tessa Wren (Property Manager, Northbridge Lettings): “Says they will be at work from 11:00 the next day and authorizes the plumber to attend using the agency's spare key. The message does not address the drawer or provide new information about the cloudy…”
- **E016** · 2025-09-09 17:09 · Tessa Wren (Property Manager, Northbridge Lettings) → Ivo Fenlock (Contractor, Bracken & Vale Plumbing): “Confirms a visit for 10 September, with timing potentially varying because the contractor needs to collect keys from the office.”
- **E017** · 2025-09-10 06:06 · Ivo Fenlock (Contractor, Bracken & Vale Plumbing) → Tessa Wren (Property Manager, Northbridge Lettings): “Says confirmation after 18:00 the previous evening is too late for scheduling and that they will try to accommodate the visit. Requests earlier confirmation for future bookings.”
- **E018** · 2025-09-10 10:51 · Tessa Wren (Property Manager, Northbridge Lettings) → Ivo Fenlock (Contractor, Bracken & Vale Plumbing): “Apologizes for the late notice. Says the contractor may move the visit if unable to attend and can collect keys from the agency office. Requests an update on the date chosen.”
- **E019** · 2025-09-15 10:03 · Ivo Fenlock (Contractor, Bracken & Vale Plumbing) → Tessa Wren (Property Manager, Northbridge Lettings): “An invoice describes a new mono kitchen sink tap supplied and installed. The invoice postcode differs from the property's recorded postcode, so it is queried.”
- **E020** · 2025-09-15 11:03 · Tessa Wren (Property Manager, Northbridge Lettings) → Ivo Fenlock (Contractor, Bracken & Vale Plumbing): “Requests a corrected invoice showing the property's recorded postcode and asks the contractor to check whether any other invoice details need correction.”
- **E021** · 2025-09-15 11:05 · Tessa Wren (Property Manager, Northbridge Lettings) → Ivo Fenlock (Contractor, Bracken & Vale Plumbing): “The contractor agrees to amend the postcode and resend the invoice. The conversation briefly turns to a separate boiler matter; the manager says they will check with the relevant engineer what work wa…”
- **E022** · 2025-09-15 11:11 · Ivo Fenlock (Contractor, Bracken & Vale Plumbing) → Tessa Wren (Property Manager, Northbridge Lettings): “The corrected invoice shows the property's recorded postcode and describes a new mono kitchen sink tap supplied and installed. The invoice is awaiting operator review.”
- **A1** · attachment attachments/corrected-plumbing-invoice.pdf

---

Generated by agent-c on 2026-10-10 15:42:01 UTC from `Property Management/025`. Full reasoning in REASONING.md, trace in trace.jsonl.
