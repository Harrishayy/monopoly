# Case 029: Heating-system visit enquiry

**Next action:** Tell the tenant that no heating visit or key arrangement has been confirmed, ask her not to leave a key in the meter cabinet, and give her a date for our next update

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Send a message (`send_message`) | Elowen Vey (Tenant) | Portal, plus a short SMS pointing her to it | 62% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 20 events (E001–E020), decision moment 2025-05-14 13:48.
- Attachments: none.

## Actions taken

1. **Tell the tenant that no heating visit or key arrangement has been confirmed, ask her not to leave a key in the meter cabinet, and give her a date for our next update** (`tenant.update`) → Elowen Vey (Tenant) via Portal, plus a short SMS pointing her to it:

> Hello Elowen,
> 
> Thank you for your messages, and I am sorry you have not had a reply from us before now.
> 
> As of today, 14 May:
> 1. No heating visit has been confirmed. We have not booked Saturday 17 May, and neither has your landlord. There is no work order for the property.
> 2. No key arrangement has been agreed. Please do not leave a key in the meter cabinet or anywhere outside the property. Please do not confirm a time with the caller for now.
> 3. We are checking the caller's company and identity details, and we are checking with your landlord. We will not give your contact details to anyone without your agreement.
> 4. Nobody will be asked to let a visitor in through your son, and he does not need to answer the door to anyone about this.
> 5. You told us on 13 May that you could be home on Saturday 17 May between 10:00 and 12:00. We will only offer that time to a contractor once we have checked who they are, and we will confirm the visitor's name and the reason for the visit to you in writing first. If we cannot do that in time, the visit will not go ahead on Saturday.
> 
> Please let us know if you get any more calls or messages from this number, or if anyone comes to the property about the boiler without our written confirmation. If you notice a smell of gas, call the gas emergency number straight away and then let us know. Please also tell us if the heating or hot water stops working.
> 
> We will update you by 12:00 on Thursday 15 May, whether or not a visit has been confirmed.
> 
> Kind regards,
> Tamsin Rook
> Northbridge Lettings
> 
> [SMS: Hi Elowen, this is Tamsin at Northbridge Lettings. No boiler visit or key arrangement has been confirmed. Please do not leave a key in the meter cabinet. I have sent you the details on the portal.]

2. Same turn (`contractor.update`) → Bram Alder (Hearthline Boiler Service) via Email:

> Dear Bram,
> 
> I am writing about 62 Brindlewick Row. No visit has been confirmed and there is no work order. Please do not ask the tenant to leave a key in the meter cabinet or anywhere else. No key arrangement and no entry while the tenant is absent has been agreed. Please make all access arrangements through us, not directly with the tenant.
> 
> The landlord wants the intermittent boiler pressure loss looked at by a suitably identified heating engineer. Before we can confirm any visit, please send by 12:00 on Thursday 15 May:
> - your company's registered name and business address
> - a business landline
> - the name of the engineer who would attend
> - your public liability insurance details
> 
> Once we have checked these with the landlord, we will confirm in writing whether a visit can go ahead and the agreed time. Until then, please do not attend.
> 
> Kind regards,
> Tamsin Rook
> Northbridge Lettings

3. Same turn (`landlord.update`) → Orren Vale (Landlord) via Email:

> Dear Mr Vale,
> 
> This adds to my email this morning about the heating visit at 62 Brindlewick Row. At 13:48 today Bram Alder texted the tenant directly. He offered Saturday 17 May between 08:00 and 13:00 and asked her to leave the key in the outside meter cabinet if she is out. That cabinet is shared with neighbouring homes. We have told the tenant that no visit or key arrangement has been agreed, and we have asked Mr Alder for his company name, business address and landline, the engineer's name and his insurance details.
> 
> The tenant can be at home on Saturday 17 May between 10:00 and 12:00 if the visitor and purpose are confirmed to her in advance. Please could you confirm by 12:00 on Thursday 15 May whether Mr Alder is the contractor you are engaging, and whether you agree to the visit being booked only while the tenant is at home, with no key left outside. We will not confirm any visit until we hear from you.
> 
> Kind regards,
> Tamsin Rook
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.escalate: The playbook already covers this: verify the contractor, stop an unauthorised key arrangement, and refuse to share the tenant's details. No decision needs a person's authority yet. Escalation is kept for failed verification, a visit attempt, or a safety sign.
- contractor.update as the main action: Telling the contractor matters, but the tenant is the person exposed to the key request right now and has had no reply in 2 days. The contractor message goes in alsoSend.
- landlord.chase: E019 was sent only about 4 hours ago, so a chase would be premature. The landlord gets an update with the new fact instead.
- case.wait: There is a live, unauthorised key request to the tenant and she has had no reply from us since 12 May.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

