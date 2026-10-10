# Reasoning: case 013

## 1. What the system received

- Folder: `Property Management/013` · track detected: **property**
- Case record sections: Case details (S:case-details), Initial request (S:initial-request)
- History: 24 events (E001–E024); decision moment 2025-09-10T10:10:00.000Z
- Attachments: A1 attachments/glazing-invoice.pdf (pdf)
- Withheld from the agent: nothing
- Ingest notes: none

## 2. Computed facts (code, no model)

```
As of: 2025-09-10T10:10:00.000Z · first event 2025-07-31T08:11:00.000Z · 24 events over 41.1 days
Channels seen: Email, Note, Call, Document, Update

Parties (sent / received · last message from them · unanswered requests to them since):
- Tamsin Rook (Property Manager, Northbridge Lettings): 20 / 0 · last from them E024 (0d before as-of)
- Tamsin Rook (Property Manager: 0 / 9 · never wrote · 3 unanswered request(s): E012, E014, E018
- Northbridge Lettings): 0 / 9 · never wrote · 3 unanswered request(s): E012, E014, E018
- Sella Vane (Contractor: 0 / 7 · never wrote · 3 unanswered request(s): E006, E017, E021
- Clearfirth Glazing): 0 / 7 · never wrote · 3 unanswered request(s): E006, E017, E021
- Orren Vale (Landlord): 1 / 5 · last from them E010 (30d before as-of) · 1 unanswered request(s): E011
- Elowen Marr (Tenant): 2 / 3 · last from them E014 (29.9d before as-of) · 1 unanswered request(s): E019
- Sella Vane (Contractor, Clearfirth Glazing): 1 / 0 · last from them E018 (16.8d before as-of)

Amounts:
- £150 (excl. VAT) [E009]
- £180 [E009]
- £180 [E010]
- £150 (excl. VAT) [E011]
- £180 [E012]
```

## 3. Situation (model reading)

**Task:** Establish with the contractor whether the glass has arrived, when fitting can happen, what invoice NBL-013-INV-09 covers and its amount, and whether the water and cold concern was assessed. Recommended next action: contractor.chase by email to Sella Vane (Clearfirth Glazing), with the draft in the openAsks entry, plus a tenant.update to Elowen Marr in the same turn.  
**Stage:** in_progress (Glass ordered and awaiting delivery and fitting; an invoice without an amount has been uploaded, but no visit is recorded)  
**Waiting on:** The contractor (Sella Vane, Clearfirth Glazing) is holding the next facts: glass delivery, a fitting date, whether any attendance has happened, the invoice amount and VAT basis, and the written quote. The agency is due to chase them now and to update the tenant by Friday 12 September 2025. The landlord is waiting on nothing from us yet, but has not been told about the delay or the invoice.

Tenant Elowen Marr reported misted kitchen glazing, water around the frame, a cold kitchen and damp concern, with pets at the property (E001, S:initial-request). The landlord, Orren Vale, approved the glass replacement only conditionally: he was happy if the total was £180 (E010). The agency relayed £150 plus VAT (E011), and the contractor, Clearfirth Glazing, ordered glass (E018). No visit has been booked or recorded, and on 2 September the contractor said the glass had not arrived and gave no delivery date (E021). On 10 September an invoice dated that day for "supply and fit 1 pane" was uploaded with no amount and no visit evidence (E023, A1), and the agency filed it to the record (E024). The next move is with the contractor, to confirm the glass and fitting dates, what the invoice covers and its amount, before anything is paid or the landlord is told it is complete.

