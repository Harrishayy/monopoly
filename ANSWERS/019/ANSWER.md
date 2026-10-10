# Case 019: Move-out maintenance at 18 Brindle Row

**Next action:** Pass the £174 Alder & Finch invoice, and the unrecorded entry to the empty property, to a person with authority over spend and keys. Ask the contractor for the missing evidence in the same turn.

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Northbridge Lettings lettings/operations manager (escalation owner for 18 Brindle Row) | Internal escalation note | 60% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 16 events (E001–E016), decision moment 2025-09-11 06:58.
- Attachments: A1 attachments/remedial-works-invoice.pdf (pdf).

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Northbridge Lettings lettings/operations manager (escalation owner for 18 Brindle Row) via Internal escalation note (see Escalated).

2. Same turn (`contractor.chase`) → Rowan Pike, Alder & Finch Repairs via Email:

> Dear Rowan,
> 
> Re: 18 Brindle Row, Larkspur Vale. Invoice NBL-019-INV-11, £174.00
> 
> Thank you for sending the invoice. Our email of 7 September asked for a quotation only and said no work should start until we had issued written authority, so we cannot process the invoice yet. Please send us the following by the end of Friday 12 September:
> 
> 1. The date and time you attended, how you got into the property, who gave you the keys, and where those keys are now.
> 2. An itemised price for each of the six items, with the VAT basis (whether VAT applies and at what rate).
> 3. Completion photos of each item, in particular the floorboard and carpet, the new Venetian blind and the front-gate hinge.
> 4. A short written account of the instruction you understood you had received, and why the lounge blind was replaced rather than repaired.
> 
> If any keys for the property are still with you, please return them to our office straight away. Please send documents as PDF or image attachments.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- landlord.update forwarding the invoice as completed works: There is no completion evidence, the scope changed without approval, and the work breached our instruction. Forwarding it would present unapproved spend as agreed.
- contractor.chase alone: This gets the evidence but leaves the key-control breach and the invoice decision without an owner. Those need a person, so the chase goes in alsoSend.
- case.wait: The invoice is here and the earlier instruction to wait is out of date. Nothing has been promised that we are waiting for.

## Escalated

Yes, to Northbridge Lettings lettings/operations manager (escalation owner for 18 Brindle Row).

**Why a person is needed:** The work breached our written instruction. Entry to the vacant property is unexplained and agency keys may have been used. The scope grew without approval and the price was never agreed. Accepting or disputing the invoice and reviewing key control need someone with authority over spend and keys.

**Summary:** Alder & Finch Repairs completed six move-out items at the vacant 18 Brindle Row on 9 Sep (by their own account). Our written instruction had been to quote only and wait for written authority. Their £174.00 lump-sum invoice has no itemisation, VAT basis or photos, and covers more than the inspection asked for: a new Venetian blind, plus carpet reinstatement with the floorboard. No access arrangement is recorded, and the agency held the keys. The landlord approved "remedial works" in general but has not seen a price and has not been told the work is done.

**Done so far:**
- E004: landlord asked for approval, with no estimate
- E005: landlord approved remedial works, with no limit
- E008: contractor asked for a quote only, no work without written authority
- E010: chase sent, with the former tenant's number included
- E013: call; the contractor said the work was done on 9 Sep
- E014/E016/A1: invoice received, £174.00
- This turn: emailed the contractor for access details, keys, itemised price and VAT, photos and his account, reply by 12 Sep

**Options:**
- Hold payment and get the contractor's evidence, then send the landlord the itemised invoice and ask whether he accepts it, including the blind replacement and carpet. Risk: This takes a few days. The contractor may push for payment.
- Accept the invoice under the landlord's general approval and forward it to him for payment. Risk: It treats an unapproved price and scope as agreed, with no proof of completion. The landlord may object later.
- Dispute the invoice with the contractor because of the breached instruction. Risk: The landlord may in fact want the work kept. It could damage the contractor relationship before the facts are known.

**Recommended:** Hold payment, check the key log today, wait for the contractor's itemised breakdown and photos, then send the landlord a factual update and ask for his decision on the extra scope. Make no recharge to the former tenant without check-in and check-out evidence.

## What failed

- Nothing failed.

## Final result

The escalation owner holds payment, checks the key log and decides how to handle the invoice. The contractor sends an itemised breakdown, photos and an account of access by 12 Sep, so the landlord can then be told accurately.

**Follow up by:** 2025-09-12

### Why

There is no doubt about who owes the next move. The contractor did the work against our written "quote only, no work without written authority" instruction (E008, E013). He entered a vacant property with no access arrangement recorded, while the agency held the keys (E003, E007, E015). His £174 lump-sum invoice has no itemisation, no VAT basis and no completion evidence, and it includes scope beyond the inspection list: a new Venetian blind and carpet reinstatement (S:initial-request, E016, A1). Key control, unauthorised entry, a breached instruction and changed scope are all escalation triggers, and the decision to accept or dispute the invoice needs authority I don't have. The landlord's broad approval (E005) might cover the cost, but he never saw a price or the scope changes. The routine evidence request goes to the contractor now in alsoSend, so the person who picks this up has it to hand.

