# Reasoning: case 024

## 1. What the system received

- Folder: `Property Management/024` · track detected: **property**
- Case record sections: Case details (S:case-details), Initial request (S:initial-request)
- History: 21 events (E001–E021); decision moment 2025-09-24T16:11:00.000Z
- Attachments: A1 attachments/checkout-report.pdf (pdf), A2 attachments/property-service-quotation.pdf (pdf)
- Withheld from the agent: nothing
- Ingest notes: none

## 2. Computed facts (code, no model)

```
As of: 2025-09-24T16:11:00.000Z · first event 2025-09-04T09:01:00.000Z · 21 events over 20.3 days
Channels seen: Portal, Note, Email, Update, Call

Parties (sent / received · last message from them · unanswered requests to them since):
- Northbridge Lettings): 0 / 14 · never wrote · 5 unanswered request(s): E002, E005, E017, E020, E021
- Elowen Pryce (Property Manager, Northbridge Lettings): 13 / 0 · last from them E020 (1d before as-of)
- Elowen Pryce (Property Manager: 0 / 8 · never wrote · 3 unanswered request(s): E005, E017, E021
- Tavin Moor (Maintenance Coordinator: 0 / 6 · never wrote · 2 unanswered request(s): E002, E020
- Northbridge Lettings workflow (System): 5 / 0 · last from them E021 (0d before as-of)
- Perrin Holt (Contractor: 0 / 4 · never wrote · 1 unanswered request(s): E010
- Larkspan Property Care): 0 / 4 · never wrote · 1 unanswered request(s): E010
- Sella Voss (Landlord: 0 / 3 · never wrote · 2 unanswered request(s): E004, E018
- Northbridge Lettings client): 0 / 3 · never wrote · 2 unanswered request(s): E004, E018
- Perrin Holt (Contractor, Larkspan Property Care): 3 / 0 · last from them E011 (14.8d before as-of)

Amounts:
- £180 (excl. VAT) [E011]
- £180 (excl. VAT) [E017]
- £216 (incl. VAT) [E017]
- £100 [E017]
- £180 (excl. VAT) [E018]
- £180 (excl. VAT) [E019]
- £180.00 [A2]
- £36.00 [A2]
- £216.00 [A2]

Dates mentioned (resolved against when they were written):
- "today" → 2025-09-23 (passed) · written by Elowen Pryce (Property Manager, Northbridge Lettings) [E020]
```

## 3. Situation (model reading)

**Task:** Escalate to Elowen Pryce (Property Manager): reconcile the unverified "work done today" note with the unapproved quote and the pending deposit decision, and decide the landlord ask and its scope before anyone tells the landlord the work is complete.  
**Stage:** approval (Landlord quote approval for £180 + VAT; no approval on record; internal note claims work done (unverified))  
**Waiting on:** Agency. The case is waiting on Elowen Pryce to decide (case.escalate, via the Portal/case note), not on the landlord. Sella Voss has not answered E018 or the E019 reminder (3 days ago), and no reply date was promised. The recommended handover covers: (1) E020 says the work was done, but there is no contractor completion, photo or invoice, and the quote is unapproved; (2) E015 holds the work until a deposit decision, and no decision is recorded; (3) the approval ask (E018) did not say that removal of the listed items is missing from the quote. Until a person settles these, nobody should tell the landlord the work is done or instruct Larkspan. The first step is a person checking whether anyone attended on 23 Sep. If no one did, the landlord ask should be restated in full, with the scope gap and the VAT basis.

Case 024 is an end-of-occupancy request at 7 Brackenmere Walk, a vacant home with agency-held keys. It asks for removal of items from drawers, the garden box, bins and cellar, then a final property-prep service (S:initial-request, A1). Larkspan quoted £180 plus VAT (£216 incl. VAT) for a cleaning and preparation list that does not include item removal (E011, A2). The request has sat at landlord quote approval since 18 Sep. Sella Voss has not replied to the approval request (E018) or the reminder (E019), and no reply date was given. On 23 Sep an internal note says the clear-out and property service "was done today" and asks someone to check and tell the landlord (E020). Nothing in the record supports that: the quote was never approved, no completion photos or invoice are on file, and a deposit decision was to be made before work proceeds (E015).

