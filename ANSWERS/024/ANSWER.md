# Case 024: End-of-occupancy property service request

**Next action:** Hand to the property manager: work reported done on 23 Sep with no landlord approval of the £180 + VAT quote, a deposit decision still open and removal missing from the quoted scope

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Elowen Pryce (Property Manager, Northbridge Lettings) | Portal (internal case note) | 62% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 21 events (E001–E021), decision moment 2025-09-24 16:11.
- Attachments: A1 attachments/checkout-report.pdf (pdf), A2 attachments/property-service-quotation.pdf (pdf).

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Elowen Pryce (Property Manager, Northbridge Lettings) via Portal (internal case note) (see Escalated).

2. Same turn (`contractor.chase`) → Perrin Holt (Larkspan Property Care) via Email:

> Hi Perrin,
> 
> We understand there may have been an attendance at 7 Brackenmere Walk, Vellumford on 23 September for the end-of-occupancy service (your quote NBL-024-Q1, £180 + VAT). Could you please confirm in writing by 12:00 on Thursday 25 September:
> 1. whether you attended, on what date, and what work was carried out;
> 2. whether you removed the items in the kitchen drawers, garden storage box, kitchen bins and cellar (vacuum, sweeping brush, dustpan, mop and toilet brush), as these are not listed in your quote;
> 3. completion photographs, as mentioned in your quote;
> 4. your invoice as a PDF, if the work is finished;
> 5. where the property keys are now.
> 
> Please note that this is a request for information only. It does not approve any amount, and no further work should be carried out until we confirm it in writing.
> 
> Kind regards,
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- landlord.update telling Sella the work is complete: There is no completion evidence, the quote is unapproved and the deposit decision is open. It would present unapproved spend as settled.
- landlord.chase for the quote decision: The work is reportedly already done. Asking for prospective approval would mislead her, and the scope gap and deposit question need a person's decision first.
- contractor.chase as the main action: It's sent as a secondary message, but on its own it doesn't settle the authorisation and deposit decisions that are blocking progress.

## Escalated

Yes, to Elowen Pryce (Property Manager, Northbridge Lettings).

**Why a person is needed:** Authorising spend without landlord approval, the deposit or recharge decision, and how to present this to the landlord all need a person's authority.

**Summary:** An internal note says the end-of-occupancy clear-out and service at the vacant 7 Brackenmere Walk was done on 23 Sep. The landlord never approved the £180 + VAT (£216) quote, there is no completion evidence, a deposit decision is pending, and the quote leaves out removal of the items listed in the checkout report.

**Done so far:**
- Quote requested and received (E003, E011)
- Landlord asked to approve on 18 Sep (E018), reminded on 21 Sep (E019), no reply
- Internal note reports work done (E020)
- Larkspan asked for completion details, photos, confirmation of whether removal was included, a PDF invoice and the key location (this turn)

**Options:**
- Ask the landlord for retrospective approval once evidence arrives, setting out the removal gap and the VAT basis. Risk: She may refuse, leaving the agency to cover the cost
- Treat it as an agency error and absorb or negotiate the cost. Risk: A cost to the agency, and the landlord relationship needs to be handled with care
- Recharge the outgoing tenant through the deposit claim. Risk: Needs evidence and a deposit decision. It may be disputed.

**Recommended:** Wait for Larkspan's evidence, confirm who authorised the attendance, then write to Sella openly with the photos, the price and the removal gap, and ask for her decision. Settle the deposit claim alongside this.

## What failed

- Nothing failed.

## Final result

The property manager decides on authorisation, the deposit or recharge and how to approach the landlord. Larkspan sends written completion details, photos, confirmation of whether removal was included, and an invoice.

**Follow up by:** 2025-09-25

### Why

The normal next step here would be to tell the landlord the work is done (landlord.update) or to chase her approval. Neither is safe. The work is reported done (E020), but the £180 + VAT quote was never approved (E017–E019, E021). That is unapproved spend. On top of that, a deposit or recharge decision is open (E015), the facts conflict (the approval flag in E002 has nothing behind it, and there is no completion evidence), and the quote leaves out removal, which the checkout report asks for (A1 vs A2). The manual lists unapproved spend, deposit or recharge decisions and conflicting facts as reasons to escalate. Following refinement 6, the routine evidence request goes to the contractor in the same turn, so the handover only covers the decisions a person has to make.

