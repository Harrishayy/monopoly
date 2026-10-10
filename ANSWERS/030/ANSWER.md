# Case 030: Maintenance report at 8 Brindlefern Walk

**Next action:** Ask the tenant to confirm that a working smoke alarm is now fitted on the upstairs landing and that the loose sockets are secure, before the job is closed

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Request information (`request_information`) | Nessa Quill (Tenant) | Email | 55% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 15 events (E001–E015), decision moment 2025-09-06 18:42.
- Attachments: none.

## Actions taken

1. **Ask the tenant to confirm that a working smoke alarm is now fitted on the upstairs landing and that the loose sockets are secure, before the job is closed** (`tenant.ask`) → Nessa Quill (Tenant) via Email:

> Dear Nessa,
> 
> Your landlord has told us that the work on your smoke alarm and plug sockets was finished on 31 August. Before we close the job, we would like you to confirm the following:
> 
> 1. Is there now a smoke alarm fitted on the upstairs landing? If you press its test button, does it sound? Has the opening in the ceiling where the old alarm was been filled in?
> 2. Are all the plug sockets that were coming away from the wall now fixed firmly in place? If any are still loose or moving, please tell us which room they are in.
> 3. Your landlord says he gave you a dehumidifier for the bathroom. Is there any damp or mould in the bathroom that you would like to report?
> 
> Photos would help but you don't have to send them.
> 
> Please reply by Monday 8 September 2025. Until then:
> - Do not use any socket that is loose or moving.
> - If there is no working smoke alarm on the landing, or you see sparks, smell burning or find a socket that feels hot, tell us straight away.
> - If there is a fire, leave the property and call 999.
> 
> We will update you by Monday 8 September 2025.
> 
> Kind regards,
> Ivo Merrick
> Property Manager, Northbridge Lettings

2. Same turn (`landlord.update`) → Tavian Rusk (Landlord) via Email:

> Dear Tavian,
> 
> Thank you for letting us know the work was completed on 31 August. We have added your emails to the property record.
> 
> Before we close the job, could you please confirm:
> 1. That a replacement smoke alarm has been fitted on the upstairs landing and tested, and that the ceiling opening where the old alarm was has been made good.
> 2. Which sockets were secured. Several were reported as coming away from the wall, and your email mentions the back bedroom and the kitchen. Could you confirm these were all of them?
> 3. The kitchen socket and dehumidifier dates you gave are 5 and 6 August. Can you confirm these are correct and relate to this job?
> 
> Photos of the alarm and sockets would be helpful. We are also asking the tenant to confirm everything is working.
> 
> Please reply by Monday 8 September 2025, and we will update you on that day.
> 
> Kind regards,
> Ivo Merrick
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.close on the landlord's word: We have no positive confirmation that an alarm was fitted and tested. The alarm was recorded as removed, and the landlord described only two of the several loose sockets.
- case.escalate: No risk is confirmed yet, because the landlord says the work is done. A quick check with the tenant settles it. Escalate if she reports no alarm or loose sockets.
- landlord.chase: The landlord has just replied, so this is not a chase. A request for his details goes in alsoSend, but only the tenant can confirm what is actually in the property now.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The tenant confirms whether a working smoke alarm is fitted on the landing and whether the sockets are secure. If she does, and the landlord's details match, the job can close with the landlord told. If she reports no alarm or loose sockets, the case goes to a person straight away for a safety decision.

**Follow up by:** 2025-09-08

### Why

The landlord manages this job himself (E007, E010). He has now said it was completed on 31 August (E012) and added details about socket work and a dehumidifier (E014). For a landlord-managed job, the next step is normally to confirm completion and close. Closing needs positive confirmation, though, and his message only says the alarm "has a ten-year life". It does not say that a replacement alarm was fitted and tested on the landing where the tenant removed the old one (E001), or that the ceiling opening was filled. It describes only two sockets, but the report was of "several sockets" (E005). Two of the dates he gives, 5 and 6 August, are before he said on 24 August that he would do the work (E010).

