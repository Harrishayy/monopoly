# Reasoning: case 019

## 1. What the system received

- Folder: `Property Management/019` · track detected: **property**
- Case record sections: Case details (S:case-details), Initial request (S:initial-request)
- History: 16 events (E001–E016); decision moment 2025-09-11T06:58:16.000Z
- Attachments: A1 attachments/remedial-works-invoice.pdf (pdf)
- Withheld from the agent: nothing
- Ingest notes: none

## 2. Computed facts (code, no model)

```
As of: 2025-09-11T06:58:16.000Z · first event 2025-09-04T13:25:54.000Z · 16 events over 6.7 days
Channels seen: Note, Email, Call, Document

Parties (sent / received · last message from them · unanswered requests to them since):
- Maya Chen (Property Manager, Northbridge Lettings): 12 / 0 · last from them E015 (0d before as-of)
- Maya Chen (Property Manager: 0 / 11 · never wrote · 6 unanswered request(s): E003, E004, E006, E007, E011, E016
- Northbridge Lettings): 0 / 11 · never wrote · 6 unanswered request(s): E003, E004, E006, E007, E011, E016
- Rowan Pike (Contractor, Alder & Finch Repairs): 2 / 3 · last from them E016 (0d before as-of)
- Tomas Venn (Former Tenant): 1 / 1 · last from them E003 (6.7d before as-of)
- Ivo Marlow (Landlord): 1 / 1 · last from them E005 (3.9d before as-of)

Amounts:
- £174 [E015]
- £174.00 [A1]
```

## 3. Situation (model reading)

**Task:** Decide how to handle the £174 invoice for work started without a quote or written authority, including the unrecorded entry and the scope change, before anyone pays, forwards or disputes it.  
**Stage:** billing (Invoice received for work done without a quote or written authority; decision needed)  
**Waiting on:** Waiting on the agency's own escalation owner (a person with authority over spend, key use and any tenant recharge; not named in the records) to decide the invoice and the access question. Hold payment and do not present the invoice to the landlord as approved. Routine facts can go out meanwhile: to Rowan Pike (Alder & Finch Repairs), ask for the attendance date and time, who gave access and how, an itemised price with VAT basis, completion photos and his written explanation of the instruction he received. Ivo Marlow (landlord) should hear about the completed works, the blind replacement and the £174 from the agency, once the escalation owner has reviewed them. Tomas Venn (former tenant) has no open ask to the agency that has been answered.

Move-out remedial job at 18 Brindle Row, after the former tenant left on 27 August and returned his keys. On 7 September the landlord approved "the remedial works" with no price limit, but the agency had told the contractor in writing to quote only and not start without written authority. The contractor says he misread this, completed the work on 9 September, and has no recorded access arrangement, quote, or agreed scope. His £174 invoice arrived on 11 September with no explanation or completion evidence, includes a replacement blind and carpet reinstatement beyond the listed repairs, and the landlord has not been told about the work or the invoice.

**Parties**
- Maya Chen: Property Manager, Northbridge Lettings (agency handler; author of all notes). Authority: Can request quotes, instruct the contractor within the landlord's approval, chase, and relay to the landlord. Cannot approve spend beyond the landlord's approval or decide a recharge.
- Ivo Marlow: Landlord. Authority: Approves spend and scope for the property. Has approved 'remedial works' generally, with no price limit or item instructions (E005). No recorded decision on the invoice.
- Rowan Pike: Contractor, Alder & Finch Repairs. Authority: Quotes and does work only on written authority from the agency. Invoices the agency. Says he thought the instruction was to carry out the work (E013).
- Tomas Venn: Former tenant (vacated 27 Aug; returned keys). Authority: Gives or refuses access to a property he has left. Cannot approve works. Has asked for records to be updated (E003). Personal data about him should not go beyond need.
- Agency escalation owner (unnamed): Agency supervisor or operations manager who must decide the case. Authority: Decides invoice acceptance or dispute, key-use review, scope questions for the landlord, and any tenant recharge route. Not identified in the records.