The tenant does not leave a key or confirm the caller's time, and tells us about any further contact. The contractor sends verifiable business details. The landlord confirms whether he is engaging Bram Alder and what access he authorises. If those come in, a visit can be confirmed in writing for Saturday 10:00–12:00 while the tenant is at home.

**Follow up by:** 2025-05-15

### Why

The tenant has been waiting on us since 12 May. She asked whether a visit had actually been arranged (E010), gave conditional Saturday availability (E015) and reported more contact (E018). The record shows no reply from the agency. At the decision moment the caller texted her directly to confirm Saturday 08:00–13:00 and leave the key in a shared outdoor meter cabinet (E020, E010). Nobody has authorised that: the landlord approved only a diagnostic visit by a suitably identified contractor, and agreed no entry while she is out and no external key (E014). The key-drop authorisation field and the work-order appointment are both empty (E013). The most urgent step is to stop the key drop and give the tenant the facts. This is routine handling, so a person is not needed yet: we can verify the contractor and wait for the landlord's answer to E019 ourselves. In the same turn, the contractor is told what he must provide and that access goes through us. The landlord is told about the new key request so he has it when he answers E019. His reply is only about 4 hours old, so this is not a chase.

### Boundaries (what this does not prove or settle)

- This does not confirm or cancel any visit with the contractor. It only tells the tenant that nothing has been confirmed.
- It makes no finding that the caller is or is not a genuine contractor.
- It does not authorise any key arrangement or entry while the tenant is out. Only the landlord can decide that.
- No tenant contact details are shared. Her consent field is empty.
- It does not promise that the boiler will be looked at on Saturday.

### Remaining work

- Get the landlord's reply to E019: whether he is engaging Bram Alder or Hearthline, and what access he authorises.
- Receive Bram Alder's business details and check them with the landlord.
- If he is verified and the landlord agrees, raise a work order and confirm Saturday 17 May 10:00–12:00 in writing to the tenant and the contractor, with the tenant at home and no key drop.
- Update the tenant by 12:00 on Thursday 15 May.
- Escalate to a person if the details cannot be verified by Thursday, if anyone attempts a visit or asks for a key again, or if a gas or CO sign is reported.

### Assumptions

- The portal and SMS are working channels to the tenant, since she has used both (E001, E003, E018).
- The Wednesday 14 May morning slot has passed with no attendance recorded (E012 says it was never booked). The computed fact saying Wednesday has not been reached ignores the time of day.
- Email is the working channel to the contractor and the landlord (E004, E008, E016, E019).

### Evidence