**Parties**
- Elowen Marr: Tenant (occupier, with pets). Authority: Gives access and chooses visit times. Reports changes. Cannot approve spend. Has offered 24–26 August, which has passed (E014).
- Orren Vale: Landlord. Authority: Approves spend and scope. Gave a conditional yes on 11 August: happy if the total is £180 (E010). Did not reply to the explicit £150 plus VAT confirmation request (E011). Hard to reach by phone; was away in August (E009, E010).
- Tamsin Rook: Property Manager, Northbridge Lettings (agency). Authority: Seeks landlord approval, instructs and chases the contractor, updates the tenant and landlord, forwards invoices. Does not approve spend.
- Sella Vane: Contractor, Clearfirth Glazing. Authority: Quotes, attends, fits and invoices. Has given no written update since 24 August. Her only recorded written message is E018. Her price is not in the record as a written quote.

**Requests**
- Tamsin Rook (agency) → Sella Vane (Clearfirth Glazing): RECOMMENDED, NOT YET SENT (contractor.chase, email). Subject: Kitchen glazing, 8 Brackenmere Walk, ZZ1 1ZZ: delivery, fitting and invoice NBL-013-INV-09. Body: 'Hello Sella, following your call on 2 September, please reply in writing by Friday 12 September 2025 with: (1) the date the replacement glass arrived or is due, and the earliest date you can fit it; the tenant, Elowen Marr, wants to be present, so please propose dates and we will check them with her before you attend; (2) whether any visit or fitting has already taken place. Invoice NBL-013-INV-09, dated 10 September 2025, says "Supply and fit 1 pane of glass to the kitchen glazing", but we have no record of a visit, so please confirm whether the work is done or when it will be; please do not treat the invoice as payable yet; (3) the invoice amount excluding and including VAT, and whether Clearfirth Glazing is VAT-registered (the copy we hold shows no amount); (4) a copy of the written quote for £150 plus VAT that we relayed, and whether an inspection is needed for the water around the frame and the cold that the tenant reported. The landlord has approved replacing the misted glass at £150 plus VAT only. If we have no reply by Friday 12 September, we will call you.' Follow-up if no reply: phone on Monday 15 September 2025. — UNANSWERED (promised by Friday 12 September 2025 (proposed; not yet sent)) [E021, E023, A1, E009, E011, E010, E001]
- Tamsin Rook (agency) → Elowen Marr (Tenant): RECOMMENDED, NOT YET SENT (tenant.update, email, same turn as the contractor chase). Body: 'Hello Elowen, thank you for your patience. On 2 September the contractor told us the replacement glass had not arrived and could not give a delivery date. We have asked them today for a delivery date, fitting dates, and whether they need to look at the damp and cold you reported. We have not yet arranged a visit, and we will update you by Friday 12 September 2025. Until then, if the glass cracks, water spreads, or you see mould, please tell us the same day and keep clear of the affected area. Please also confirm the pets at the property so the contractor can plan the visit.' Do not mention the invoice. — UNANSWERED (promised by Friday 12 September 2025 (proposed)) [E019, E021, E001, E014]
- Tamsin Rook (agency) → Orren Vale (Landlord): Explicit confirmation of £150 plus VAT (= £180 total) to proceed. Sent 11 August; E012 records approval based on a conditional reply. — UNANSWERED [E011, E010, E012]
- Tamsin Rook (agency) → Sella Vane (Clearfirth Glazing): Inspection advice (is an inspection needed before pricing?) and a written price. No answer recorded. — UNANSWERED [E006, E007, E008]
- Tamsin Rook (agency) → Sella Vane (Clearfirth Glazing): Select an appointment from the tenant's 24–26 August dates, or propose an alternative. Not answered: E016 gave no time, E018 gave no attendance time. — UNANSWERED [E015, E016, E017, E018]
- Tamsin Rook (agency) → Sella Vane (Clearfirth Glazing): When the glass will arrive and when fitting is possible, so the tenant can be updated. E021 gives no delivery estimate and no appointment. — UNANSWERED (promised by No date given; contractor said she would update when the glass arrives (E021)) [E020, E021]

