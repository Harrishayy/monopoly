# Case 023: Heating maintenance at 7 Larkspur Fold

**Next action:** Update Tessa Vane on the heating repair, tell her what is and isn't confirmed, and give her a date for our next update

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Send a message (`send_message`) | Tessa Vane (Tenant) | Portal | 65% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 23 events (E001–E023), decision moment 2025-02-12 16:35.
- Attachments: A1 attachments/invoice-NBL-CFM-250210-A.pdf (pdf), A2 attachments/invoice-NBL-CFM-250210-B.pdf (pdf).

## Actions taken

1. **Update Tessa Vane on the heating repair, tell her what is and isn't confirmed, and give her a date for our next update** (`tenant.update`) → Tessa Vane (Tenant) via Portal:

> Dear Tessa,
> 
> Thank you for your message of 10 February, and I'm sorry you haven't heard back from us sooner.
> 
> Here is where things stand. When the engineer visited on 5 February, they traced the intermittent heating to the heating valve actuator. They have proposed replacing it. Our records do not show that the replacement has been approved or carried out, which fits what you told us: no contractor has been to the property since 5 February. I am now checking the next steps with your landlord and the contractor.
> 
> Please could you help with two things:
> 1. If anyone contacts you to arrange a visit or work on the heating, please let me know before the visit, so that I can confirm it has been arranged through us.
> 2. Please tell me if the heating changes. In particular, let me know if it stops working altogether or if more radiators go cold.
> 
> While you wait, please contact us straight away if the boiler shows a warning symbol again (a photo of the display would help), or if anything else changes. If you ever smell gas or notice a burning smell, leave the boiler alone and call the national gas emergency line or the emergency services immediately, then let us know.
> 
> I will update you by Friday 14 February 2025, even if I am still waiting for an answer.
> 
> Kind regards,
> Ivo Merrick
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.escalate: The authority conflict has already gone to the landlord (E023), and the contractor is checking her records. There is no complaint, total heating loss or safety symptom, so a person isn't needed yet. Escalate if the contractor insists on payment for unauthorised work or the heating fails.
- landlord.chase: The question went to him only minutes before the decision moment.
- contractor.chase: She replied today saying she is checking her records. Chasing within hours would be premature.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The tenant knows the current position and the date of our next update. She will tell us about any contractor contact or if the heating gets worse, which helps settle whether any work was done on 5 February.

**Follow up by:** 2025-02-14

### Why

The agency has just asked the landlord for a decision on the unresolved invoices and on any further work or spend (E023). The contractor said today that she is still checking her records (E022). Neither is overdue, so chasing either of them now would be premature. The tenant is the party waiting on us. Her 10 February message (E020) has had no reply, and our last message to her was on 6 February (E013). She doesn't know whether the actuator was replaced. A child lives at the property (E001), and the heating is still intermittent in February (E011, E020). The contractor found no gas-safety concern and hot water still works (E008, E014), so this needs a prompt, accurate update with a clear route back if things get worse rather than an escalation. We are also asking her to tell us before any contractor visit. That protects against further work being done without approval while Invoice B (A2) claims replacement work that the landlord hasn't authorised (E005, E012, E019).

### Boundaries (what this does not prove or settle)

- This update does not authorise any repair or spend, and it does not decide whether either invoice is payable.
- It doesn't prove whether the actuator was replaced. The tenant's account and the contractor's records still conflict.
- It doesn't promise a repair date.
- It doesn't share any invoice amounts or the landlord's decisions with the tenant.

### Remaining work

- Landlord: decision needed on E023 (further work and spend, and how to treat the two invoices). Chase on Monday 17 February if there is no reply, and answer his 6 February questions (E012) once the contractor has the facts.
- Contractor: completion evidence, the relationship between the two invoices, a repair option, parts availability and whether the £138 diagnosis is credited (E015, E021). Chase on Monday 17 February if nothing has arrived.
- Do not pay or forward Invoice B (£372) as approved. If the contractor keeps it as a charge for unauthorised work, hand the case to a person.
- Update the tenant by 14 February. If the heating fails completely or a safety symptom appears, escalate the same day.

### Assumptions

- The Portal is the right channel for the tenant, as she has used it throughout.
- No contractor visit or payment happened outside the file after 5 February.

