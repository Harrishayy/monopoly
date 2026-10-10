# Case 016: Smoke alarm maintenance request

**Next action:** Hand NBL-016 to Dorian Pike: the smoke alarm has been down for about 6 weeks, the occupant may be vulnerable, the landlord has gone quiet and an unverified visitor came to the door

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Dorian Pike (Maintenance Operations Lead, Northbridge Lettings) | Internal note | 72% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 17 events (E001–E017), decision moment 2025-09-22 08:48.
- Attachments: none.

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Dorian Pike (Maintenance Operations Lead, Northbridge Lettings) via Internal note (see Escalated).

2. Same turn (`landlord.chase`) → Ronan Vale (Landlord) via Email:

> Dear Mr Vale,
> 
> I am following up on the smoke alarm at 26 Tallowmere Close (our ref NBL-016). On 12 August you told us your electrician would contact the tenant and finish the work by the following weekend. We have had no confirmation that it was done. The tenant told us a fitter came in early September, removed the bracket and could not refit the alarm because there was no bracket in the box. As far as we know, the alarm is still not mounted or tested.
> 
> Because this is a smoke alarm, please reply by Wednesday 24 September with:
> 1. the name, company and contact number of your electrician or fitter;
> 2. the date they will refit and test the alarm (we would ask for this as soon as possible);
> 3. whether you or your electrician sent anyone to the property on the morning of Saturday 20 September.
> 
> Please make sure any visit is agreed in advance and arranged through us, so the tenant knows who is coming. If we have not heard from you by Wednesday, I will call you to agree how to get this resolved.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

3. Same turn (`tenant.update`) → Elise Rowan (Tenant) via Email:

> Dear Elise,
> 
> Thank you for letting us know about the visitor on Saturday morning. You were right not to let in someone you could not verify. We are checking with your landlord and his electrician whether anyone was sent. Until we tell you otherwise, please do not let anyone in unless we have given you their name and the date beforehand.
> 
> We are also pressing your landlord for a firm date to refit and test the smoke alarm. We will email you only, with no calls, by Thursday 25 September with what we have found out. You do not need to reply to this email. If you have any concern about your safety in the meantime, please contact us.
> 
> Kind regards,
> Maya Chen
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- landlord.chase as the main action: This is overdue and is sent in alsoSend. But with a smoke alarm missing for 6 weeks and a possibly vulnerable occupant, a person must own the decision on stepping in and on contact with the tenant.
- case.wait for the tenant to report completion (E013): A safety device has been down for 6 weeks. The landlord's date has passed and no date is pending, so waiting is not safe.
- contractor.assign an agency electrician: The landlord is managing the repair himself and has not approved our contractor. Access also needs the tenant, who has asked not to be contacted.

## Escalated

Yes, to Dorian Pike (Maintenance Operations Lead, Northbridge Lettings).

**Why a person is needed:** Three things need a person: authority to step in on the landlord's repair and approve spend, judgement on contacting a possibly vulnerable tenant who asked for a pause, and handling a possible security or scam concern.

**Summary:** Since 7 Aug the smoke alarm at 26 Tallowmere Close has been off the ceiling. A refit about 2 Sept failed because there was no bracket. The landlord is managing the repair himself, missed his own mid-August deadline and has been silent since 12 Aug. The tenant, recently out of hospital, asked us to pause contact. On 20 Sept they reported an unverified visitor at the door.

**Done so far:**
- E003: asked the landlord about the installer
- E005: asked the landlord for a completion date and confirmation
- E008–E010: status checks with the tenant
- E014: tenant contact paused at the tenant's request
- E016: visitor report logged
- This turn: landlord chased by email (reply by 24 Sept); one email to the tenant that needs no reply

**Options:**
- Phone the landlord on 24 Sept if he has not replied, and ask for the alarm to be remounted and tested within 48 hours or for approval of our contractor. Risk: He may stay silent. The alarm stays down meanwhile.
- Arrange an agency contractor now under any authority you hold. Risk: There is no landlord approval on record. Access still needs the tenant.
- One named person calls the tenant once to arrange access. Risk: It may upset the tenant, given their request in E013.

**Recommended:** Chase the landlord by phone on 24 Sept for a 48-hour remount or approval of our contractor. Name one person as the tenant's only contact. Follow up the visitor with building management.

## What failed

- Nothing failed.

## Final result

Dorian takes ownership and decides on urgency, the landlord route and how to contact the tenant. The landlord replies with the electrician's details and a remount date, or is phoned on 24 Sept.

**Follow up by:** 2025-09-24

### Why

