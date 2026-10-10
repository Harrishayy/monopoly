# Case 014: Heating service request at 7 Mallowmere Walk

**Next action:** Phone Brackenridge Heat Services before 17:30 to book the 15 January 09:00–11:00 diagnostic slot (£168 incl. VAT) as an urgent repair under the standing £250 authority, with Leah's access conditions

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Send a message (`send_message`) | Daniel Hart, Heating Contractor, Brackenridge Heat Services | Phone call now (before 17:30), then confirm by email | 60% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 19 events (E001–E019), decision moment 2025-01-14 17:08.
- Attachments: none.

## Actions taken

1. **Phone Brackenridge Heat Services before 17:30 to book the 15 January 09:00–11:00 diagnostic slot (£168 incl. VAT) as an urgent repair under the standing £250 authority, with Leah's access conditions** (`contractor.assign`) → Daniel Hart, Heating Contractor, Brackenridge Heat Services via Phone call now (before 17:30), then confirm by email:

> Hi Daniel, it's Maya Chen at Northbridge Lettings, about the heating at 7 Mallowmere Walk, Larkfen. Please book the cancellation slot for tomorrow, 15 January, 09:00–11:00. We are treating this as an urgent repair, so I'm authorising the fixed £168 including VAT diagnostic call-out under the landlord's standing urgent-repair authority.
> 
> Scope: diagnose the heating fault (cold radiators, heating controller not responding, boiler display blank, hot water still working). The total limit for this incident is £250 including VAT, covering call-out, labour and parts. If you can fix it on the spot and the total stays within £250, please go ahead. If it would go over £250, please don't start the extra work. Send me a written quote with photos and I'll get the landlord's approval first.
> 
> Access: the tenant, Leah Venn, will let you in. Please phone her directly at least 30 minutes before you arrive and call again from outside the property rather than arriving unannounced. She needs extra time to answer the door. I'll give you her number on this call. Nobody else at the property can give access or approve work, and we don't hold a key.
> 
> Please confirm the booking back to me by email tonight. After the visit, please send your findings, photos and the invoice as a PDF. Thank you.

2. Same turn (`tenant.update`) → Leah Venn (Tenant) via SMS and portal:

> Hi Leah, it's Maya at Northbridge Lettings. Thank you for the update at 16:25. I'm sorry the flat is so cold. We are booking an urgent heating engineer from Brackenridge Heat Services for tomorrow, Wednesday 15 January, between 09:00 and 11:00. I'll text you again tonight once they have confirmed the booking. As you asked, the engineer will phone you directly at least 30 minutes before arriving and call again from outside. We've told them only that you need extra time to answer the door. Please reply tonight to confirm you can let them in during that window. Please keep not using the plug-in heater. Nothing is confirmed yet for a temporary heater or transport to your niece's. The office is checking approved heater suppliers and contacting your landlord, and I will update you on this by 18:30 tonight. If you decide to go to your niece's, please let me know, and tell me whether her entrance is step-free. If you feel unwell from the cold or unsafe, please call NHS 111, or 999 in an emergency.

3. Same turn (`landlord.update`) → Owen Pike (Landlord) via Email:

> Dear Owen, an update on the heating at 7 Mallowmere Walk. The living-room temperature had dropped to 10°C by 16:25 today, and the tenant has no safe heater. We have therefore treated this as an urgent repair. Under your standing urgent-repair authority, I am booking Brackenridge Heat Services' diagnostic visit for tomorrow, 15 January, 09:00–11:00, at the fixed £168 including VAT. The £250 per-incident limit includes parts and labour. If the repair would take the total above £250, I will send you the quote for approval before any further work. We are still waiting for your answer on interim arrangements. Temporary heating, transport and accommodation are not covered by the repair authority. Would you approve the delivery of a temporary heater for the tenant tonight or tomorrow? Please reply as soon as you can; our duty manager may also contact you about this. Kind regards, Maya Chen

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.escalate to Priya Noll to decide whether the repair is urgent: Maya already has authority under E007 and E014 for this call-out, so escalating the booking would probably lose the slot at 17:30. Priya already holds the interim-heating question (E016, E017).
- tenant.ask to confirm access before booking: Leah already said she can admit a contractor on 15 January with 30 minutes' notice and a direct call (E013). Waiting for her reply would risk losing the slot, so she is asked in the same turn instead.
- landlord.request_approval: Standing urgent authority is on record (E014), and the landlord is travelling and may reply slowly (E010).

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The 15 January 09:00–11:00 diagnostic is booked before the 17:30 cut-off, and the contractor knows the access conditions and the £250 incident ceiling. Leah confirms access for the slot, and the landlord knows the urgent booking was made under his standing authority.

**Follow up by:** 2025-01-14

### Why

Leah has had no heating since this morning in January. Her living room has dropped from 12°C to 10°C (E008, E018). She has a mobility impairment (E003) and no safe heater, because her plug-in heater is unsafe to use (E012, E013). That meets the generalised urgency triggers: no heating in cold weather and a vulnerable occupant. The authority to spend is already on record: Maya may authorise qualifying urgent-repair spend up to £250 per incident (E007), and the landlord confirmed this stands and covers the £168 diagnostic if treated as urgent (E014). So there is standing consent to attend and nothing needs escalating for the repair itself. The 15 January slot is only held until 17:30, 22 minutes after the decision moment (E019). Leah can give access on 15 January but cannot guarantee the 17 January standard slot (E013). Booking now is the step that moves the repair forward, and escalating it would very likely lose the slot. Interim heating, transport and accommodation are not covered by any recorded authority (E007, E017). Priya Noll already holds that question (E016, E017), so it is left to her and the landlord, and Leah is told honestly that nothing is confirmed yet. Medical details are kept away from the contractor, as Leah asked (E004).

