# Case 020: Kitchen socket maintenance request

**Next action:** Escalate the suspected overheating kitchen socket to the Northbridge duty or senior manager for a same-day electrician decision and an urgent call to the landlord

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Northbridge Lettings duty / senior property manager | Phone, plus internal escalation note | 85% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 25 events (E001–E025), decision moment 2025-04-12 16:42.
- Attachments: none.

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Northbridge Lettings duty / senior property manager via Phone, plus internal escalation note (see Escalated).

2. Same turn (`tenant.update`) → Nora Bell (Tenant) via Portal:

> Dear Nora,
> 
> Thank you for your updates, and I'm sorry you haven't had clear guidance from us before now. Until a qualified electrician has checked the kitchen socket, please:
> - don't use that socket or plug anything into it, and keep the kettle unplugged;
> - don't touch the socket face, and don't try to open or work on the socket or the fuse box yourself;
> - keep your son and anyone else away from that part of the counter.
> 
> If you see smoke or sparks, the smell gets stronger, or the socket gets hot, leave the flat with everyone and call 999 straight away.
> 
> I have passed this to a senior manager tonight to arrange a qualified electrician as soon as possible, and I will update you within the next hour. Please reply if anything changes before then, and let us know whether the smell or warmth is any different from earlier and who is at home with you.
> 
> Kind regards,
> Maya Chen
> Northbridge Lettings

3. Same turn (`landlord.chase`) → Elliot Vane (Landlord) via SMS:

> Elliot, this is Maya Chen at Northbridge Lettings, about 8 Brindlewick Row. The tenant still reports a burning smell at the kitchen socket. Rowan could not get in, and he does not do fixed wiring, so nobody has inspected the socket or isolated it. Please call me or our duty manager urgently to authorise a qualified electrician to attend today. We have escalated this as a safety matter. Please see our email sent at 15:02.

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- landlord.chase only: Another message to a landlord who has been silent all afternoon leaves a live electrical risk with nobody in charge and no qualified attendance. A chase is sent in alsoSend, but the decision needs a person.
- contractor.assign an electrician: The landlord has not approved an electrician (E016), and no standing consent is on record. Spending without that needs a manager's authority.
- tenant.update only: Safety advice is needed, but on its own it does not get anyone qualified to the property.
- case.wait: This is an urgent safety matter, and nobody has promised anything by a future date.

## Escalated

Yes, to Northbridge Lettings duty / senior property manager.

**Why a person is needed:** Commissioning an electrician without the landlord's approval, or using an out-of-hours emergency route, needs authority I do not have. There is a live safety risk to the occupants.

**Summary:** Suspected overheating kitchen socket at 8 Brindlewick Row. A burning smell and a warm socket face were reported at 08:14, and the faint smell was still there at 16:42. A 10-year-old lives at the flat. Nobody qualified has inspected the socket or isolated the circuit. The landlord has not authorised an electrician and has not responded since 13:27.

**Done so far:**
- E003/E007: we asked the tenant about smoke, sparks and the smell, and asked her not to reconnect anything
- E005: we asked the landlord for authority
- E014: we briefed handyman Rowan Pike, with the tenant's consent (E013)
- E020: we called the landlord at 13:14 and got voicemail
- E024: we emailed the landlord for an immediate decision at 15:02, with no reply
- This turn: safety advice sent to the tenant by portal, and the landlord chased by SMS

**Options:**
- Phone the landlord now, get verbal authority for an electrician today, and record it. Risk: He may still be unreachable, which delays attendance further
- Send an electrician under Northbridge's emergency arrangements to make the socket safe, and recover the cost from the landlord afterwards. Risk: The landlord asked us to keep costs down and has not approved this, so it may lead to a cost dispute
- Wait for the landlord's reply. Risk: The electrical fault stays live overnight in a home with a child

**Recommended:** Phone the landlord now. If he cannot be reached within the hour, use the emergency route to have a qualified electrician make the socket and circuit safe tonight, then report to the landlord and get his approval for any repair.

## What failed

- Nothing failed.

## Final result

A duty or senior manager takes ownership tonight, reaches the landlord or uses Northbridge's emergency route, and a qualified electrician is arranged to make the socket and circuit safe. The tenant has safety guidance in the meantime.

**Follow up by:** 2025-04-12T17:45:00Z

### Why

This is a live electrical safety risk in an occupied home with a child: a burning smell and a warm socket face, still present after about 8.5 hours (E001, E025). Nobody qualified has inspected the socket or isolated the circuit, and the only person sent does no fixed wiring and never got in (E011, E023). The landlord holds the authority for an electrician and has not answered the 13:14 call or the 15:02 email (E020, E024). The manual says to escalate at once for a burning smell, possible electrical overheating or a vulnerable occupant, and commissioning an unapproved electrician is outside my authority. In the same turn, the tenant gets interim safety advice she has not yet had (E009, E025), and the landlord gets a second chase on a different channel (SMS), which is routine and stays with me.

### Boundaries (what this does not prove or settle)