A missing or failed smoke alarm and a possibly vulnerable occupant are both escalation triggers. Here the alarm has been off the ceiling since 7 Aug, and a refit failed about 2 Sept (E010, E014). The tenant was recently discharged from hospital (E013). Three decisions need a person: whether to step in on the landlord's behalf (spend and compliance authority), whether the tenant's contact pause can be overridden to get access, and how to deal with an unverified visitor (E015, E016). The routine steps still go out now, as alsoSend. The landlord's promise lapsed in mid-August and he has never been chased, so a chase is overdue (E005, E007). The tenant contacted us about the visitor and is owed one low-pressure written reply with a date (E015).

### Boundaries (what this does not prove or settle)

- Escalating does not fix the alarm or show that it is safe.
- The visitor has not been identified and must not be assumed to be connected to the alarm work or to the landlord.
- Nothing here approves spend on an agency contractor; that needs the landlord's approval or Dorian's authority.
- The tenant's medical details are not shared with the landlord or any third party.
- No finding is made about whether the landlord has breached any legal duty.

### Remaining work

- Landlord to confirm the electrician's identity, a remount-and-test date, and whether he sent anyone on 20 Sept
- Arrange access with the tenant in a way that respects the contact pause
- Get completion evidence (alarm mounted and tested) from the electrician or the landlord, and the tenant's confirmation
- Tell the tenant who the visitor was once that is known

### Assumptions

- The tenant's hospital admission was on Fri 5 Sept and the visit was on Sat 20 Sept; the computed date resolutions are wrong
- Nothing outside the record shows the landlord was chased after 7 Aug
- The landlord's preferred channel is email, which is the only one on record

### Evidence

- **S:initial-request** · Initial request: “The smoke alarm has come away from the ceiling and needs attention.”
- **E001** · 2025-08-07 09:58 · Elise Rowan (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Reported that the smoke alarm had come away from the ceiling and needed attention. No photographs or other attachments were supplied.”
- **E004** · 2025-08-07 16:14 · Ronan Vale (Landlord) → Maya Chen (Property Manager, Northbridge Lettings): “Replied briefly that they would use their own electrician to have a look. No electrician's name, work scope, or visit date was provided.”
- **E005** · 2025-08-07 16:55 · Maya Chen (Property Manager, Northbridge Lettings) → Ronan Vale (Landlord): “Acknowledged that the landlord would arrange the work and asked for an expected completion date and confirmation once it was finished.”
- **E007** · 2025-08-12 05:55 · Ronan Vale (Landlord) → Maya Chen (Property Manager, Northbridge Lettings): “Said the electrician would contact the tenant and complete the work by the following weekend at the latest. No contractor details or confirmed appointment were included.”
- **E010** · 2025-09-02 15:50 · Maya Chen (Property Manager, Northbridge Lettings) → Elise Rowan (Tenant): “Tenant said a fitter, not the landlord, had attended, removed the bracket, and could not refit the alarm because the box had no bracket in it. The alarm remained unmounted. Tenant thought the fitter m…”
- **E012** · 2025-09-07 16:57 · Elise Rowan (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed that the alarm work was not finished. Tenant said the fitter had been due on Sunday, but they had been admitted to hospital on Friday. They expected to arrange it when home and said they wou…”
- **E013** · 2025-09-11 13:12 · Elise Rowan (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Said the fitter had still not completed the alarm and that they had just been discharged from hospital. Tenant said they would arrange it and report when complete, and asked the agency to leave them a…”
- **E014** · 2025-09-11 17:40 · Maya Chen (Property Manager, Northbridge Lettings) → Dorian Pike (Maintenance Operations Lead, Northbridge Lettings): “Recorded a pause in tenant contact in response to the tenant's request while they recovered. There was no evidence on file that the alarm had been mounted or tested.”
- **E015** · 2025-09-20 10:15 · Elise Rowan (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Reported an unannounced person knocking at the property on Saturday morning and saying they were there to check something. Tenant did not let the person in because they could not verify who they were …”
- **E016** · 2025-09-20 11:02 · Maya Chen (Property Manager, Northbridge Lettings) → Dorian Pike (Maintenance Operations Lead, Northbridge Lettings): “Recorded the tenant's account that they had previously raised the unexpected knock with another agency contact, who said it had been passed to a building-management contact. The visitor's identity, or…”
- **E017** · 2025-09-22 08:48 · Maya Chen (Property Manager, Northbridge Lettings) → Dorian Pike (Maintenance Operations Lead, Northbridge Lettings): “NBL-016 is pending review.”

---

Generated by agent-c on 2026-10-10 15:39:27 UTC from `Property Management/016`. Full reasoning in REASONING.md, trace in trace.jsonl.