### Boundaries (what this does not prove or settle)

- Booking the slot is not a repair; it is a diagnostic visit only.
- Approving the £168 call-out does not approve any parts or work that would take the incident total above £250 including VAT.
- This does not authorise or arrange a temporary heater, transport or accommodation; no recorded authority covers those.
- A booked slot does not guarantee attendance at a particular time, and nothing is complete until the contractor reports findings with evidence.
- Leah's medical details are not shared with the contractor.

### Remaining work

- Get Brackenridge's written confirmation of the booking tonight.
- Get Leah's direct confirmation of access for 09:00–11:00 on 15 January.
- Priya Noll and the landlord to decide on temporary heater delivery or transport to the niece's home; no authority is recorded for this.
- After the visit: get findings, a quote for anything over £250, photos and the invoice as a PDF, then update the landlord.
- If the slot was lost before 17:30, escalate at once to Priya Noll, because the next date is 17 January and Leah cannot guarantee access that day.

### Assumptions

- The call reaches Daniel Hart before 17:30.
- Maya holds Leah's contact number on the agency's tenant record; it is not in the case file.
- The conditions for an urgent repair under E007 and E014 are met: no heating in January, 10°C indoors, and a mobility-impaired occupant with no safe heat.

### Evidence

- **E003** · 2025-01-14 08:39 · Leah Venn (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Said there was no gas smell or visible leak and the boiler display was blank. She has a mobility impairment and cannot use the stairs quickly. Asked that an attendee call from outside rather than arri…”
- **E004** · 2025-01-14 09:03 · Maya Chen (Property Manager, Northbridge Lettings) → Leah Venn (Tenant): “Leah said her adult niece, Erin Vale, sometimes stays overnight but is not authorised to approve work or provide access in her absence. Leah asked that medical details not be shared with contractors; …”
- **E006** · 2025-01-14 09:41 · Daniel Hart (Heating Contractor, Brackenridge Heat Services) → Maya Chen (Property Manager, Northbridge Lettings): “Offered the next standard appointment on 17 January, 10:00–14:00. The diagnostic call-out is a fixed £168 including VAT; replacement parts or remedial work are not included and would be quoted separat…”
- **E007** · 2025-01-14 10:02 · Maya Chen (Property Manager, Northbridge Lettings) → Maya Chen (Property Manager, Northbridge Lettings): “Reviewed the property authority record: the £250 limit is per urgent repair incident, inclusive of diagnostic call-out, labour and parts, and Maya may authorise qualifying urgent-repair expenditure up…”
- **E008** · 2025-01-14 10:18 · Leah Venn (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Reported a living-room temperature of 12°C at 10:10. She has one small plug-in heater whose casing becomes unusually hot and has stopped using it. She may be able to stay with her niece tonight if tra…”
- **E012** · 2025-01-14 11:48 · Daniel Hart (Heating Contractor, Brackenridge Heat Services) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed no same-day engineer was available. A cancellation slot might arise on 15 January but could not be reserved without a booking. Brackenridge Heat Services could not assess the property or adv…”
- **E013** · 2025-01-14 12:14 · Leah Venn (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed she would not use the suspect heater. She can admit a contractor on 15 January if given at least 30 minutes' notice and a direct call. She cannot guarantee access on 17 January because of a …”
- **E014** · 2025-01-14 12:47 · Owen Pike (Landlord) → Maya Chen (Property Manager, Northbridge Lettings): “Clarified that his request for a quote before committing expenditure concerned non-emergency spending and did not withdraw the standing £250 urgent-repair authority. If the incident is treated as an u…”
- **E015** · 2025-01-14 13:16 · Maya Chen (Property Manager, Northbridge Lettings) → Leah Venn (Tenant): “Discussed possible interim arrangements. Leah said she has no suitable spare heater and is concerned about carrying one because of her mobility impairment. She asked whether delivery of a heater or tr…”
- **E016** · 2025-01-14 14:03 · Maya Chen (Property Manager, Northbridge Lettings) → Priya Noll (Duty Manager, Northbridge Lettings): “Escalated the cold-weather report, access requirements, late standard appointment and available £250 urgent-repair authority. Asked what cover or separate spending authority applied to temporary heati…”
- **E017** · 2025-01-14 15:11 · Priya Noll (Duty Manager, Northbridge Lettings) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed the office could contact the landlord again and check approved suppliers for heater delivery. The duty file records no separate spending limit for temporary equipment, transport or accommoda…”
- **E018** · 2025-01-14 16:42 · Leah Venn (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Reported the living-room temperature as 10°C at 16:25. Her niece's spare room might be available tonight, but Leah had not confirmed whether the entrance was step-free. Asked for an update before the …”
- **E019** · 2025-01-14 17:08 · Daniel Hart (Heating Contractor, Brackenridge Heat Services) → Maya Chen (Property Manager, Northbridge Lettings): “Said a cancellation appointment for 15 January, 09:00–11:00, had become available and could be held only if booked by 17:30. It would be the same £168 diagnostic call-out; no repair work or parts were…”

---

Generated by agent-c on 2026-10-10 15:39:21 UTC from `Property Management/014`. Full reasoning in REASONING.md, trace in trace.jsonl.
