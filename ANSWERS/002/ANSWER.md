# Case 002: Gas record and boiler visit

**Next action:** Tell the landlord what Flintmere still owes, including that the only signed gas record on file is now over a year old, and ask whether she wants a priced lockout diagnostic

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Send a message (`send_message`) | Nessa Wold (Landlord) | Email | 58% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 24 events (E001–E024), decision moment 2025-10-18 16:35.
- Attachments: A1 attachments/gas-portal-record.pdf (pdf).

## Actions taken

1. **Tell the landlord what Flintmere still owes, including that the only signed gas record on file is now over a year old, and ask whether she wants a priced lockout diagnostic** (`landlord.update`) → Nessa Wold (Landlord) via Email:

> Dear Ms Wold,
> 
> Thank you for your email of 17 October. Here is what is still outstanding from Flintmere Gas Services for 8 Brindlewick Row.
> 
> 1. Signed gas safety paperwork from the 9 October visit (job ref NBL-48217)
> The engineer recorded the check as satisfactory, and the job card lists the boiler and the cooker. On 14 October Flintmere told us its quality desk has paused the signed paperwork while it checks an "appliance installation detail" against the information it already holds for the address. Flintmere has not told us what the detail is, which appliance it concerns, or when the paperwork will be issued. The portal record you sent on 10 October shows the visit as complete, but its customer document is still marked "Processing", so it is not the signed paperwork.
> 
> Please note that the only signed gas record in our file is dated 16 October 2024, which is now more than 12 months ago. The 9 October check is not yet backed by a signed document. Please confirm your own compliance position on this. Today we are asking Flintmere what the query is about, whether it raises any safety concern, and for a firm issue date. We will pass on their answer as soon as we have it.
> 
> 2. The boiler lockouts
> Your instruction for 9 October was for the check only. Flintmere told us on 14 October that a lockout diagnostic would be a separate job. Since 1 October the tenant has reported four lockouts: two in the first week, then 13 October and the morning of 16 October. The 16 October report has not been passed to you before now. Each time the boiler restarted after a reset, and she has not noticed any gas smell. No diagnostic is booked. We note that you have not approved one or any further charge, and we will not instruct anything without your agreement.
> 
> Please let us know by Monday 20 October whether you would like us to ask Flintmere for a price for a lockout diagnostic. The price would come back to you for a decision, and nothing would be booked or charged until you approve it in writing. If you would rather arrange your own engineer, please tell us and we will let the tenant know. The tenant has said she can give access after 21 October.
> 
> If the tenant reports a gas smell, a CO alarm or a lockout that will not reset, or if Flintmere's query turns out to be a safety concern, we will contact you straight away.
> 
> Kind regards,
> Oren Vale
> Property Manager, Northbridge Lettings

2. Same turn (`tenant.update`) → Iona Pell (Tenant) via Portal:

> Dear Ms Pell,
> 
> Thank you for your updates, and I'm sorry for the slow reply. To answer your question of 11 October: the portal record shows that the 9 October visit is complete and the check was recorded as satisfactory. It is not the signed gas safety paperwork, though. Flintmere's office has not issued that yet because it is checking an installation detail. We are asking Flintmere today what that check is about and when the paperwork will be issued, and we will send it to you as soon as we receive it.
> 
> The 9 October visit did not include any work on the boiler lockouts. We are passing your reports of 13 and 16 October to your landlord today and asking her to decide how the lockouts should be looked at. We have noted that you can give access after 21 October. Nothing is booked yet, and we will update you by Monday 20 October.
> 
> Could you also tell us whether there is a carbon monoxide alarm in the flat, and whether it is working?
> 
> In the meantime, if you smell gas, leave the property and call the national gas emergency number straight away. If a CO alarm sounds, or the boiler locks out and will not restart after a reset, please contact us at once.
> 
> Kind regards,
> Oren Vale
> Northbridge Lettings

3. Same turn (`contractor.chase`) → Riva Morn (Service Coordinator, Flintmere Gas Services) via Email:

