# Case 028: Move-out maintenance request

**Next action:** Put the landlord-managed job on hold until Monday 22 September for the landlord's reply on cost breakdown and tenant responsibility; do not close yet

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Wait (`wait`) | — | — | 55% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 25 events (E001–E025), decision moment 2025-09-18 14:50.
- Attachments: A1 attachments/checkout-report.pdf (pdf), A2 attachments/provider-quotation.pdf (pdf).

## Actions taken

1. **Hold** (`case.wait`) until 2025-09-22. What to check then:

> HOLD – NBL-028, 42 Mallowfen Crescent (vacant). The landlord arranged her own company (E017) and on 18 Sept wrote that the work is completed (E021). At 08:46 on 18 Sept we asked her for an itemised cost breakdown and whether she thinks any items are the former tenant's responsibility (E023). There is no reply yet, and the ask is only about 6 hours old. The request is marked completed (E022) and the workflow task was dismissed (E024), so this hold note is now the only follow-up prompt. Do not close the job while E023 is unanswered.
> RECHECK Monday 22 September 2025:
> 1) If she has replied with costs and a responsibility view: log it. If she says any item is the former tenant's to pay, hand it to a person for the recharge/deposit decision; do not tell the tenant they will be charged.
> 2) If she has not replied: chase her by email and phone. Restate the E023 ask and also ask where the property keys are now (they were to be arranged through our office, E003). Give a reply-by date of Thu 25 Sept.
> 3) Close only when the E023 question is answered or she confirms she is making no claim, the key location is confirmed, and nothing is owed to Pineglass (stood down E020; their quote of £564.48 was declined, so no cost to us).

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- landlord.chase / landlord.update asking now for photos, invoice and keys: The same question went to her only about 6 hours ago. On a landlord-managed job, photos and an invoice aren't needed to close, and the key question can go into Monday's chase.
- case.close: The cost and responsibility question (E023) is unanswered and the key location is unconfirmed.
- case.escalate: There is no recharge claim, dispute or safety issue yet, so there is nothing for a person to decide.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The landlord replies to E023 by Monday 22 Sept, or she is chased with the key question added. The job stays open until the question and key location are settled.

**Follow up by:** 2025-09-22

### Why

This is a landlord-managed job. The landlord has confirmed completion herself, and for this kind of job her word is enough evidence of completion. No invoice comes to us because her own company did the work. The only open item is our own question to her (E023) about the cost breakdown and tenant responsibility, sent at 08:46 on 18 Sept, roughly 6 hours before the decision moment. Chasing within hours of an ask is premature, since landlords usually take hours to a few days to reply. We can't close yet either, because closing with an unanswered question is prohibited and nobody has confirmed where the keys to this vacant property are. The workflow task was dismissed (E024, E025), so the job could easily be forgotten. A hold note with a fixed recheck date guards against that. Thursday 18 Sept plus about 3 days lands on Monday 22 Sept, a working day. Sending her a second email now with extra asks (photos, invoice) would go beyond what a landlord-managed closure needs and would pile onto a request she has had for only a few hours. The key question can go into the Monday chase.

### Boundaries (what this does not prove or settle)

- The landlord's email is not independent evidence of what her company did or when.
- Holding does not decide whether any cost is the former tenant's responsibility; any recharge needs a person and evidence such as the check-in inventory.
- The 'completed' status in E022 does not mean the case can be closed.
- No cost is approved or owed to Pineglass; their quote was declined.

### Remaining work

- Get the landlord's answer to E023 (itemised costs, tenant-responsibility view).
- Confirm where the keys to the vacant property are.
- Escalate to a person if the landlord asserts a recharge to the former tenant.
- Close the case once nothing is open.

### Assumptions

- Pineglass did not attend and is owed nothing, given the stand-down email (E020).
- The E001 note saying approval was already given is wrong; the landlord declined the quote (E017).
- No reply has arrived after E023, as E025 records.

### Evidence

- **E003** · 2025-09-04 17:18 · Talia Wren (Property Manager, Northbridge Lettings) → Bram Sedge (Contractor, Pineglass Property Repairs): “Requested an online quote and earliest availability for the three work areas. Advised that the property is unoccupied and keys could be arranged through the agency office. Sent the check-out report.”
- **E017** · 2025-09-13 07:59 · Elowen Quill (Landlord, private owner) → Talia Wren (Property Manager, Northbridge Lettings): “Declined the agency provider's quote and said she would arrange her own company to do the work on Wednesday morning while cleaning was taking place.”
- **E019** · 2025-09-14 11:58 · Talia Wren (Property Manager, Northbridge Lettings) → Elowen Quill (Landlord, private owner): “Acknowledged that the landlord would arrange the works and asked her to confirm when they were finished.”
- **E020** · 2025-09-14 11:58 · Talia Wren (Property Manager, Northbridge Lettings) → Bram Sedge (Contractor, Pineglass Property Repairs): “Advised that the landlord had chosen to arrange the works herself and that the provider should not attend.”
- **E021** · 2025-09-18 05:45 · Elowen Quill (Landlord, private owner) → Talia Wren (Property Manager, Northbridge Lettings): “Wrote: “The work has been completed at the property.” No completion date, photographs, invoice, or other contractor evidence accompanied the message.”
- **E022** · 2025-09-18 08:21 · Oren Pell (Maintenance Coordinator, Northbridge Lettings) → Talia Wren (Property Manager, Northbridge Lettings): “The maintenance request was marked completed based on the landlord's email confirmation.”
- **E023** · 2025-09-18 08:46 · Talia Wren (Property Manager, Northbridge Lettings) → Elowen Quill (Landlord, private owner): “Asked for an itemised breakdown of costs incurred and whether the landlord considered any specific repairs to be the former tenant's responsibility, so the tenancy account could be reviewed.”
- **E024** · 2025-09-18 14:49 · Oren Pell (Maintenance Coordinator, Northbridge Lettings) → Talia Wren (Property Manager, Northbridge Lettings): “The pending workflow task was dismissed because the maintenance request was already completed. No further action was expected unless a new message arrived.”
- **E025** · 2025-09-18 14:50 · Talia Wren (Property Manager, Northbridge Lettings) → Oren Pell (Maintenance Coordinator, Northbridge Lettings): “No reply to the request for the cost breakdown or responsibility allocation is recorded. The workflow has no active task following the dismissal.”
- **A2** · attachment attachments/provider-quotation.pdf

---

Generated by agent-c on 2026-10-10 15:42:31 UTC from `Property Management/028`. Full reasoning in REASONING.md, trace in trace.jsonl.