**Requests**
- Maya Chen (agency) → Rowan Pike (contractor): Send a quotation only, offer two or three inspection windows and confirm access requirements (E008); no work until written authority. — UNANSWERED [E008, E010, E013]
- Maya Chen (agency) → Rowan Pike (contractor): Chase for availability and access details (E010). Chase included a tenant phone number despite the tenant saying he had vacated. — UNANSWERED [E010]
- Rowan Pike (contractor) → Maya Chen (agency): Send the invoice with paperwork that evening (E013). Invoice arrived next morning with no explanatory message and no separate completion evidence (E014, E015). — UNANSWERED (promised by 2025-09-10 (evening)) [E013, E014, E015]
- Tomas Venn (former tenant) → Maya Chen (agency): Arrange access with the appropriate person and update the records (E003). No record that the records were updated or that access was arranged with him. — UNANSWERED [E003]
- Maya Chen (agency) → Ivo Marlow (landlord): Approve the remedial works (E004). — answered [E004, E005]

**Conflicts**
- Landlord approval for 'remedial works' with no price limit (E005) versus the agency's written instruction to the contractor to quote only and not start without written authority (E008). The contractor reads it as 'carry out the work' (E013). No written authority to start is recorded. [E005, E006, E008, E013]
- The initial request lists repairs: a blind 'needing repair' and a cracked section of flooring (S:initial-request). The invoice bills removing the blind and supplying and installing a new Venetian blind, and replacing the floorboard with carpet reinstated (E016, A1). Scope has grown beyond the request and nobody approved it. [S:initial-request, E016, A1]
- Tenant says he vacated on 27 Aug and returned the keys (E003). The agency told him it would agree access while he was still there (E002), and it holds its own key set (E007). The contractor attended on 9 Sep with no access arrangement recorded (E013, E015). [E002, E003, E007, E013, E015]
- The tenant had said he was not arranging access (E003), yet the 8 Sep chase to the contractor included his phone number (E010). The 10 Sep note says the provider was to 'await an invoice' although none had arrived (E012). [E003, E010, E012]
- The 7 Sep note to the landlord says a convenient time was being agreed with the tenant and provider (E009). The record shows the tenant had left and declined access (E003), and the contractor had already worked on 9 Sep (E013). [E003, E009, E013]

**Missing**
- Attendance date and time, who gave access, how (which keys, whether returned), and any sign-in record (from Rowan Pike (contractor); agency key log and staff who released keys; must ask)
- Itemised price and VAT basis for the £174 (the invoice gives one lump sum with no VAT split) (from Rowan Pike (contractor); must ask)
- Contractor's written account of the instruction he received and why he started work without written authority (from Rowan Pike (contractor); must ask)
- Completion photos or a completion report for each item, including the gate hinge and blind (from Rowan Pike (contractor); must ask)
- Landlord's view on the blind replacement and carpet reinstatement, and on paying the invoice (from Ivo Marlow (landlord); must ask)
- Check-in condition and check-out inventory showing whether any item was damaged before the tenancy or by the tenant (from Agency inspection and check-in records (not in the case); must ask)
- Whether any cost is to be recharged to the former tenant, and on what terms (from Agency escalation owner, under the tenancy terms and deposit records; must ask)
- Whether the tenant's records update request (E003) was actioned (from Agency staff (Maya Chen); must ask)

**Failed actions**
- The agency's written instruction not to start work without written authority (E008) was not followed; the contractor completed the works on 9 Sep (E013). [E008, E013]
- No access arrangement is recorded. The agency's promise to agree access with the tenant (E002) was overtaken by his notice that he had left (E003), and the contractor entered with no record of how. [E002, E003, E013, E015]
- The tenant's phone number was sent to the contractor in the 8 Sep chase (E010) although the tenant had said he had vacated and was not arranging access (E003). This is an unnecessary disclosure of personal data. [E003, E010]
- Quotation requested (E008) was never received; the invoice replaces it (E014, E016). The inspection windows and access requirements asked for were not provided (E013). [E008, E013, E016]
- Case recorded as escalated on 10 Sep (E011) and an instruction to wait recorded (E012), but the wait was based on an invoice that had not arrived. The 10 Sep call (E013) overtook it, so that instruction is stale. [E011, E012, E013]
- The tenant's request that records be updated (E003) has no recorded response or action. [E003]

