# Case 021: Hot-water service report

**Next action:** Chase the tenant by SMS to confirm whether hot water and boiler power are back after the landlord's plumber's visit, and ask for details of the letterbox fault

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Chase (`chase`) | Iris Vale (Tenant, resident) | SMS | 60% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 21 events (E001–E021), decision moment 2025-05-16 16:05.
- Attachments: none.

## Actions taken

1. **Chase the tenant by SMS to confirm whether hot water and boiler power are back after the landlord's plumber's visit, and ask for details of the letterbox fault** (`tenant.chase`) → Iris Vale (Tenant, resident) via SMS:

> Hi Iris, this is Maya Chen from Northbridge Lettings about your hot water at 17 Wrenfold Quay. Your landlord has told us his plumber came on 14 May and fixed the problem. We have not heard from you since, so please can you confirm by Monday 19 May whether: 1) you now have hot water at the taps and in the shower, and 2) the boiler now has power. If it is still not working, reply and we will take it straight back to your landlord. If the boiler shows any sign of burning, sparking or tripping, stop using it and tell us straight away. On the letterbox you mentioned on 13 May: please reply with a short description of what is wrong (a photo would help) and we will log it as a separate repair. If it is easier to speak, call us. Thank you, Maya

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.wait until Monday 19 May, then tenant.chase: Only about 1.3 days have passed since the last ask, but the tenant's last report was no hot water and the agency called it urgent. Waiting risks a weekend outage we know nothing about.
- case.close on the landlord's word: There is no tenant confirmation and no work record, and the tenant's latest statement says it was not fixed.
- landlord.update or landlord.chase for the plumber's report: The landlord is not waiting on us. Whether it is fixed has to be settled first by the tenant, who is the one without hot water.
- case.escalate: There is no complaint, no safety incident reported and no decision outside the playbook yet. The landlord-managed route covers checking completion with the tenant.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The tenant replies to say either that hot water and boiler power are back, which supports closing the job once the landlord's position on paperwork is noted, or that the fault continues, which goes straight back to the landlord. She may also describe the letterbox fault so it can be logged as a separate request.

**Follow up by:** 2025-05-19

### Why

This is a landlord-managed repair. The landlord says his plumber fixed it on 14 May, but he only has the plumber's text to go on (E018). The tenant's last report, on 13 May, was still no hot water (E017), and she has not confirmed anything since. The voicemail (E019) and email (E020) on 15 May got no reply. We cannot close the job or tell the landlord it is settled without her confirmation. The agency treated loss of hot water as urgent (E004), and it is Friday afternoon. Waiting until Monday without trying a different channel could leave a household with no hot water over the weekend without us knowing. So we chase now by SMS, a different channel from the voicemail and email, and set a reply-by date of Monday. The letterbox question (E017) is new, not a repeat of an earlier ask. Maya promised to follow it up and nothing has been done, so we ask for the details in the same message and log it as a separate request. The landlord is not waiting on us. He asked to be told only if the problem persists (E018), so no landlord message goes out this turn.

### Boundaries (what this does not prove or settle)

- The landlord's report, based on his plumber's text, does not prove the fault is fixed. Only the tenant's confirmation or a work record would.
- Sending the SMS does not mean the tenant has received it. Silence is not confirmation that the fix works.
- This message makes no statement about charges and does not repeat or extend the 6 May call-out comment.
- Logging the letterbox does not approve any repair. That needs the landlord's decision as a separate request.
- No date is promised for any further attendance.

### Remaining work

- If the tenant says it still does not work: tell the landlord the same day and ask whether he will get his plumber back or wants Northbridge to send its own contractor (he offered this on 12 May).
- If the tenant confirms it works: tell the landlord in one line, ask whether he holds a work description or invoice, then close the job without payment.
- If there is no reply by Monday 19 May: phone the tenant again. If she still cannot be reached, consider escalating, given how long the hot-water outage has lasted.
- Log the letterbox as a separate request and ask the landlord for approval once the details are in.
- The landlord's 6 May request for a building contact is still unanswered. Do not share any tenant details without her consent.

### Assumptions

- Northbridge holds the tenant's mobile number and SMS is an approved channel for her (she has used Portal, Email and Call).
- The tenant can read English. Only another household member was recorded as not speaking it.
- Loss of hot water is still urgent enough to justify chasing about 1.3 days after the last ask.

### Evidence

- **S:initial-request** · Initial request: “The tenant reports that the shower and hot water are not working. They have checked the boiler switch and report that the boiler has no power.”
- **E003** · 2025-05-06 09:02 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Vale (Tenant, resident): “Tenant said there was no hot water at the taps as well as in the shower, and that the boiler had no power despite checking the switch. A household member could be at home, but the tenant asked to be c…”
- **E004** · 2025-05-06 09:03 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Vale (Tenant, resident): “Maya said the loss of hot water would be treated as urgent and that she would contact the landlord about attendance. She said the tenant would not be charged for the reported fault, while also noting …”
- **E012** · 2025-05-11 10:03 · Iris Vale (Tenant, resident) → Maya Chen (Property Manager, Northbridge Lettings): “Tenant replied: “Nothing done about it thanks.” No restoration of hot water or boiler power was reported.”
- **E015** · 2025-05-12 16:20 · Maya Chen (Property Manager, Northbridge Lettings) → Ravi Sethi (Landlord, property owner): “Ravi said he believed his plumber would attend that evening. He said Northbridge Lettings could send its own contractor the following day if the plumber did not attend. No agency contractor was booked…”
- **E017** · 2025-05-13 09:05 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Vale (Tenant, resident): “Tenant said there was still no hot water and nobody had come to fix it. Tenant separately reported that the letterbox was not working and asked whether it needed to be reported separately. Maya said s…”
- **E018** · 2025-05-15 08:37 · Maya Chen (Property Manager, Northbridge Lettings) → Ravi Sethi (Landlord, property owner): “Ravi said his plumber had attended the previous day and fixed the issue, based on a text from the plumber. No work description, report, invoice, or details of boiler or electrical checks were provided…”
- **E019** · 2025-05-15 08:38 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Vale (Tenant, resident): “Maya called to ask whether hot water had returned and left a voicemail. She said the landlord believed the issue had been resolved. No tenant confirmation was obtained during the call.”
- **E020** · 2025-05-15 08:45 · Maya Chen (Property Manager, Northbridge Lettings) → Iris Vale (Tenant, resident): “Asked the tenant to confirm whether the hot-water issue had been resolved. No reply is recorded.”
- **E021** · 2025-05-16 16:05 · Maya Chen (Property Manager, Northbridge Lettings) → Tessa Moor (Duty Operations Lead, Northbridge Lettings): “The maintenance request remains open. The landlord's update and the tenant's earlier report about the letterbox are on file.”

---

Generated by agent-c on 2026-10-10 15:41:05 UTC from `Property Management/021`. Full reasoning in REASONING.md, trace in trace.jsonl.