> Dear Riva,
> 
> Thank you for your email of 14 October about job NBL-48217 at 8 Brindlewick Row (visit on 9 October). Could you please tell us:
> 1. What installation detail your quality desk is checking, and whether it concerns the boiler or the cooker.
> 2. Whether the query raises any safety concern that we should pass to the landlord and tenant now.
> 3. The date the signed gas safety paperwork will be issued.
> 
> Please reply by Monday 20 October. This is a request for information only. No further work or charge is authorised. Separately, the tenant has reported more boiler lockouts, and the landlord is deciding whether to ask you for a price for a diagnostic.
> 
> Kind regards,
> Oren Vale
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.escalate: The annual check was done on 9 October and recorded satisfactory. The gap is a signed document Flintmere is holding, plus a spend decision that belongs to the landlord. No gas smell, CO alarm or loss of heating has been reported. Escalate if any of the triggers listed under remaining work occurs.
- contractor.chase as the main action: The landlord's question in E023 is the open ask waiting on us. Flintmere gets a new question in the same turn.
- case.wait: The tenant and the landlord are both waiting on us, and the tenant's messages have gone unanswered for days.
- contractor.assign for a diagnostic: The landlord has expressly not authorised a diagnostic or any further charge (E016, E023).

## Escalated

No.

## What failed

- Nothing failed.

## Final result

By Monday 20 October the landlord asks for a priced diagnostic, says she will use her own engineer, or declines, and confirms her compliance position. Flintmere explains the installation query, says whether it is a safety issue, and gives a date for the signed paperwork. The tenant knows where things stand and how to stay safe.

**Follow up by:** 2025-10-20

### Why

The landlord asked on 17 October what is still outstanding from Flintmere before any spend is committed (E023). Nobody has replied, and only she can authorise a diagnostic (E005, E016, E023). The records answer her question. The annual check was done on 9 October and recorded satisfactory (E009, A1). The signed paperwork is paused over an unexplained installation detail, with no date given (E019, E021, E024). The only signed record on file is from 16 October 2024 (E002), which she now hears plainly, with no legal conclusion attached. Flintmere says a diagnostic would be a separate job (E019). Four lockouts have been reported, each cleared by a reset with no gas smell (E003, E017, E022), and the 16 October one is new to her. No gas smell, CO alarm or loss of heating has been reported, so the safety triggers haven't fired, and the spend decision is hers, so answering her and asking for the decision is the right step. The tenant has had no reply to E014, E017 or E022, so she gets an update and safety advice in the same turn. Asking Flintmere what the query is and for a date is a new question, not a premature chase.

### Boundaries (what this does not prove or settle)

- Asking for a price does not approve a diagnostic or any spend.
- The portal record and the engineer's 'satisfactory' entry are not signed gas safety paperwork.
- This does not establish whether the property is compliant with gas safety rules; that is for the landlord to confirm.
- It does not decide whether the installation query or the lockouts are a safety defect.
- No visit date is promised to the tenant.

### Remaining work

- Get Flintmere's explanation of the installation query and a firm issue date for the signed paperwork, then send it to the tenant and the landlord.
- Act on the landlord's decision: ask Flintmere for a diagnostic price, or tell the tenant the landlord is using her own engineer.
- Escalate to a person the same day if: a gas smell, CO alarm or lockout that won't reset is reported; Flintmere's query turns out to be a safety finding; the signed paperwork is still unissued with no date at the follow-up; or the landlord declines or stays silent while lockouts continue.
- Record whether a working CO alarm is fitted, from the tenant's reply.

### Assumptions

- 18 October 2025 is a Saturday, so the next working day is Monday 20 October.
- 'Four lockouts' counts 'twice since the weekend' in E003 as two, plus E017 and E022.
- Email is the approved channel for the landlord and for Flintmere, and the portal for the tenant, as the history shows.
- The 9 October visit is the annual check (E005, A1). Only the signed document is outstanding.

### Evidence