**Risks**
- high money: £174 invoice for work started without a quote or written authority. It has no itemised prices or VAT split, and includes a blind replacement and carpet reinstatement beyond the listed repairs. Paying or forwarding it as approved would treat an unapproved price and scope as agreed. [E008, E013, E015, E016, A1, S:initial-request]
- high authority: Unrecorded entry into a property the tenant had vacated, apparently using agency-held keys. The contractor acted against a written instruction and there is no record of who released the keys or whether they were returned. [E003, E007, E008, E013]
- medium complaint: Any recharge to the former tenant for the works would be a liability dispute. Nothing in the records shows the damage was present at check-in or caused by him. Liability must not be stated as proved. [E002, E003, S:initial-request]
- medium privacy: The former tenant's phone number was included in a chase to the contractor after he said he had vacated and was not arranging access. [E003, E010]
- medium other: The landlord approved 'remedial works' and was told scheduling was underway (E009), but has not been told the work was done, the scope changed or the invoice received. Learning this later could damage the relationship. [E005, E009, E014, E016]
- low safety: The front-gate hinge was detached from the brick pillar and has been reattached with new fixings, with no completion evidence. The cracked flooring may be a trip hazard. The adequacy of the repairs is not confirmed. [S:initial-request, E016, A1]

**Treated as noise**
- E012: Stale wait instruction. It refers to an invoice not yet received and was overtaken by the 10 Sep call (E013).
- E016: Document duplicates the text of A1 and carries no explanatory message. It is the same evidence as A1, not new evidence of completion.
- E014: Forwarded invoice with no message: only the attachment matters.
- E006: Internal note restating that provider selection was still needed. It does not add authority.
- E001: Internal note of the request from inspection notes. Useful background only.
- E004: Internal classification note. Not a request to anyone.
- E015: Internal note recording the invoice amount. The amount itself is confirmed by A1.
- Computed facts 'unanswered requests': The code counted internal notes (E004, E006, E007, E011) and the invoice (E016) as unanswered requests to Maya Chen. Only E003 (tenant's records and access request) is a real open ask to the agency.

## 4. Independent proposals

| # | Action | Recipient | Channel | Confidence | Label |
|---|---|---|---|---|---|
| 1 | `chase` | Rowan Pike, Alder & Finch Repairs | Email | 50% | Chase Rowan Pike for the completion paperwork he promised, plus an itemised price with VAT basis and how he got into the property, before the £174 invoice goes to the landlord |
| 2 | `escalate_to_human` | Northbridge Lettings lettings/operations manager (escalation owner for 18 Brindle Row) | Internal escalation note | 60% | Pass the £174 Alder & Finch invoice, and the unrecorded entry to the empty property, to a person with authority over spend and keys. Ask the contractor for the missing evidence in the same turn. |
| 3 | `escalate_to_human` | Agency supervisor / operations manager, Northbridge Lettings (escalation owner for spend and key control) | Internal escalation note | 55% | Pass the £174 invoice to a supervisor to decide, because the work was done against a written quote-only instruction, with no record of how the contractor got in and with more work than was listed. Chase the contractor for the missing evidence in the same turn. |

## 5. Checks and review

**Rule checks on the final candidate**
- All passed.

**Review 1: pass**
- minor: c1 [communication] The escalation note says agency keys 'may have been' used and asks 'who gave you the keys'. The records show only that access is unexplained, so this is inference. (E003, E007, E013). Fix: Keep it phrased as an open question, as it is. Do not imply wrongdoing by the contractor or agency staff until the key log has been checked.

Revised after review: no

## Decision 1: Pass the £174 Alder & Finch invoice, and the unrecorded entry to the empty property, to a person with authority over spend and keys. Ask the contractor for the missing evidence in the same turn.

- **case.escalate** → Northbridge Lettings lettings/operations manager (escalation owner for 18 Brindle Row) via Internal escalation note
- Same turn: **contractor.chase** → Rowan Pike, Alder & Finch Repairs via Email
- Citations: S:initial-request, E003, E005, E007, E008, E009, E010, E012, E013, E014, E015, E016, A1
- Gate rule: model chose escalation
- Agreement with independent proposals: 67% · confidence 60% · decided by model
- Rationale: There is no doubt about who owes the next move. The contractor did the work against our written "quote only, no work without written authority" instruction (E008, E013). He entered a vacant property with no access arrangement recorded, while the agency held the keys (E003, E007, E015). His £174 lump-sum invoice has no itemisation, no VAT basis and no completion evidence, and it includes scope beyond the inspection list: a new Venetian blind and carpet reinstatement (S:initial-request, E016, A1). Key control, unauthorised entry, a breached instruction and changed scope are all escalation triggers, and the decision to accept or dispute the invoice needs authority I don't have. The landlord's broad approval (E005) might cover the cost, but he never saw a price or the scope changes. The routine evidence request goes to the contractor now in alsoSend, so the person who picks this up has it to hand.
- Alternatives considered:
  - landlord.update forwarding the invoice as completed works: There is no completion evidence, the scope changed without approval, and the work breached our instruction. Forwarding it would present unapproved spend as agreed.
  - contractor.chase alone: This gets the evidence but leaves the key-control breach and the invoice decision without an owner. Those need a person, so the chase goes in alsoSend.
  - case.wait: The invoice is here and the earlier instruction to wait is out of date. Nothing has been promised that we are waiting for.

## Handover

Summary: Alder & Finch Repairs completed six move-out items at the vacant 18 Brindle Row on 9 Sep (by their own account). Our written instruction had been to quote only and wait for written authority. Their £174.00 lump-sum invoice has no itemisation, VAT basis or photos, and covers more than the inspection asked for: a new Venetian blind, plus carpet reinstatement with the floorboard. No access arrangement is recorded, and the agency held the keys. The landlord approved "remedial works" in general but has not seen a price and has not been told the work is done.

Done so far:
- E004: landlord asked for approval, with no estimate
- E005: landlord approved remedial works, with no limit
- E008: contractor asked for a quote only, no work without written authority
- E010: chase sent, with the former tenant's number included
- E013: call; the contractor said the work was done on 9 Sep
- E014/E016/A1: invoice received, £174.00
- This turn: emailed the contractor for access details, keys, itemised price and VAT, photos and his account, reply by 12 Sep

Why this needs a person: The work breached our written instruction. Entry to the vacant property is unexplained and agency keys may have been used. The scope grew without approval and the price was never agreed. Accepting or disputing the invoice and reviewing key control need someone with authority over spend and keys.

Options:
- Hold payment and get the contractor's evidence, then send the landlord the itemised invoice and ask whether he accepts it, including the blind replacement and carpet. Risk: This takes a few days. The contractor may push for payment.
- Accept the invoice under the landlord's general approval and forward it to him for payment. Risk: It treats an unapproved price and scope as agreed, with no proof of completion. The landlord may object later.
- Dispute the invoice with the contractor because of the breached instruction. Risk: The landlord may in fact want the work kept. It could damage the contractor relationship before the facts are known.

Recommended: Hold payment, check the key log today, wait for the contractor's itemised breakdown and photos, then send the landlord a factual update and ask for his decision on the extra scope. Make no recharge to the former tenant without check-in and check-out evidence.

## Failures and fallbacks

- None.

## Model calls

| Stage | Model | OK | ms | In | Out | Cache read | Request |
|---|---|---|---|---|---|---|---|
| situate | claude-haiku-5-5 | yes | 67235 | 2 | 14718 | 25808 | claude-code |
| decide | claude-opus-5-5 | yes | 38099 | 2 | 3658 | 25625 | claude-code |
| decide | claude-opus-5-5 | yes | 42473 | 2 | 4257 | 25625 | claude-code |
| decide | claude-opus-5-5 | yes | 46838 | 2 | 4540 | 37811 | claude-code |
| review-1 | claude-sonnet-5-5 | yes | 10356 | 2 | 996 | 24657 | claude-code |

Total time: 124.4 s

## 5. Checks and review dialogue

Models: read claude-haiku-5-5 · decide claude-opus-5-5 · review claude-sonnet-5-5

**Rule checks on the final candidate**
- All passed.

### Round 1 · reviewer claude-sonnet-5-5

**Review: approve**
- **c1** minor · communication: The escalation note says agency keys 'may have been' used and asks 'who gave you the keys'. The records show only that access is unexplained, so this is inference. [E003, E007, E013]. Suggested fix: Keep it phrased as an open question, as it is. Do not imply wrongdoing by the contractor or agency staff until the key log has been checked.

Revised after review: no
