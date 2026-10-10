# Case 026: Moisture inspection and repair coordination

**Next action:** Ask the Privacy Lead to decide on the misdirected email and tell us what the tenant should do with it, and flag the damp next to the socket

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Elena Frost (Privacy Lead, Northbridge Lettings) | Email (internal) | 60% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 20 events (E001–E020), decision moment 2025-03-06 16:40.
- Attachments: none.

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Elena Frost (Privacy Lead, Northbridge Lettings) via Email (internal) (see Escalated).

2. Same turn (`contractor.update`) → Owen Pike (Brindle Survey & Drying) via Email:

> Hi Owen,
> 
> Thanks for letting us know about the breakdown. Please go ahead with the inspection on Friday 7 March 2025 after 13:00 at 18 Juniper Fold. The tenant has said she is available on weekday afternoons after 13:00. I am asking her to confirm tomorrow and will let you know straight away if there is a problem.
> 
> The tenant tells us the damp patch below the kitchen window is next to the socket under the window, and that it looked darker this afternoon. She has noticed no dripping, heat, sparks or tripped breaker. Please include this area in your inspection and let me know at once if you find anything that suggests an electrical risk.
> 
> As before, the owner has approved the non-intrusive inspection only. Please don't remove trim, cut into the wall or start any remedial work. Send your findings, photos and estimate to me so I can pass them to the owner for approval.
> 
> Please reply to confirm you will attend.
> 
> Kind regards,
> Maya Chen
> Northbridge Lettings

3. Same turn (`tenant.update`) → Iris Bell (Tenant, 18 Juniper Fold) via Email:

> Dear Iris,
> 
> Thank you for your message, and I'm sorry for the uncertainty.
> 
> Inspection: the surveyor could not come today because his vehicle broke down. He has offered Friday 7 March after 13:00 instead, and I have asked him to confirm. Could you please reply by 10:00 tomorrow to let me know whether you can give access then? If that time doesn't suit, tell me what does and I'll rearrange.
> 
> Until the patch has been looked at, please avoid using the socket under the kitchen window. If you notice any dripping, the area becoming wet, heat, sparks, a burning smell or a tripped breaker, stop using the socket and contact us straight away.
> 
> The email with another person's details: please keep it as it is for now. Don't forward, copy or delete it. Our privacy lead is reviewing it, and I will tell you exactly what to do with it by the end of Friday 7 March. Thank you for flagging it and handling it so carefully.
> 
> Kind regards,
> Maya Chen
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- contractor.update only (confirm 7 March): Leaves Iris's question about the other tenant's data unanswered for a third day, with no privacy decision. The confirmation still goes out in alsoSend.
- tenant.update only: The agent cannot tell her whether to delete the email or decide on notification. A person must make that call.
- case.wait for the 7 March visit: The visit is not confirmed, and the tenant is waiting on two direct questions.

## Escalated

Yes, to Elena Frost (Privacy Lead, Northbridge Lettings).

**Why a person is needed:** Only the Privacy Lead can decide whether Iris should delete the email and whether and how the other tenant is notified. Any electrical check beyond the approved inspection needs a person's judgement and the owner's approval.

**Summary:** A misdirected appointment email of 5 March sent another tenant's name, address, rent arrears and payment arrangement to tenant Iris Bell. She has asked twice what to do with it. No privacy assessment or notification decision is recorded, and the other tenant has not been contacted. The record does not confirm that the sent copy has been preserved. Separately, the damp near the kitchen socket looked darker today, and the inspection has slipped to 7 March.

**Done so far:**
- E015: Iris told by phone not to forward or share the email
- E016: incident recorded for the Privacy Lead
- E018: recipients confirmed (Iris only, no attachment); other tenant not contacted
- This turn: 7 March slot confirmed with the contractor, with the socket detail added; Iris given a status update, a holding instruction on the email and safety advice

**Options:**
- Tell Iris to delete the email and confirm in writing that she has not shared it; assess and notify the other tenant as policy requires. Risk: If the decision is delayed, Iris may delete or share it herself
- Keep the holding instruction until the assessment is complete. Risk: Tenant trust and the notification timescale are at risk if it drags on
- Ask the owner to approve an electrician's check of the socket before or alongside the inspection. Risk: Extra cost needs Gareth Vale's approval; without the check, a moisture-related electrical fault could go unnoticed

**Recommended:** Privacy Lead to give Iris's instruction and the notification decision by 12:00 on 7 March. Agency to confirm preservation of the sent copy by the same time. Duty manager to decide whether to put an electrician's check to the owner, Gareth Vale.

## What failed

- Nothing failed.

## Final result

The Privacy Lead decides what Iris should do with the email and whether and how the other tenant is notified. The sent copy's preservation gets confirmed. The inspection goes ahead on 7 March after 13:00. Iris knows where things stand and how to stay safe meanwhile.

**Follow up by:** 2025-03-07

### Why

The tenant has asked twice what to do with the misdirected email (E014, E020). Only a person can give that instruction, and the notification decision for the other tenant belongs to the Privacy Lead. No decision is on record and the other tenant has not been contacted (E016–E018). Preservation was requested (E017) but is not confirmed in E018, so the message commits to confirming it rather than claiming it is done. The routine parts are handled in this same turn. The contractor offered 7 March after 13:00, subject to confirmation (E019), and Iris is available on weekdays after 13:00 (E004). So the slot is confirmed with the contractor, and he is told the stain is next to the socket and getting darker (E009, E020). Iris gets an answer on the inspection, a holding instruction on the email and safety advice. The damp is not wet and there are no electrical symptoms (E004, E009, E020). That makes this a risk to a person within a routine job, not an emergency, and it is flagged in the handover.