- **E001** · 2025-10-01 08:42 · Iona Pell (Tenant) → Oren Vale (Property Manager, Northbridge Lettings): “Please send me the current gas safety paperwork for the flat. The boiler has also started locking out occasionally; could you check whether that is being looked at?”
- **E002** · 2025-10-01 09:18 · Oren Vale (Property Manager, Northbridge Lettings) → Oren Vale (Property Manager, Northbridge Lettings): “Tenancy file contains a gas record dated 16 October 2024. No later record is present in the file.”
- **E003** · 2025-10-01 11:06 · Iona Pell (Tenant) → Oren Vale (Property Manager, Northbridge Lettings): “The boiler has stopped during heating twice since the weekend and restarted after I reset it. It is working at the moment. I have not noticed a gas smell.”
- **E005** · 2025-10-03 08:51 · Nessa Wold (Landlord) → Oren Vale (Property Manager, Northbridge Lettings): “I arranged the annual gas visit with Flintmere Gas Services for 9 October. The instruction was to carry out the check; please do not authorize additional repair costs without asking me.”
- **E009** · 2025-10-09 10:26 · Tavin Rell (Gas Engineer, Flintmere Gas Services) → Riva Morn (Service Coordinator, Flintmere Gas Services): “Visit completed. The job app entry records the check as satisfactory. I noted the tenant's intermittent boiler lockout separately; no repair was included in this instruction.”
- **E012** · 2025-10-10 10:11 · Nessa Wold (Landlord) → Oren Vale (Property Manager, Northbridge Lettings): “I found this gas portal record in my account and have attached it. It may be the paperwork the tenant requested.”
- **E014** · 2025-10-11 08:19 · Iona Pell (Tenant) → Oren Vale (Property Manager, Northbridge Lettings): “I saw the engineer at the boiler during the visit but did not receive a paper record. Can you confirm whether the attached item is the paperwork for the property?”
- **E016** · 2025-10-12 10:02 · Nessa Wold (Landlord) → Oren Vale (Property Manager, Northbridge Lettings): “I have paid Flintmere for the visit. I would prefer not to commission another visit unless they identify a specific reason it is needed. Do not approve extra charges without my agreement.”
- **E017** · 2025-10-13 07:56 · Iona Pell (Tenant) → Oren Vale (Property Manager, Northbridge Lettings): “The boiler locked out again overnight and restarted after I reset it. It is currently heating. There is no gas smell that I can detect.”
- **E019** · 2025-10-14 09:41 · Riva Morn (Service Coordinator, Flintmere Gas Services) → Oren Vale (Property Manager, Northbridge Lettings): “The job card lists the boiler and cooker. Our quality desk has paused issuing the signed paperwork while it reconciles an appliance installation detail against the information already held for the add…”
- **E021** · 2025-10-15 08:33 · Tavin Rell (Gas Engineer, Flintmere Gas Services) → Oren Vale (Property Manager, Northbridge Lettings): “My visit entry records the check as satisfactory. I cannot see the office's paperwork queue or resolve the installation-detail query from my job app.”
- **E022** · 2025-10-16 12:09 · Iona Pell (Tenant) → Oren Vale (Property Manager, Northbridge Lettings): “The boiler locked out once more this morning and came back on after a reset. I can provide access after 21 October if a further visit is arranged. No gas smell noticed.”
- **E023** · 2025-10-17 16:27 · Nessa Wold (Landlord) → Oren Vale (Property Manager, Northbridge Lettings): “I have not approved a separate diagnostic or further charge. Please let me know what is still outstanding from Flintmere before any additional spend is committed.”
- **E024** · 2025-10-18 16:35 · Oren Vale (Property Manager, Northbridge Lettings) → Oren Vale (Property Manager, Northbridge Lettings): “The tenancy file still contains the landlord's portal screenshot, but no signed paperwork from Flintmere has arrived. Flintmere has given no date for resolving its information query. The landlord has …”
- **A1** · attachment attachments/gas-portal-record.pdf

---

Generated by agent-c on 2026-10-10 15:37:04 UTC from `Property Management/002`. Full reasoning in REASONING.md, trace in trace.jsonl.