### Evidence

- **E001** · 2025-02-03 08:14 · Tessa Vane (Tenant) → Ivo Merrick (Property Manager, Northbridge Lettings): “Reported that radiator heating had cut out twice since the previous evening while hot water remained available. A child lives at the property. Asked for an inspection.”
- **E005** · 2025-02-03 12:22 · Soren Dallow (Landlord) → Ivo Merrick (Property Manager, Northbridge Lettings): “Authorized diagnosis up to £180 including VAT only. Asked to be consulted before any remedial work or additional expenditure is authorized.”
- **E008** · 2025-02-05 14:32 · Petra Quill (Contractor, Copper Finch Mechanical) → Ivo Merrick (Property Manager, Northbridge Lettings): “Reported attending and finding an intermittent fault at the heating valve actuator. Said the heating operated during the visit and that no leak or immediate gas-safety concern was observed. No remedia…”
- **E009** · 2025-02-05 14:54 · Petra Quill (Contractor, Copper Finch Mechanical) → Ivo Merrick (Property Manager, Northbridge Lettings): “Sent an estimate for £372 including VAT for actuator supply and replacement, attendance and heating-system testing. Requested written authorization before proceeding. The estimate did not say whether …”
- **E011** · 2025-02-06 07:56 · Tessa Vane (Tenant) → Ivo Merrick (Property Manager, Northbridge Lettings): “Reported that the radiators were cold again. She was using one portable heater in the sitting room and said it was plugged directly into a wall socket. No new smell, leak or warning was reported.”
- **E012** · 2025-02-06 10:38 · Soren Dallow (Landlord) → Ivo Merrick (Property Manager, Northbridge Lettings): “Had not decided on the estimate. Asked whether the actuator could be repaired and whether the price included all parts, labour and testing. Did not authorize remedial work or further expenditure.”
- **E013** · 2025-02-06 13:17 · Ivo Merrick (Property Manager, Northbridge Lettings) → Tessa Vane (Tenant): “Asked whether heating or safety symptoms had changed, whether the equipment-label details were available, and whether the contractor could be given access if a return visit were arranged.”
- **E014** · 2025-02-06 14:06 · Tessa Vane (Tenant) → Ivo Merrick (Property Manager, Northbridge Lettings): “Said the radiators were still inconsistent and repeated that hot water was available. Supplied the boiler-label details in the message. She had not agreed a return appointment.”
- **E017** · 2025-02-10 09:52 · Petra Quill (Contractor, Copper Finch Mechanical) → Ivo Merrick (Property Manager, Northbridge Lettings): “Sent two invoice records dated 10 February and said they had been prepared from the job paperwork. The message did not say whether one replaced the other, whether both amounts were payable, or whether…”
- **E019** · 2025-02-10 11:11 · Ivo Merrick (Property Manager, Northbridge Lettings) → Ivo Merrick (Property Manager, Northbridge Lettings): “Compared the received records with the file: the landlord's written authority covers diagnosis only; the £372 estimate requesting authorization was sent after the stated service date; and the 7 Februa…”
- **E020** · 2025-02-10 15:08 · Tessa Vane (Tenant) → Ivo Merrick (Property Manager, Northbridge Lettings): “Said she recalled the 5 February visit but did not know whether the actuator had been replaced. She had not seen a contractor at the property since that visit. Heating was currently working intermitte…”
- **E022** · 2025-02-12 11:42 · Petra Quill (Contractor, Copper Finch Mechanical) → Ivo Merrick (Property Manager, Northbridge Lettings): “Replied that she was checking the records and could not yet confirm whether the invoice entries represented separate chargeable work or whether one record replaced the other. She supplied no further c…”
- **E023** · 2025-02-12 16:35 · Ivo Merrick (Property Manager, Northbridge Lettings) → Soren Dallow (Landlord): “The two invoice records remain on file; there is no recorded payment, confirmed supersession or authorization for actuator work. The tenant reports intermittent heating and has not confirmed replaceme…”
- **A2** · attachment attachments/invoice-NBL-CFM-250210-B.pdf

---

Generated by agent-c on 2026-10-10 15:41:18 UTC from `Property Management/023`. Full reasoning in REASONING.md, trace in trace.jsonl.