A missing smoke alarm is a safety matter, and the agency marked it urgent (E002). The person who can confirm the current state right now is the tenant. She has heard nothing from us since 24 August (E009), and we promised to check back with her. Asking her closes that gap and gives her interim safety advice in the same message.

Escalating now would be premature. If both parties confirm the work was done, the playbook covers the case. Escalation becomes the right step if the tenant says there is no working alarm or that sockets are still loose. In the same turn, the landlord gets a short request for details of the alarm and the sockets.

### Boundaries (what this does not prove or settle)

- The landlord saying the work is done is not evidence that a working smoke alarm is fitted or tested.
- This message does not tell the tenant the work is complete or that the job is closed.
- No contractor is assigned and no spend is authorised; the landlord is still managing the work himself.
- Asking about damp does not open a new repair or decide who is responsible for any damp.
- If the tenant does not reply, that is not confirmation.

### Remaining work

- On Monday 8 September 2025, review the replies from the tenant and the landlord.
- If there is no working alarm or there are loose sockets, escalate to a person at once for a safety decision.
- If both confirm, give the landlord a one-line update and close the job without payment, because the landlord manages it himself.
- If the tenant reports bathroom damp or mould, record it as a separate request and route it.
- Note on the property record that the completion recorded at E015 is the landlord's claim and has not been verified.

### Assumptions

- The landlord's 'job completed on 31 August' covers both the smoke alarm and the sockets.
- The tenant is still living at the property and can be reached by email.
- The socket report reached the agency outside the portal message at E001; the record does not show its source.

### Evidence

- **E001** · 2025-08-20 18:02 · Nessa Quill (Tenant) → Ivo Merrick (Property Manager, Northbridge Lettings): “Reports that the upstairs landing smoke alarm kept beeping despite attempts to stop it. She removed the alarm, leaving a small opening in the ceiling. Says she knows of no immediate safety risk.”
- **E002** · 2025-08-20 18:03 · Ivo Merrick (Property Manager, Northbridge Lettings) → Ivo Merrick (Property Manager, Northbridge Lettings): “Triage record: no access issue reported. Tenant has two cats, usually not at the property during daytime visits. Smoke-alarm fault marked urgent.”
- **E005** · 2025-08-24 14:34 · Ivo Merrick (Property Manager, Northbridge Lettings) → Tavian Rusk (Landlord): “Adds that the tenant had also reported several plug sockets coming away from the wall, and asks whether these should be looked at as well.”
- **E007** · 2025-08-24 20:22 · Tavian Rusk (Landlord) → Ivo Merrick (Property Manager, Northbridge Lettings): “Says no action is needed from Northbridge Lettings because he will complete the work himself. Gives no completion date or description of the work in this message.”
- **E009** · 2025-08-24 20:22 · Ivo Merrick (Property Manager, Northbridge Lettings) → Nessa Quill (Tenant): “Tells the tenant the landlord intends to arrange the reported work directly and says Northbridge Lettings will check back about completion.”
- **E010** · 2025-08-24 20:23 · Tavian Rusk (Landlord) → Ivo Merrick (Property Manager, Northbridge Lettings): “In response to the follow-up about the sockets, repeats that he will complete the work himself and that no external action is required.”
- **E012** · 2025-09-06 18:32 · Tavian Rusk (Landlord) → Ivo Merrick (Property Manager, Northbridge Lettings): “Reports that the job was completed on 31 August and says the smoke alarm has a ten-year life. Asks for the property record to be updated.”
- **E014** · 2025-09-06 18:40 · Tavian Rusk (Landlord) → Ivo Merrick (Property Manager, Northbridge Lettings): “Adds that he tightened screws on one back-bedroom socket; that on 5 August he secured a kitchen socket he says had come away after boiler work in February 2025; and that on 6 August he provided the te…”
- **E015** · 2025-09-06 18:42 · Ivo Merrick (Property Manager, Northbridge Lettings) → Ivo Merrick (Property Manager, Northbridge Lettings): “The landlord's email was added to the property record.”

---

Generated by agent-c on 2026-10-10 15:42:57 UTC from `Property Management/030`. Full reasoning in REASONING.md, trace in trace.jsonl.