**Parties**
- Elowen Pryce: Property Manager, Northbridge Lettings (case owner, sender of most agency messages). Authority: Routes the case, sends asks to the landlord and contractor, and records notes. Cannot approve spend. Must decide the deposit-claim question and the scope ask before work goes ahead.
- Tavin Moor: Maintenance Coordinator, Northbridge Lettings (internal recipient of notes). Authority: Recipient of the E020 task to check completion and tell the landlord. Nothing on record shows he acted on it.
- Sella Voss: Landlord (client). Authority: Approves or rejects spend and scope. Her approval of the £180 + VAT quote is needed before any instruction. Owner of the deposit decision is not named in the record.
- Perrin Holt: Contractor, Larkspan Property Care. Authority: Gives the quote, decides whether and when engagement and attendance happen, and sends completion evidence. Has not replied since 9 Sep.
- Northbridge Lettings workflow: System (automated stage prompts and reminders). Authority: None. Records stage moves and holds only.

**Requests**
- Elowen Pryce → Sella Voss (Landlord): Approve or reject the £180 + VAT (£216 incl. VAT) quote for the end-of-occupancy service (E018, E019). — UNANSWERED [E018, E019]
- Elowen Pryce → Perrin Holt (Contractor): Confirm engagement and the agreed scope and timing, as the call note (E010) says a message was sent to confirm this. No such message is on record. — UNANSWERED [E010]
- Elowen Pryce → Tavin Moor (Maintenance Coordinator): Check the clear-out and property service is finished, then let Sella know (E020). — UNANSWERED [E020]
- Elowen Pryce → Perrin Holt (Contractor): Quote for the removal and final service, and whether an inspection is needed before pricing (E003, E006). — answered [E003, E006, E007, E011]
- Perrin Holt (Contractor) → Elowen Pryce (Property Manager): Bedrooms, furnished status, and whether an end-of-occupancy service is required (E007). — answered [E007, E009]

**Conflicts**
- Landlord approval status. E002 says approval was already obtained and the workflow keeps the move-out approval flag (E005). But the only landlord contact is an informational email (E004), and the quote approval request (E018) and its reminder (E019) are unanswered. No approval message or document exists. [E002, E005, E004, E018, E019]
- Completion. E020 says the clear-out and property service was done on 23 Sep. The workflow still shows the request at landlord quote approval (E021), the quote has never been approved (E017 to E021), no contractor completion or photos are on file (E011 promised them), and the deposit decision was to come before work proceeds (E015). [E020, E021, E017, E018, E015, E011]
- Scope. The request and checkout report list removal of items from drawers, the garden box, bins and the cellar (S:initial-request, A1, E001). The contractor's quote covers cleaning and preparation only and does not include removal (E011, A2). E014 records no clarification. The approval request (E018) put the original request beside the contractor's task list and did not say removal is missing from the price. [S:initial-request, A1, E001, E011, A2, E014, E018]
- Price basis. The quote is £180 excluding VAT, with £36 VAT, making £216 incl. VAT (A2). The workflow threshold uses the £216 incl. VAT figure against a £100 limit (E017). The amounts agree; the approval request wording does not state the VAT basis. [A2, E017, E018]