### Boundaries (what this does not prove or settle)

- The invoice does not prove the work was done or done to standard; there are no photos or completion report.
- The landlord's general approval of "remedial works" was not approval of a £174 price or of replacing the blind and reinstating carpet.
- This escalation does not accept, pay or dispute the invoice.
- Nothing here establishes that the former tenant is liable for any item or should be recharged.
- How the contractor got access is not established.

### Remaining work

- Get the contractor's itemised breakdown, VAT basis, photos and account of access.
- Check the agency key log and confirm the keys are back.
- Update the landlord with the evidence and invoice, and get his decision on the blind replacement and carpet.
- Decide invoice payment and the route for paying it.
- Act on the former tenant's request to update the records (E003), and review the disclosure of his phone number (E010).
- Close only once the evidence is in, the landlord has been told and the invoice is settled.

### Assumptions

- Maya Chen cannot approve spend or decide key-control matters herself.
- The completion date of 9 Sep comes only from the contractor's call (E013).
- No VAT basis can be inferred from the £174.00 lump sum.

### Evidence

- **S:initial-request** · Initial request: “Move-out inspection identified six maintenance items: a cracked section of chipboard flooring beside the fireplace; a living-room front-window blind needing repair; a loose under-stairs cupboard handl…”
- **E003** · 2025-09-04 13:51 · Tomas Venn (Former Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Said he had vacated on 27 August and returned the keys that day. He could not provide access and asked that records be updated and arrangements made with the appropriate person.”
- **E005** · 2025-09-07 09:44 · Ivo Marlow (Landlord) → Maya Chen (Property Manager, Northbridge Lettings): “Replied, “Yes, I am happy for you to proceed with the remedial works.” No price limit, item-by-item instructions, or other conditions were stated.”
- **E007** · 2025-09-07 10:51 · Maya Chen (Property Manager, Northbridge Lettings) → Maya Chen (Property Manager, Northbridge Lettings): “Selected Alder & Finch Repairs to provide a quotation and asked the provider for availability and key-access requirements for an inspection. The note records that no work was to begin until the quote …”
- **E008** · 2025-09-07 10:53 · Maya Chen (Property Manager, Northbridge Lettings) → Rowan Pike (Contractor, Alder & Finch Repairs): “Sent the six-item description and requested a quotation only. The email expressly said not to carry out any work until Northbridge Lettings reviewed the price and issued written authority. It asked fo…”
- **E009** · 2025-09-07 10:53 · Maya Chen (Property Manager, Northbridge Lettings) → Ivo Marlow (Landlord): “Advised that scheduling was underway and that a convenient time was being agreed with the tenant and provider.”
- **E010** · 2025-09-08 10:51 · Maya Chen (Property Manager, Northbridge Lettings) → Rowan Pike (Contractor, Alder & Finch Repairs): “Chased for availability and access details. The reminder included a tenant contact number, although the tenant had already said he had vacated and was not arranging access.”
- **E012** · 2025-09-10 11:57 · Maya Chen (Property Manager, Northbridge Lettings) → Maya Chen (Property Manager, Northbridge Lettings): “Recorded an instruction to wait for the provider's response rather than send another reminder. The note referred to awaiting an invoice, although no invoice had yet been received.”
- **E013** · 2025-09-10 12:00 · Maya Chen (Property Manager, Northbridge Lettings) → Rowan Pike (Contractor, Alder & Finch Repairs): “Maya called about a quotation. Rowan said he had not realised a quote was needed and thought the instruction was to carry out the work; he said he had completed it the previous day. Maya asked him to …”
- **E014** · 2025-09-11 06:57 · Rowan Pike (Contractor, Alder & Finch Repairs) → Maya Chen (Property Manager, Northbridge Lettings): “Forwarded an invoice from Alder & Finch Repairs for the property, without accompanying explanatory message.”
- **E015** · 2025-09-11 06:57 · Maya Chen (Property Manager, Northbridge Lettings) → Maya Chen (Property Manager, Northbridge Lettings): “Invoice recorded at £174. The case had no appointment details, visit narrative, or separate completion evidence.”
- **E016** · 2025-09-11 06:58 · Rowan Pike (Contractor, Alder & Finch Repairs) → Maya Chen (Property Manager, Northbridge Lettings): “Invoice description lists replacing the broken lounge floorboard and reinstating carpet; removing the front lounge blind and supplying and installing a new Venetian blind; refixing the cupboard handle…”
- **A1** · attachment attachments/remedial-works-invoice.pdf

---

Generated by agent-c on 2026-10-10 15:40:26 UTC from `Property Management/019`. Full reasoning in REASONING.md, trace in trace.jsonl.