**Conflicts**
- Landlord approval. The internal note records the quote as approved (E012), but the landlord's only reply was conditional: happy if the total is £180 (E010). The agency's explicit request to confirm £150 plus VAT (E011) has no recorded reply. The landlord's approval covers only the glass at £150 plus VAT. [E012, E010, E011]
- Invoice against the record. The invoice dated 10 September 2025 is for supply and fitting of one pane (A1, E023). The record shows the glass had not arrived on 2 September (E021), and no visit or fitting has been recorded. The note on 9 September says 'awaiting post-visit documents' (E022), but no visit took place in the record. [A1, E023, E021, E022]
- Amount and VAT basis. The price was given as £150 excluding VAT (E009, E011) and as £180 (E009, E010, E012). The invoice shows no amount (A1). Whether the contractor is VAT-registered is not recorded, so the £180 total is not verified. [E009, E010, E011, E012, A1]
- Scope. The tenant reported damp, water around the frame and a cold kitchen (E001, S:initial-request). The landlord approved only glass replacement (E011). The record says no site assessment or diagnosis of the wider damp or cold concern was made (E005). [E001, S:initial-request, E005, E011]
- Price source. The agency says a contractor price was received (E008) and relays £150 plus VAT (E009), but no written contractor quote is in the case record, so the price cannot be traced to a source. [E008, E009]