### Boundaries (what this does not prove or settle)

- The internal note is not evidence of completion. Nothing confirms the work was done.
- Asking Larkspan for an invoice does not approve or accept any amount.
- The landlord has not approved the quote. The E002 flag is not approval.
- This does not decide who pays or anything about the deposit claim.
- Removal of the listed items is not confirmed as done or included in the price.

### Remaining work

- Get Larkspan's completion confirmation, photos and PDF invoice, and check them against the quoted £180 + VAT.
- Property manager decides authorisation and the deposit or recharge question.
- Tell the landlord accurately, with evidence and with the scope gap set out, or ask her for retrospective approval.
- Confirm where the keys are before closing.
- Close only once evidence, landlord notification and invoice handling are all settled.

### Assumptions

- E020 was written by agency staff and may be based on what Larkspan said rather than a check of the property.
- Larkspan was the party who attended, if anyone did.

### Evidence

- **S:initial-request** · Initial request: “Please obtain a quote for removing the remaining items from the kitchen drawers, garden storage box, kitchen bins and cellar, followed by a final property-preparation service at the vacant home.”
- **A1** · attachment attachments/checkout-report.pdf
- **A2** · attachment attachments/property-service-quotation.pdf
- **E002** · 2025-09-04 09:18 · Elowen Pryce (Property Manager, Northbridge Lettings) → Tavin Moor (Maintenance Coordinator, Northbridge Lettings): “The move-out record is marked as landlord approval already obtained. No landlord approval message or supporting approval document is present in this request.”
- **E005** · 2025-09-04 10:30 · Northbridge Lettings workflow (System) → Elowen Pryce (Property Manager, Northbridge Lettings): “The service category is recorded as General Property Service and the request has moved to quote collection. The workflow record retains the move-out approval flag.”
- **E010** · 2025-09-09 11:53 · Elowen Pryce (Property Manager, Northbridge Lettings) → Perrin Holt (Contractor, Larkspan Property Care): “A brief call is logged. The call record mentions sending a message to confirm engagement, but does not establish the agreed scope, timing, price, or whether removal of the listed items was discussed.”
- **E011** · 2025-09-09 21:23 · Perrin Holt (Contractor, Larkspan Property Care) → Elowen Pryce (Property Manager, Northbridge Lettings): “Quoted £180 plus VAT for an end-of-occupancy service. Listed internal windows and frames, white goods, kitchen units, bathroom treatment, carpets vacuumed and deodorised, hard floors swept and mopped,…”
- **E015** · 2025-09-10 11:18 · Elowen Pryce (Property Manager, Northbridge Lettings) → Tavin Moor (Maintenance Coordinator, Northbridge Lettings): “Internal note says the deposit claim is awaiting a decision before work proceeds. No landlord response to the contractor's quote is recorded.”
- **E017** · 2025-09-18 14:20 · Northbridge Lettings workflow (System) → Elowen Pryce (Property Manager, Northbridge Lettings): “The quote is recorded as £180 plus VAT. The workflow's threshold calculation records £216 including VAT, above its £100 approval threshold. The request has moved to landlord quote approval.”
- **E018** · 2025-09-18 14:21 · Elowen Pryce (Property Manager, Northbridge Lettings) → Sella Voss (Landlord, Northbridge Lettings client): “Requested approval or rejection of the £180 plus VAT quote. The email presents the original request alongside the contractor's task list. It says arrangements will be made after approval.”
- **E019** · 2025-09-21 14:21 · Elowen Pryce (Property Manager, Northbridge Lettings) → Sella Voss (Landlord, Northbridge Lettings client): “Sent a reminder requesting a decision on the £180 plus VAT quote. No landlord response is recorded in the communications history.”
- **E020** · 2025-09-23 16:11 · Elowen Pryce (Property Manager, Northbridge Lettings) → Tavin Moor (Maintenance Coordinator, Northbridge Lettings): “Internal note reads: “clear-out and property service was done today; check to make sure all finished then let Sella know.” The landlord-approval workflow is still open.”
- **E021** · 2025-09-24 16:11 · Northbridge Lettings workflow (System) → Elowen Pryce (Property Manager, Northbridge Lettings): “The request remains at landlord quote approval. The internal note reporting work done is on file.”

---

Generated by agent-c on 2026-10-10 15:41:50 UTC from `Property Management/024`. Full reasoning in REASONING.md, trace in trace.jsonl.