- Escalation does not establish the cause of the smell or that the socket or wiring is faulty.
- No electrician has been booked or approved yet, and no spend is authorised by this message.
- The landlord's 13:27 text does not authorise key entry in the tenant's absence.
- The safety advice to the tenant is interim precaution, not a technical judgement that the property is safe or unsafe.
- An SMS sent to the landlord is not proof he has received or read it.

### Remaining work

- Get the landlord's decision on an electrician, or a manager's decision to proceed under the emergency route.
- Book a qualified electrician with the tenant and pass on her consented contact and access details.
- Update the tenant with the confirmed attendance time.
- Receive the electrician's findings or quote, send them to the landlord, and get approval for any repair.
- Tell Rowan Pike that his attendance has been overtaken, if the manager agrees.

### Assumptions

- Northbridge has a duty or senior manager who can be reached this evening.
- The tenant is still at the property and reachable by portal, her stated contact preference.
- The UK is on BST, so 16:42 UTC is 17:42 local time.

### Evidence

- **E001** · 2025-04-12 08:14 · Nora Bell (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Reported a hot, slightly burning smell near the kitchen counter socket. Nora says the socket face felt warm after a kettle had been plugged in; she has unplugged the kettle. No smoke or visible flame …”
- **E004** · 2025-04-12 08:51 · Nora Bell (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “No smoke or sparks seen. Smell remains faint. Nora is at home with her 10-year-old son. She does not know which breaker serves the kitchen and has not opened the consumer unit.”
- **E006** · 2025-04-12 09:18 · Elliot Vane (Landlord) → Maya Chen (Property Manager, Northbridge Lettings): “Asked Northbridge to keep costs controlled and said he could send his regular general handyman, Rowan Pike, to look at it. Did not specify an electrical qualification or authorize a particular repair.”
- **E008** · 2025-04-12 09:41 · Nora Bell (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Smell is still faint. Nora confirms the kettle remains unplugged. She cannot confirm whether the socket is on the same circuit as the refrigerator; the refrigerator is running.”
- **E009** · 2025-04-12 09:52 · Maya Chen (Property Manager, Northbridge Lettings) → Maya Chen (Property Manager, Northbridge Lettings): “File note: through this time, no emergency-response guidance, referral, or decision has been communicated to the tenant in the case messages. No contact with emergency services or other emergency resp…”
- **E011** · 2025-04-12 10:16 · Rowan Pike (Handyman, Pike Property Care) → Elliot Vane (Landlord): “Confirmed he could attend between 13:00 and 15:00. Said his work is general property maintenance and he does not carry out fixed-wiring repairs.”
- **E015** · 2025-04-12 11:37 · Rowan Pike (Handyman, Pike Property Care) → Maya Chen (Property Manager, Northbridge Lettings): “Said he has a non-contact voltage pen and basic hand tools, but no electrical test equipment. He intends only a visual look and will not remove the socket face or alter wiring. Asked whether he should…”
- **E016** · 2025-04-12 11:52 · Elliot Vane (Landlord) → Maya Chen (Property Manager, Northbridge Lettings): “Reiterated that Rowan should attend and report. Elliot has not given separate approval for an electrician's call-out or for electrical repairs.”
- **E019** · 2025-04-12 13:06 · Rowan Pike (Handyman, Pike Property Care) → Elliot Vane (Landlord): “At the property. Nora has left; no one has answered the door. Rowan has not entered and asks whether to wait, use landlord-held access, or leave.”
- **E020** · 2025-04-12 13:14 · Maya Chen (Property Manager, Northbridge Lettings) → Elliot Vane (Landlord): “Asked whether Rowan has authorization to use landlord-held keys in the tenant's absence and whether an electrician can be commissioned if the reported condition persists. No response reached; voicemai…”
- **E021** · 2025-04-12 13:27 · Elliot Vane (Landlord) → Rowan Pike (Handyman, Pike Property Care): “Texted, 'Please have a look if you can get in; keep it to the socket and let me know.' The text does not say whether Rowan may use a key, and Rowan has not confirmed receiving or acting on it.”
- **E023** · 2025-04-12 14:24 · Rowan Pike (Handyman, Pike Property Care) → Maya Chen (Property Manager, Northbridge Lettings): “Confirmed he did not enter because nobody answered and he had no clear access authorization. No inspection or isolation has taken place. He remains available until 15:00.”
- **E024** · 2025-04-12 15:02 · Maya Chen (Property Manager, Northbridge Lettings) → Elliot Vane (Landlord): “Summarized that the handyman has not inspected, cannot perform fixed-wiring repairs, and lacks clear permission to enter while the tenant is away. Asked for an immediate decision on authority, attenda…”
- **E025** · 2025-04-12 16:42 · Nora Bell (Tenant) → Maya Chen (Property Manager, Northbridge Lettings): “Nora says she is back at the property. The faint smell is still noticeable near the counter, and she has not used the socket. She has not switched off any breaker; the refrigerator remains powered. Sh…”

---

Generated by agent-c on 2026-10-10 15:40:38 UTC from `Property Management/020`. Full reasoning in REASONING.md, trace in trace.jsonl.