- **E001** · 2025-05-12 08:10 · Elowen Vey (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Tenant reports that a caller identifying himself as a heating contractor asked her to leave the front-door key in the outside meter cabinet for a possible visit on Wednesday morning, May 14. She has n…”
- **E003** · 2025-05-12 09:02 · Elowen Vey (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Tenant says the caller gave the name Bram Alder and called from 07700 900683. She confirmed the property when asked but did not provide an entry code or other access details.”
- **E006** · 2025-05-12 10:46 · Elowen Vey (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Tenant says she will be away during the proposed Wednesday morning period. Her 15-year-old son may return from school while she is out; she does not consider him an access contact and does not want hi…”
- **E008** · 2025-05-12 12:05 · Tamsin Rook (Property Manager, Northbridge Lettings) → Bram Alder (Contractor, Hearthline Boiler Service): “Requested confirmation of his current business identity and contact details, the work he understands he has been asked to perform, and the proposed visit time. Asked whether he had requested that the …”
- **E009** · 2025-05-12 13:16 · Bram Alder (Contractor, Hearthline Boiler Service) → Tamsin Rook (Property Manager, Northbridge Lettings): “Says he understood Orren Vale wanted him to 'check the boiler' and that Wednesday morning might suit. Says the meter-cabinet key request was intended to avoid a wasted journey. His reply includes no w…”
- **E010** · 2025-05-12 14:02 · Elowen Vey (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Tenant says the meter cabinet is outside and shared with neighboring homes. She asks whether a visit has actually been arranged and says she has no appointment details.”
- **E011** · 2025-05-12 15:18 · Orren Vale (Landlord) → Tamsin Rook (Property Manager, Northbridge Lettings): “Landlord says Bram Alder has previously done work for him at another property, but he has not checked the contractor's current business details or insurance. He wants the pressure issue investigated b…”
- **E012** · 2025-05-13 08:03 · Tamsin Rook (Property Manager, Northbridge Lettings) → Bram Alder (Contractor, Hearthline Boiler Service): “Bram says Wednesday was not booked as a confirmed appointment and that he has not started travelling. He describes the task as an initial visual check and pressure reading, not a specified repair. He …”
- **E013** · 2025-05-13 08:29 · Tamsin Rook (Property Manager, Northbridge Lettings) → Northbridge Lettings workflow (System): “Maintenance enquiry NBL-029-01 remains open. Correspondence logged: landlord email of 12 May at 10:11 and contractor call of 13 May at 08:03. Work-order appointment entry: EMPTY. External key-drop aut…”
- **E014** · 2025-05-13 10:22 · Orren Vale (Landlord) → Tamsin Rook (Property Manager, Northbridge Lettings): “Landlord authorizes a diagnostic visit by a suitably identified heating contractor to investigate intermittent pressure loss. He does not confirm that Bram Alder is currently engaged by Hearthline Boi…”
- **E015** · 2025-05-13 11:41 · Elowen Vey (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Tenant reports the heating is currently working, although boiler pressure has dropped intermittently during the past month. She could be home Saturday, May 17, between 10:00 and 12:00 if the visitor a…”
- **E016** · 2025-05-13 12:26 · Bram Alder (Contractor, Hearthline Boiler Service) → Tamsin Rook (Property Manager, Northbridge Lettings): “Bram says Saturday might be possible but he has not checked his schedule. He asks for the tenant's mobile number so he can coordinate directly. No visit time or company contact details are provided.”
- **E017** · 2025-05-13 14:05 · Tamsin Rook (Property Manager, Northbridge Lettings) → Northbridge Lettings workflow (System): “Tenancy record holds Elowen Vey's contact details. Consent field for disclosure to Bram Alder: EMPTY. Appointment correspondence logged: tenant message of 13 May at 11:41 and contractor email of 13 Ma…”
- **E018** · 2025-05-14 08:17 · Elowen Vey (Tenant) → Tamsin Rook (Property Manager, Northbridge Lettings): “Tenant reports a message from the same number used by the caller: 'Still aiming for Saturday. If you're out, key in the meter cabinet would help.' The message gives no appointment window or business a…”
- **E019** · 2025-05-14 09:36 · Tamsin Rook (Property Manager, Northbridge Lettings) → Orren Vale (Landlord): “Asked the landlord to clarify whether Bram Alder is the contractor he intends to engage and to confirm the access arrangements he is authorizing. No reply is yet recorded.”
- **E020** · 2025-05-14 13:48 · Bram Alder (Contractor, Hearthline Boiler Service) → Elowen Vey (Tenant): “Message from 07700 900683: 'I can come Saturday sometime between 08:00 and 13:00. Can you confirm and leave the key in the meter cabinet if you won't be there?' The tenant has not replied.”

---

Generated by agent-c on 2026-10-10 15:42:52 UTC from `Property Management/029`. Full reasoning in REASONING.md, trace in trace.jsonl.