### Boundaries (what this does not prove or settle)

- Escalating does not settle whether notification is needed or who must be told.
- Telling Iris to keep the email for now is a holding instruction, not the privacy decision.
- The record does not show that the sent message has been preserved. This action does not claim that it has.
- Confirming the 7 March slot with the contractor does not confirm that he will attend or that the inspection is done.
- The owner approved the inspection fee only. Nothing here approves remedial, intrusive or electrical work.
- Interim safety advice is not an electrical safety assessment.

### Remaining work

- Make sure the agency's sent copy of the 5 March 11:22 email is preserved unaltered, and confirm this to Elena Frost by 12:00 on 7 March.
- Pass the Privacy Lead's instruction on the email to Iris once it is given, by the end of 7 March as promised.
- Check on the morning of 7 March that Iris has confirmed access and Owen has confirmed attendance. If not, phone both.
- Tell Gareth Vale about the missed visit, the new date, and that the stain is next to the socket and getting darker. If he or the duty manager wants the socket checked by an electrician, ask Gareth to approve it.
- After the inspection, chase Owen for findings and an estimate, and send any repair proposal to Gareth separately (E011).
- Iris's permission to share her report (E003) was never recorded as given. Confirm it with her.

### Assumptions

- Iris's weekday availability after 13:00 (E004) covers Friday 7 March. She is asked to confirm.

### Evidence

- **E004** · 2025-03-04 09:27 · Iris Bell (Tenant, 18 Juniper Fold) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed the paint felt cool but not wet, with no visible dripping. Reported a faint musty smell and said she could provide access after 13:00 on weekdays.”
- **E009** · 2025-03-04 14:31 · Iris Bell (Tenant, 18 Juniper Fold) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed she would be home after 13:00 on 2025-03-06. Added that the mark was nearest the socket under the window but she had not noticed heat, sparks, or a tripped breaker.”
- **E011** · 2025-03-05 09:16 · Gareth Vale (Owner, 18 Juniper Fold) → Maya Chen (Property Manager, Northbridge Lettings): “Approved the quoted inspection fee only. Asked that any repair proposal be sent separately for approval.”
- **E012** · 2025-03-05 09:40 · Maya Chen (Property Manager, Northbridge Lettings) → Owen Pike (Contractor, Brindle Survey & Drying): “Confirmed the inspection booking for 2025-03-06 after 13:00 and stated that the owner had approved inspection only, not remedial work.”
- **E013** · 2025-03-05 11:22 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Bell (Tenant, 18 Juniper Fold): “Sent the appointment confirmation. The message body also included another tenant's name, address, rent arrears amount, and a note about a payment arrangement. It was addressed to Iris's confirmed emai…”
- **E014** · 2025-03-05 11:29 · Iris Bell (Tenant, 18 Juniper Fold) → Maya Chen (Property Manager, Northbridge Lettings): “Replied that the message contained information about someone she did not know. Said she had not forwarded it and asked the agency to confirm what to do with the message.”
- **E015** · 2025-03-05 11:37 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Bell (Tenant, 18 Juniper Fold): “Asked Iris not to forward or further share the email and said the agency was checking the incident. Iris said the message remained in her inbox and she had not deleted it.”
- **E016** · 2025-03-05 11:51 · Maya Chen (Property Manager, Northbridge Lettings) → Elena Frost (Privacy Lead, Northbridge Lettings): “Recorded the misdirected email, the categories of personal information visible in its body, the recipient's confirmation that she had not forwarded it, and the maintenance booking still in progress. N…”
- **E017** · 2025-03-05 12:18 · Elena Frost (Privacy Lead, Northbridge Lettings) → Maya Chen (Property Manager, Northbridge Lettings): “Asked Maya to preserve the sent message and confirm its exact recipients, whether any copies or attachments were included, what the recipient had done with it, and whether the recipient whose informat…”
- **E018** · 2025-03-05 13:04 · Maya Chen (Property Manager, Northbridge Lettings) → Elena Frost (Privacy Lead, Northbridge Lettings): “Confirmed the sent message was addressed to Iris only and had no attachment. Said she had not yet contacted the other tenant because she was awaiting privacy-team guidance. Reported that Iris still ha…”
- **E019** · 2025-03-06 15:12 · Owen Pike (Contractor, Brindle Survey & Drying) → Maya Chen (Property Manager, Northbridge Lettings): “Reported that he could not attend the agreed slot because of a vehicle breakdown. Offered 2025-03-07 after 13:00, subject to confirmation. He has not inspected the property.”
- **E020** · 2025-03-06 16:40 · Iris Bell (Tenant, 18 Juniper Fold) → Maya Chen (Property Manager, Northbridge Lettings): “Asked whether the inspection was still happening and whether she should keep the email containing the other tenant's information. Said the stain looked darker that afternoon, but there was still no dr…”

---

Generated by agent-c on 2026-10-10 15:42:15 UTC from `Property Management/026`. Full reasoning in REASONING.md, trace in trace.jsonl.