**Missing**
- Date the replacement glass arrived or is due, and the earliest fitting date (from Sella Vane (contractor); must ask)
- Whether any visit, inspection or fitting has already happened, so that invoice NBL-013-INV-09 can be checked against the work (from Sella Vane (contractor); the agency's own call log for E016 and E021; must ask)
- Invoice amount, excluding and including VAT, and the contractor's VAT status (from Sella Vane (contractor); must ask)
- Written contractor quote behind the £150 plus VAT price (E009) (from Sella Vane (contractor); must ask)
- Whether the damp, water around the frame and cold concern were assessed or need an inspection (from Sella Vane (contractor) to assess; Orren Vale (landlord) to decide whether to widen scope and price; must ask)
- Explicit landlord confirmation of £150 plus VAT (= £180 total) (from Orren Vale (landlord); must ask)
- Tenant's current availability for a visit (24–26 August has passed) and whether pets have been told to the contractor (E013 asked for pet-related access information; no answer recorded) (from Elowen Marr (tenant); must ask)

**Failed actions**
- Contractor has been slow and largely silent. Only one written message is recorded (E018, 24 Aug). The 5 Aug follow-up (E007) and the 19 Aug and 27 Aug chases (E017, E020) had no written reply, and no appointment has been made in 41 days. [E006, E007, E017, E018, E020, E021]
- Tenant not updated since 24 August. The contractor's 2 September news that the glass had not arrived has not been passed on to the tenant. The agency's promise to be in touch on arrival (E019) has no date. [E019, E021]
- Landlord approval took 11 days, after several unsuccessful phone attempts (E003, E004, E009). The landlord's conditional reply was not confirmed in writing against the £150 plus VAT figure (E011). [E003, E004, E009, E010, E011]
- Tenant's visit dates (24–26 August) were passed to the contractor (E015) but not booked. The tenant was not told that no visit had been arranged. [E014, E015, E016, E019]
- Inspection question (E006) and the price's written source have no recorded answer. [E006, E008]

**Risks**
- medium other: The tenant's damp and cold concern has gone unassessed for about 6 weeks as winter approaches (E001, S:initial-request, E005). The approved scope covers glass only, so water around the frame and the damp concern may not be fixed by the work now approved. [S:initial-request, E001, E005, E011]
- medium money: The invoice may be billing work that has not been done. It is dated 10 September, shows no amount, and no visit or fitting is recorded. Paying or forwarding it to the landlord now would risk paying for work not done or for more than the £180 approved. [A1, E023, E021, E022, E012]
- low complaint: The tenant has had no update since 24 August, has been away and waiting, and has pets. A complaint about delay is likely if the tenant hears nothing soon. [E014, E019, E021]
- low safety: Misted glazing with water around the frame is not reported as a safety hazard. There is no report of a cracked or broken pane, damp spreading to electrics, or any injury. This does not need escalation now, but the tenant should report any change the same day. [E001, S:initial-request]
- low other: Landlord is unaware of the delay (E021) and the invoice (E023). Landlord is hard to reach by phone (E009), so the next update should be written. [E009, E021, E023]

**Treated as noise**
- E012: Internal note saying 'quote approved'. It rests on a conditional landlord reply and is not a landlord approval in writing for £150 plus VAT.
- E022: Internal note moving the case to 'awaiting post-visit documents'. No visit is recorded, so it is premature and does not show work has happened.
- E024: System update that the invoice was added to the record. It does not verify the invoice or the work.
- E005: Internal authority note. Useful only as evidence that no site assessment was made.
- S:case-details: Computed-facts parties list double-counts Tamsin Rook, Northbridge Lettings and Sella Vane, and lists internal notes (E012, E022) and the tenant's dates (E014) as unanswered requests. Treat those flags as mis-classifications, not real asks, except where the text shows an ask went unanswered.
- E019: Agency statement to the tenant, not a request. Counted as an open item only because the tenant has had no update since.

## 4. Independent proposals

| # | Action | Recipient | Channel | Confidence | Label |
|---|---|---|---|---|---|
| 1 | `chase` | Sella Vane, Clearfirth Glazing | Email | 72% | Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos |
| 2 | `chase` | Sella Vane, Clearfirth Glazing | Email | 72% | Ask Clearfirth Glazing to confirm whether the kitchen glass has been fitted, and to resend invoice NBL-013-INV-09 with the amount, VAT and completion photos |
| 3 | `chase` | Sella Vane, Clearfirth Glazing | Email | 72% | Ask Clearfirth Glazing whether the kitchen pane has been fitted, and for a complete invoice with the amount, the VAT basis and completion photos |

## 5. Checks and review

**Rule checks on the final candidate**
- major [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.

**Review 1: pass**
- minor: c1 [evidence] The message thanks the contractor for the invoice, but the record only shows Tamsin uploading it (E023). It doesn't show who sent it or when. (E023, E024, A1). Fix: Say 'the invoice copy on our file' instead of 'thank you for the invoice you sent'.
- minor: c2 [scope] The request for a note on 'anything at the frame that could explain the water' goes beyond the approved scope. The next step doesn't need it, and the wider damp concern is a separate decision for the landlord. (E005, E008). Fix: Drop that sentence, or keep only the request for before and after photos.
- minor: c3 [approval] The landlord's approval is conditional and loosely recorded. He said he was happy if £180 was the total (E010). He never replied to the £150 plus VAT request (E011). The system note calls it approved (E012). Stating 'approved £150 plus VAT (£180 total)' is reasonable but leans on this. (E010, E011, E012). Fix: No change needed. Keep the message as 'approved up to £180 in total', and check the invoice total against that figure before forwarding.
- minor: c4 [timing] The automatic no-early-chase flag is a false positive. It cites the proposal's own reply-by date, not a date the contractor promised. The contractor's last promise was an update when the glass arrived (E021). The new invoice is a new open point, not a repeat ask, so this chase is not premature. (E021, E023). Fix: Proceed. The phone follow-up on Monday 15 September is fine because it is after the stated reply-by date.

**Review 2 (after revision): pass**
- minor: c1 [communication] The contractor message asks her to note anything at the frame that could explain the tenant's water. That is not needed to settle the invoice or the completion evidence. It also drifts into the wider damp concern, which the plan itself treats as a separate scope decision. (E005, E023). Fix: Drop the frame-observation request from point 3, or keep it only as an optional line. Keep the ask for before and after photos.

Revised after review: yes

## Decision 1: Hand the case to a person with the context below

- **escalate_to_human** → Property manager (human review) via Internal escalation
- Citations: E010, E011, E012, E014, E019, E021, E022, E023, E024, A1, E001, S:initial-request
- Gate rule: rule-broken
- Agreement with independent proposals: 0% · confidence 50% · decided by gate
- Rationale: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.
- Alternatives considered:
  - chase: Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.
  - chase: Ask Clearfirth Glazing to confirm whether the kitchen glass has been fitted, and to resend invoice NBL-013-INV-09 with the amount, VAT and completion photos: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.
  - chase: Ask Clearfirth Glazing whether the kitchen pane has been fitted, and for a complete invoice with the amount, the VAT basis and completion photos: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.

## Handover

Summary: Tenant Elowen Marr reported misted kitchen glazing, water around the frame, a cold kitchen and damp concern, with pets at the property (E001, S:initial-request). The landlord, Orren Vale, approved the glass replacement only conditionally: he was happy if the total was £180 (E010). The agency relayed £150 plus VAT (E011), and the contractor, Clearfirth Glazing, ordered glass (E018). No visit has been booked or recorded, and on 2 September the contractor said the glass had not arrived and gave no delivery date (E021). On 10 September an invoice dated that day for "supply and fit 1 pane" was uploaded with no amount and no visit evidence (E023, A1), and the agency filed it to the record (E024). The next move is with the contractor, to confirm the glass and fitting dates, what the invoice covers and its amount, before anything is paid or the landlord is told it is complete.

Done so far:
- E016: 14 Aug: call with contractor, who is at a funeral; no attendance time agreed.
- E018: 24 Aug: contractor says glass ordered, awaiting arrival; no delivery or attendance estimate.
- E019: 24 Aug: tenant told glass ordered and the agency will be in touch when it arrives to arrange a date.
- E021: 2 Sep: call with contractor; glass still not arrived, no delivery estimate, no appointment; she will update when it arrives.
- E022: 9 Sep: note moves case to awaiting post-visit documents, although no visit or appointment is recorded.
- E023: 10 Sep: invoice uploaded, dated 10 Sep, 'Supply and fit 1 pane'; no amount shown (A1).

Why this needs a person: The proposed action breaks a rule that revision did not fix: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.

Options:
- Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos (chase → Sella Vane, Clearfirth Glazing). Risk: An uploaded invoice does not prove the pane was fitted.
- Ask Clearfirth Glazing to confirm whether the kitchen glass has been fitted, and to resend invoice NBL-013-INV-09 with the amount, VAT and completion photos (chase → Sella Vane, Clearfirth Glazing). Risk: An uploaded invoice does not prove the glass was fitted.
- Ask Clearfirth Glazing whether the kitchen pane has been fitted, and for a complete invoice with the amount, the VAT basis and completion photos (chase → Sella Vane, Clearfirth Glazing). Risk: An uploaded invoice is not evidence that the work was done.

Recommended: Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos

## Failures and fallbacks

- None.

## Model calls

| Stage | Model | OK | ms | In | Out | Cache read | Request |
|---|---|---|---|---|---|---|---|
| situate | claude-haiku-5-5 | yes | 92170 | 4 | 22669 | 51891 | claude-code |
| decide | claude-opus-5-5 | yes | 26797 | 2 | 2750 | 25625 | claude-code |
| decide | claude-opus-5-5 | yes | 27721 | 2 | 2946 | 23321 | claude-code |
| decide | claude-opus-5-5 | yes | 28639 | 2 | 3031 | 25625 | claude-code |
| review-1 | claude-sonnet-5-5 | yes | 13484 | 2 | 1583 | 24657 | claude-code |
| respond-1 | claude-opus-5-5 | yes | 23386 | 2 | 2858 | 25855 | claude-code |
| review-2 | claude-sonnet-5-5 | yes | 8189 | 2 | 908 | 22353 | claude-code |

Total time: 165.9 s

## 5. Checks and review dialogue

Models: read claude-haiku-5-5 · decide claude-opus-5-5 · review claude-sonnet-5-5

**Rule checks on the final candidate**
- major [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.

### Round 1 · reviewer claude-sonnet-5-5

**Automatic checks (blocking)**
- **h1** blocking · evidence: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.. Suggested fix: Change the plan so this automatic check passes.

**Review: approve**
- **c1** minor · evidence: The message thanks the contractor for the invoice, but the record only shows Tamsin uploading it (E023). It doesn't show who sent it or when. [E023, E024, A1]. Suggested fix: Say 'the invoice copy on our file' instead of 'thank you for the invoice you sent'.
- **c2** minor · scope: The request for a note on 'anything at the frame that could explain the water' goes beyond the approved scope. The next step doesn't need it, and the wider damp concern is a separate decision for the landlord. [E005, E008]. Suggested fix: Drop that sentence, or keep only the request for before and after photos.
- **c3** minor · approval: The landlord's approval is conditional and loosely recorded. He said he was happy if £180 was the total (E010). He never replied to the £150 plus VAT request (E011). The system note calls it approved (E012). Stating 'approved £150 plus VAT (£180 total)' is reasonable but leans on this. [E010, E011, E012]. Suggested fix: No change needed. Keep the message as 'approved up to £180 in total', and check the invoice total against that figure before forwarding.
- **c4** minor · timing: The automatic no-early-chase flag is a false positive. It cites the proposal's own reply-by date, not a date the contractor promised. The contractor's last promise was an update when the glass arrived (E021). The new invoice is a new open point, not a repeat ask, so this chase is not premature. [E021, E023]. Suggested fix: Proceed. The phone follow-up on Monday 15 September is fine because it is after the stated reply-by date.

**Agent’s answers**
- **h1** reject: The contractor never promised anything by Friday 12 September 2025. That date comes from our own colleague's draft, and the situation file marks it "(proposed; not yet sent)". It is the reply-by date we would set, not a date the contractor gave. Her only commitments on record have no date. On 24 August (E018) she said the glass was ordered, with no arrival or visit estimate. On 2 September (E021) she said she "could not estimate delivery because of supplier delays" and "would provide an update when it arrived". So there is no promised date that has not yet passed. This is also not a repeat chase sent too soon. Our last written ask was on 27 August (E020) and our last call was on 2 September (E021), 8 days before the decision moment. More importantly, a new fact has arrived. On 10 September an invoice for "Supply and fit 1 pane of glass" was uploaded with no amount (E023, A1), but the record shows no visit and, as of 2 September, no glass. Refinement 4 says a new open point is asked about now, not held back by the early-chase rule. Domain manual 0a.3 says to ask the sender for a readable invoice rather than rely on or forward one with no amount. Rule 0a.4 says to check an invoice against the approved figure before forwarding it. Waiting would leave an invoice that conflicts with the record and has no amount sitting on file. The plan is unchanged. [E018, E020, E021, E023, A1, E010, E011]

**Revised plan:** `contractor.chase` → Sella Vane, Clearfirth Glazing: Chase Clearfirth Glazing to confirm whether the kitchen pane has been fitted, and ask for invoice NBL-013-INV-09 again with the amount, VAT basis and completion photos

### Round 2 · reviewer claude-sonnet-5-5

**Automatic checks (blocking)**
- **h1** blocking · evidence: [no-early-chase] Sella Vane, Clearfirth Glazing said they would act by Friday 12 September 2025 (proposed; not yet sent), which has not arrived at the decision moment.. Suggested fix: Change the plan so this automatic check passes.

**Review: approve**
- **c1** minor · communication: The contractor message asks her to note anything at the frame that could explain the tenant's water. That is not needed to settle the invoice or the completion evidence. It also drifts into the wider damp concern, which the plan itself treats as a separate scope decision. [E005, E023]. Suggested fix: Drop the frame-observation request from point 3, or keep it only as an optional line. Keep the ask for before and after photos.

Revised after review: yes