**Missing**
- Whether anyone attended 7 Brackenmere Walk on or around 23 Sep, and what was done (from Perrin Holt (Larkspan) for their own attendance; Elowen Pryce or Tavin Moor for the internal check ordered in E020; must ask)
- Landlord decision on the £180 + VAT quote (approve or reject) (from Sella Voss (Landlord); must ask)
- Whether item removal (drawers, garden box, bins, cellar) is in scope, and whether the landlord wants it added or left out (from Sella Voss (Landlord) for scope and price; the contractor for whether they can do it; must ask)
- Outcome of the deposit claim decision, and whether the cost goes to the outgoing tenant or the landlord (from Elowen Pryce, following the deposit-claim process. The landlord may need to decide.; must ask)
- Evidence that approval to proceed exists (approval message or document referred to in E002) (from Elowen Pryce (the note's author); must ask)
- Contractor's written confirmation of engagement, scope and timing (the message referred to in the E010 call note) (from Perrin Holt (Larkspan); must ask)
- Completion photos, completion report and invoice (from Perrin Holt (Larkspan); must ask)
- Where the agency-held keys are now (from Elowen Pryce or Tavin Moor; must ask)

**Failed actions**
- Landlord approval request E018 got no reply, and the reminder E019 (3 days later) got no reply. No reply date was given. [E018, E019]
- The E010 call note says a message was sent to confirm engagement. No such message is on record, so the send is unverified or failed. [E010]
- The contractor promised completion photographs (E011). None have arrived, and the contractor has not written since 9 Sep. [E011]
- Tavin Moor's check of completion and the update to the landlord (E020) show no action on record. [E020]

**Risks**
- high money: The internal note says work was done, but the landlord never approved the quote. If the work was done, or the landlord is told it was done, the agency may be on the hook for unapproved spend or an inaccurate completion record. [E020, E017, E018, E021]
- medium money: A deposit claim decision is pending, and the record says work waits for it. Who bears the cost (outgoing tenant or landlord) is unresolved. This is a recharge or deposit question that a person must decide. [E015, E016, E003]
- medium other: Scope gap. If the landlord approves £180 + VAT as it stands, item removal from the drawers, garden box, bins and cellar may not be done, and the landlord may believe it has been. [S:initial-request, A1, E011, A2, E018]
- low other: The home is vacant with agency-held keys, and the request has been open for 20 days with no reply from the landlord, so the property stays uncleared. [E001, E003, E019, E021]

**Treated as noise**
- E005: System stage update. It states the move-out approval flag is kept, but there is no approval message, so it does not prove approval.
- E013: System hold for staff review. Routine.
- E016: System note that the wait continues. Routine.
- E021: System note repeating the stage. Routine.
- E008: Contractor acknowledgement that a quote would follow. Superseded by E011.
- E012: Internal note that the quote was saved. Routine.
- E017: Threshold calculation in a system update. The amounts match A2, so the threshold figure is useful but does not itself decide anything.
- Party-name artefacts: Duplicate or truncated party entries ("Northbridge Lettings)", "Elowen Pryce (Property Manager:", "Northbridge Lettings client", "Larkspan Property Care)"). They refer to the same people; trust the headers.

## 4. Independent proposals

| # | Action | Recipient | Channel | Confidence | Label |
|---|---|---|---|---|---|
| 1 | `escalate_to_human` | Elowen Pryce (Property Manager, Northbridge Lettings) | Portal (internal case note) | 62% | Hand to the property manager: work reported done on 23 Sep with no landlord approval of the £180 + VAT quote, a deposit decision still open and removal missing from the quoted scope |
| 2 | `escalate_to_human` | Elowen Pryce (Property Manager, Northbridge Lettings) | Internal note (Portal) | 60% | Hand to the property manager to decide what to do about work reported done before the landlord approved the quote, with the deposit decision still pending |
| 3 | `escalate_to_human` | Elowen Pryce (Property Manager, Northbridge Lettings) | Internal note (Portal) | 62% | Pass to the property manager to decide how to handle work reportedly done before the landlord approved the £180 + VAT quote, with the deposit decision still pending and item removal not in the quote |

## 5. Checks and review

**Rule checks on the final candidate**
- All passed.

**Review 1: pass**
- minor: c1 [communication] The Larkspan email asks the contractor where the property keys are, but the records show the keys are agency-held (E001) and there is no sign Larkspan took them. (E001, E003). Fix: Reword item 5 to ask whether Larkspan collected any keys. The property manager can check the agency key log.

Revised after review: no

## Decision 1: Hand to the property manager: work reported done on 23 Sep with no landlord approval of the £180 + VAT quote, a deposit decision still open and removal missing from the quoted scope

- **case.escalate** → Elowen Pryce (Property Manager, Northbridge Lettings) via Portal (internal case note)
- Same turn: **contractor.chase** → Perrin Holt (Larkspan Property Care) via Email
- Citations: S:initial-request, A1, A2, E002, E005, E010, E011, E015, E017, E018, E019, E020, E021
- Gate rule: model chose escalation
- Agreement with independent proposals: 100% · confidence 62% · decided by model
- Rationale: The normal next step here would be to tell the landlord the work is done (landlord.update) or to chase her approval. Neither is safe. The work is reported done (E020), but the £180 + VAT quote was never approved (E017–E019, E021). That is unapproved spend. On top of that, a deposit or recharge decision is open (E015), the facts conflict (the approval flag in E002 has nothing behind it, and there is no completion evidence), and the quote leaves out removal, which the checkout report asks for (A1 vs A2). The manual lists unapproved spend, deposit or recharge decisions and conflicting facts as reasons to escalate. Following refinement 6, the routine evidence request goes to the contractor in the same turn, so the handover only covers the decisions a person has to make.
- Alternatives considered:
  - landlord.update telling Sella the work is complete: There is no completion evidence, the quote is unapproved and the deposit decision is open. It would present unapproved spend as settled.
  - landlord.chase for the quote decision: The work is reportedly already done. Asking for prospective approval would mislead her, and the scope gap and deposit question need a person's decision first.
  - contractor.chase as the main action: It's sent as a secondary message, but on its own it doesn't settle the authorisation and deposit decisions that are blocking progress.

## Handover

Summary: An internal note says the end-of-occupancy clear-out and service at the vacant 7 Brackenmere Walk was done on 23 Sep. The landlord never approved the £180 + VAT (£216) quote, there is no completion evidence, a deposit decision is pending, and the quote leaves out removal of the items listed in the checkout report.

Done so far:
- Quote requested and received (E003, E011)
- Landlord asked to approve on 18 Sep (E018), reminded on 21 Sep (E019), no reply
- Internal note reports work done (E020)
- Larkspan asked for completion details, photos, confirmation of whether removal was included, a PDF invoice and the key location (this turn)

Why this needs a person: Authorising spend without landlord approval, the deposit or recharge decision, and how to present this to the landlord all need a person's authority.

Options:
- Ask the landlord for retrospective approval once evidence arrives, setting out the removal gap and the VAT basis. Risk: She may refuse, leaving the agency to cover the cost
- Treat it as an agency error and absorb or negotiate the cost. Risk: A cost to the agency, and the landlord relationship needs to be handled with care
- Recharge the outgoing tenant through the deposit claim. Risk: Needs evidence and a deposit decision. It may be disputed.

Recommended: Wait for Larkspan's evidence, confirm who authorised the attendance, then write to Sella openly with the photos, the price and the removal gap, and ask for her decision. Settle the deposit claim alongside this.

## Failures and fallbacks

- None.

## Model calls

| Stage | Model | OK | ms | In | Out | Cache read | Request |
|---|---|---|---|---|---|---|---|
| situate | claude-haiku-5-5 | yes | 79088 | 4 | 19186 | 57729 | claude-code |
| decide | claude-opus-5-5 | yes | 35293 | 2 | 3560 | 23321 | claude-code |
| decide | claude-opus-5-5 | yes | 35561 | 2 | 3672 | 23321 | claude-code |
| decide | claude-opus-5-5 | yes | 63160 | 4 | 6436 | 65085 | claude-code |
| review-1 | claude-sonnet-5-5 | yes | 7863 | 2 | 768 | 24657 | claude-code |

Total time: 150.1 s

## 5. Checks and review dialogue

Models: read claude-haiku-5-5 · decide claude-opus-5-5 · review claude-sonnet-5-5

**Rule checks on the final candidate**
- All passed.

### Round 1 · reviewer claude-sonnet-5-5

**Review: approve**
- **c1** minor · communication: The Larkspan email asks the contractor where the property keys are, but the records show the keys are agency-held (E001) and there is no sign Larkspan took them. [E001, E003]. Suggested fix: Reword item 5 to ask whether Larkspan collected any keys. The property manager can check the agency key log.

Revised after review: no
