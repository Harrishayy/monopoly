# Case 012: Lock Maintenance Request

**Next action:** Ask the tenant, Perrin Dall, whether Keypath attended and whether each window lock and key issue is now fixed, and reply to the 14 September management-key question

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Request information (`request_information`) | Perrin Dall (Tenant) | Email | 60% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 25 events (E001–E025), decision moment 2025-09-25 12:06.
- Attachments: none.

## Actions taken

1. **Ask the tenant, Perrin Dall, whether Keypath attended and whether each window lock and key issue is now fixed, and reply to the 14 September management-key question** (`tenant.ask`) → Perrin Dall (Tenant) via Email:

> Dear Perrin,
> 
> I'm sorry we didn't reply directly to your email of 14 September about using the management keys. We passed your request to our contractor, Keypath Repairs, that same day.
> 
> Keypath has told us by phone that they finished the window lock work on Friday 19 September. We have no visit record or report from them yet, so before we treat the job as finished we need you to confirm what happened. Could you please reply by Monday 29 September and tell us:
> 
> 1. Did anyone from Keypath Repairs come to the flat on or around 19 September? If so, roughly when, and were you in?
> 2. Does the bedroom sash window now lock?
> 3. Does the bathroom sash window now open, and do its locking buttons work?
> 4. Do you now have a working key for the kitchen sash window?
> 5. Is the mould you mentioned in the bathroom still there?
> 
> If anything is still not working, tell us which item and we will arrange for it to be dealt with. If at any point a window cannot be secured and you cannot lock up safely, please call the office straight away rather than waiting to reply.
> 
> I will contact you again on Monday 29 September if we haven't heard from you by then.
> 
> Kind regards,
> Ilyra Venn
> Property Manager, Northbridge Lettings

2. Same turn (`contractor.update`) → Edrin Moss (Keypath Repairs) via Email:

> Hi Edrin,
> 
> Thank you for the call today. You said you would send the invoice for the window lock work at Unit 2, 18 Brindlewick Mews later today. So that we can pass the job to the landlord as complete, please send the following with it:
> 
> 1. The date and time of the visit when the work was completed (you said Friday 19 September), and who attended.
> 2. How you got access. On 17 September you told us you had not collected management keys and had not found the tenant in.
> 3. What was done on each item: the bedroom sash lock, the bathroom sash that sticks and its locking buttons, and the missing key for the kitchen sash.
> 4. Completion photos.
> 5. The invoice as a PDF, showing the amount and whether VAT is included.
> 
> Please send these by Monday 29 September. We are also asking the tenant to confirm the work.
> 
> Kind regards,
> Ilyra Venn
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.wait for Keypath's invoice promised later today: An invoice does not show the work was done. The tenant's key question has gone unanswered for 11 days, and the window security problem is unconfirmed.
- landlord.update that the work is complete: The only basis is the contractor's word, and it conflicts with their earlier report that they could not get in (E022).
- case.escalate: The conflict can be settled through routine verification with the tenant and contractor. There is no complaint yet, and the tenant has not reported being unable to lock up.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The tenant confirms whether anyone attended and whether each item works. Combined with Keypath's visit record and invoice, this tells us whether to update the landlord and forward the invoice, or to get Keypath back to finish the work.

**Follow up by:** 2025-09-29

### Why

Keypath says the work was done on 19 September (E023, E025), but the only evidence is their word by phone. On 17 September they said they had tried three times, never found the tenant in and had not collected management keys (E022). The file has no appointment, attendance record or invoice (E024). Under the manual, when the only evidence is the contractor's word, we ask the tenant to confirm the fix. The tenant is also owed a reply: they asked about management keys on 14 September (E019) and have heard nothing from us since 11 September (E014). The invoice Keypath promised 'later today' (E025) is not due yet, so we should not chase it. Asking Keypath for its visit record is a new question, not a chase, so it can go in the same turn. The landlord should not be told the work is complete until there is evidence.

### Boundaries (what this does not prove or settle)

- The contractor saying the work is done does not prove it was done; nothing is confirmed until the tenant or a visit record confirms it.
- Asking does not promise a date for any further visit or for management-key access.
- The landlord is not told the work is complete, and no invoice is approved or forwarded, by this step.
- Mould is asked about only to record its current state; this step does not decide whether it is in scope or who pays.

### Remaining work

