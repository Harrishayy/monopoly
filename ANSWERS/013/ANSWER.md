# Case 013: Kitchen glazing maintenance request

**Next action:** Hand the case to a person with the context below

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Property manager (human review) | Internal escalation | 50% | gate (rule-broken) |

## What the system received

- Case record: Case details, Initial request.
- History: 24 events (E001–E024), decision moment 2025-09-10 10:10.
- Attachments: A1 attachments/glazing-invoice.pdf (pdf).

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Property manager (human review) via Internal escalation (see Escalated).

No message to any outside party.

## Actions refused

- chase: Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.
- chase: Ask Clearfirth Glazing to confirm whether the kitchen glass has been fitted, and to resend invoice NBL-013-INV-09 with the amount, VAT and completion photos: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.
- chase: Ask Clearfirth Glazing whether the kitchen pane has been fitted, and for a complete invoice with the amount, the VAT basis and completion photos: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.
- The proposed action was overruled by a rule check: rule-broken.

## Escalated

Yes, to Property manager (human review).

> Summary: Tenant Elowen Marr reported misted kitchen glazing, water around the frame, a cold kitchen and damp concern, with pets at the property (E001, S:initial-request). The landlord, Orren Vale, approved the glass replacement only conditionally: he was happy if the total was £180 (E010). The agency relayed £150 plus VAT (E011), and the contractor, Clearfirth Glazing, ordered glass (E018). No visit has been booked or recorded, and on 2 September the contractor said the glass had not arrived and gave no delivery date (E021). On 10 September an invoice dated that day for "supply and fit 1 pane" was uploaded with no amount and no visit evidence (E023, A1), and the agency filed it to the record (E024). The next move is with the contractor, to confirm the glass and fitting dates, what the invoice covers and its amount, before anything is paid or the landlord is told it is complete.
> 
> Done so far:
> - E016: 14 Aug: call with contractor, who is at a funeral; no attendance time agreed.
> - E018: 24 Aug: contractor says glass ordered, awaiting arrival; no delivery or attendance estimate.
> - E019: 24 Aug: tenant told glass ordered and the agency will be in touch when it arrives to arrange a date.
> - E021: 2 Sep: call with contractor; glass still not arrived, no delivery estimate, no appointment; she will update when it arrives.
> - E022: 9 Sep: note moves case to awaiting post-visit documents, although no visit or appointment is recorded.
> - E023: 10 Sep: invoice uploaded, dated 10 Sep, 'Supply and fit 1 pane'; no amount shown (A1).
> 
> Why this needs a person: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.
> 
> Options:
> - Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos (chase → Sella Vane, Clearfirth Glazing). Risk: An uploaded invoice does not prove the pane was fitted.
> - Ask Clearfirth Glazing to confirm whether the kitchen glass has been fitted, and to resend invoice NBL-013-INV-09 with the amount, VAT and completion photos (chase → Sella Vane, Clearfirth Glazing). Risk: An uploaded invoice does not prove the glass was fitted.
> - Ask Clearfirth Glazing whether the kitchen pane has been fitted, and for a complete invoice with the amount, the VAT basis and completion photos (chase → Sella Vane, Clearfirth Glazing). Risk: An uploaded invoice is not evidence that the work was done.
> 
> Recommended: Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos

## What failed

- Nothing failed.

## Final result

A person decides the next step with the full context and does not need to re-read the case.

### Why

The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.

### Boundaries (what this does not prove or settle)

- No action has been taken with any external party.
- The options listed are proposals, not decisions.

### Remaining work

- Once completion is evidenced and the invoice is checked against £180, update the landlord with the invoice and how it will be paid.
- If the invoice is above £180 or VAT is charged differently, take the difference to the landlord before paying.
- If water at the frame or damp continues after the glass is replaced, raise it with the landlord as a separate scope decision.
- Close the case once the tenant confirms the fix, the landlord has been told and the invoice is settled.
- If fitting is confirmed and the tenant says it is fixed: check the invoice amount against £150 plus VAT, then tell the landlord with the invoice and how it will be paid.
- If the invoice is higher than approved: take the difference to the landlord before paying anything.

### Evidence

- **E010** · 2025-08-11 11:05 · Orren Vale (Landlord) → Tamsin Rook (Property Manager, Northbridge Lettings): “Said he had been away and was catching up on email. Wrote that he was happy to use the contractor if £180 was the total value of the quote.”
- **E011** · 2025-08-11 11:17 · Tamsin Rook (Property Manager, Northbridge Lettings) → Orren Vale (Landlord): “Sent a quote approval request describing the work as supplying and fitting glass to the kitchen glazing because it was misted. Stated the price as £150 plus VAT and asked the landlord to confirm befor…”
- **E012** · 2025-08-11 11:19 · Tamsin Rook (Property Manager, Northbridge Lettings) → Tamsin Rook (Property Manager, Northbridge Lettings): “Recorded the quote as approved and moved to arranging attendance. The record also contains the landlord's earlier conditional reply referring to £180 as the total.”
- **E014** · 2025-08-11 11:49 · Elowen Marr (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Said she was away for two weeks and wanted to be present for the visit. Offered any time on 24, 25 or 26 August. Did not provide a further update on the damp or cold concern.”
- **E019** · 2025-08-24 15:54 · Tamsin Rook (Property Manager, Northbridge Lettings) → Elowen Marr (Tenant): “Advised that the glass had been ordered and Northbridge Lettings would be in touch when it arrived to arrange a date.”
- **E021** · 2025-09-02 10:18 · Tamsin Rook (Property Manager, Northbridge Lettings) → Sella Vane (Contractor, Clearfirth Glazing): “The contractor said the ordered glass had still not arrived and that she could not estimate delivery because of supplier delays. She said she would provide an update when it arrived. No appointment wa…”
- **E022** · 2025-09-09 09:53 · Tamsin Rook (Property Manager, Northbridge Lettings) → Tamsin Rook (Property Manager, Northbridge Lettings): “Moved the case to awaiting post-visit documents without sending messages. The record available at that time contains no appointment confirmation or visit report.”
- **E023** · 2025-09-10 09:55 · Tamsin Rook (Property Manager, Northbridge Lettings) → Tamsin Rook (Property Manager, Northbridge Lettings): “Uploaded an invoice stating: “Supply and fit 1 pane of glass to the kitchen glazing.” The invoice copy in the case does not show an amount.”
- **E024** · 2025-09-10 10:10 · Tamsin Rook (Property Manager, Northbridge Lettings) → Tamsin Rook (Property Manager, Northbridge Lettings): “The invoice was added to the maintenance record.”
- **A1** · attachment attachments/glazing-invoice.pdf
- **E001** · 2025-07-31 08:11 · Elowen Marr (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Reported moisture between the kitchen glazing panes, water gathering around the frame, a cold kitchen and concern about damp, especially in winter. Confirmed the sash opens, closes and locks; pets are…”
- **S:initial-request** · Initial request: “The kitchen glazing has been misted between the panes for some time. Water gathers around the frame, the kitchen feels very cold, and I am concerned about damp, particularly in winter. The sash opens,…”

---

Generated by agent-c on 2026-10-10 15:39:15 UTC from `Property Management/013`. Full reasoning in REASONING.md, trace in trace.jsonl.