- Receive Keypath's invoice, due 'later today' on 25 September; check the amount and VAT basis before forwarding.
- Once completion is evidenced, update the landlord with what was done and the invoice; the landlord approved the work with no price or spending limit.
- If the tenant reports items not fixed, or no visit at all, take it up with Keypath and consider escalating.
- Take the bathroom mould to the landlord as a separate item if it is still present.
- Confirm where the management keys are before closing.

### Assumptions

- Email is the right channel for the tenant, as used throughout the case.
- 25 September 2025 is a Thursday, so Monday 29 September is two working days later.
- Keypath had the tenant's details through the job forwarding (E018, E020).

### Evidence

- **E001** · 2025-09-04 08:08 · Perrin Dall (Tenant, Northbridge Lettings) → Ilyra Venn (Property Manager, Northbridge Lettings): “Reports that the bathroom window will not open, the bedroom window opens but will not secure, and keys are missing.”
- **E006** · 2025-09-09 15:35 · Ilyra Venn (Property Manager, Northbridge Lettings) → Perrin Dall (Tenant, Northbridge Lettings): “Perrin clarifies that the issue is with opening-sash locks: the bedroom sash opens but will not lock; the bathroom sash is stuck and its locking buttons stick; and the kitchen sash works but has no ke…”
- **E014** · 2025-09-11 15:05 · Ilyra Venn (Property Manager, Northbridge Lettings) → Perrin Dall (Tenant, Northbridge Lettings): “Requests availability again for the new provider’s visit and notes that management keys may be used if Perrin is out.”
- **E017** · 2025-09-11 15:37 · Perrin Dall (Tenant, Northbridge Lettings) → Ilyra Venn (Property Manager, Northbridge Lettings): “Offers Thursday 18 September between 08:30 and 10:30 as a possible visit time. No confirmed appointment is recorded.”
- **E019** · 2025-09-14 04:57 · Perrin Dall (Tenant, Northbridge Lettings) → Ilyra Venn (Property Manager, Northbridge Lettings): “Asks whether management keys can be supplied because Perrin will be at work.”
- **E020** · 2025-09-14 04:58 · Ilyra Venn (Property Manager, Northbridge Lettings) → Edrin Moss (Contractor, Keypath Repairs): “Forwards Perrin’s request about management keys and asks Edrin to confirm a visit time.”
- **E022** · 2025-09-17 09:45 · Ilyra Venn (Property Manager, Northbridge Lettings) → Edrin Moss (Contractor, Keypath Repairs): “Edrin says they have tried the property three times but have not found Perrin in. Edrin says they have not collected management keys and cannot give a definite date for doing so. No dates or times for…”
- **E023** · 2025-09-22 10:07 · Ilyra Venn (Property Manager, Northbridge Lettings) → Edrin Moss (Contractor, Keypath Repairs): “Asked about availability, Edrin says the work was completed on Friday, 19 September, and that invoices are produced on Fridays. Ilyra says no invoice is visible. Edrin says they will check and send it…”
- **E024** · 2025-09-24 09:42 · Ilyra Venn (Property Manager, Northbridge Lettings) → Ilyra Venn (Property Manager, Northbridge Lettings): “Records Edrin’s verbal statement that the work was completed and that an invoice is expected on Friday. The file still contains no confirmed appointment, attendance record, or invoice.”
- **E025** · 2025-09-25 12:06 · Ilyra Venn (Property Manager, Northbridge Lettings) → Edrin Moss (Contractor, Keypath Repairs): “Ilyra follows up about the invoice. Edrin says the work is complete and promises to send the invoice later today. At the time of the call, no invoice, confirmed appointment, visit notes, or other atte…”
- **E003** · 2025-09-04 10:22 · Sella Marr (Landlord, Northbridge Lettings) → Ilyra Venn (Property Manager, Northbridge Lettings): “Authorises Northbridge Lettings to proceed with its own service provider for the lock work. No spending limit or detailed scope is stated.”
- **E015** · 2025-09-11 15:05 · Ilyra Venn (Property Manager, Northbridge Lettings) → Sella Marr (Landlord, Northbridge Lettings): “Advises Sella that the provider has changed and arrangements for a visit are underway.”

---

Generated by agent-c on 2026-10-10 15:39:15 UTC from `Property Management/012`. Full reasoning in REASONING.md, trace in trace.jsonl.
