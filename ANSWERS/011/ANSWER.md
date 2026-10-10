# Case 011: Kitchen ceiling leak inspection at 16 Brindlewick Mews

**Next action:** Hand the stalled kitchen ceiling leak repair to a Northbridge Lettings manager or safety lead. The repair is stopped because of an unidentified fibrous lining. The leak keeps coming back and a young child lives in the flat. Any assessment needs spend the landlord has not approved.

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Northbridge Lettings – property management manager / health and safety lead (internal) | Internal escalation note | 70% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 24 events (E001–E024), decision moment 2025-06-13 15:26.
- Attachments: none.

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Northbridge Lettings – property management manager / health and safety lead (internal) via Internal escalation note (see Escalated).

2. Same turn (`tenant.update`) → Iven Rell (Tenant) via Portal:

> Dear Iven,
> 
> Thank you for your update this morning, and for not using the kitchen tap and leaving the hatch alone.
> 
> The contractor has left without opening the ceiling. Before any work goes ahead near the lining he saw, we need to find out what it is. I have passed the case to a senior colleague so that the next steps can be agreed with your landlord. No new appointment has been set yet.
> 
> In the meantime, please:
> - keep not using the kitchen tap;
> - keep not opening the hatch or touching the ceiling, and keep everyone in the household, especially children, away from the area directly under the patch;
> - tell us straight away by phone or the portal if dripping increases, water reaches any light fitting or socket, the ceiling starts to sag, or any dust or debris falls from the ceiling.
> 
> We will update you by Monday 16 June 2025.
> 
> Kind regards,
> Mara Voss
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.wait for the landlord's reply to E024: The landlord wants a cost and timing that nobody can supply yet, so waiting would leave a recurring leak and a possibly hazardous material with no owner.
- contractor.assign a specialist surveyor: The landlord has expressly not approved an assessment (E022), and choosing a specialist is a decision for a person.
- landlord.chase: The landlord was asked at the decision moment (E024), so a chase now would be premature.

## Escalated

Yes, to Northbridge Lettings – property management manager / health and safety lead (internal).

**Why a person is needed:** Someone has to decide how the material will be identified and by whom, get a price to put to the landlord, and set the interim safety position. That needs safety judgement and authority to spend that the case handler does not have.

**Summary:** The kitchen ceiling leak repair at 16 Brindlewick Mews has stopped. To reach the leaking joint the contractor would have to drill or cut near a pale, fibrous-looking lining that nobody has identified. The leak comes back whenever the tap is used, and a young child lives in the flat. The landlord has approved only the plumbing quote and wants a cost and timing before she considers paying for an assessment.

**Done so far:**
- E008 Non-invasive inspection instructed
- E009 Moisture seen at the joint; joint out of reach through the hatch
- E011 Estimate received; it excludes any work on suspect material
- E013 Landlord approved the plumbing scope only
- E014 Contractor told the approval covers the plumbing scope only
- E018 Contractor told not to disturb the lining
- E019 Tenant told not to touch the hatch or ceiling
- E021 Tenant's drip report passed to the contractor
- E023 Contractor left without opening the ceiling
- E024 Landlord asked for a decision on further scope

**Options:**
- Get a quote from a qualified specialist to identify the lining and send it to the landlord for approval. Risk: Takes time while the leak keeps recurring; the landlord may delay.
- Ask the landlord to approve the contractor isolating the affected pipe without touching the ceiling, as a holding measure. Risk: Needs the landlord's approval; it may affect the tenant's kitchen water supply.
- Wait for the landlord's reply without a price. Risk: She has already said she will not decide without a cost and timing, so the job stays stuck.

**Recommended:** Get a specialist identification quote now and send it to the landlord with the timing. At the same time, ask her whether she will approve isolating the pipe as an interim measure. Update the tenant by 16 June.

## What failed

- Nothing failed.

## Final result

A manager or safety lead takes ownership. They decide how the lining will be identified and arrange a specialist price and timing to put to the landlord. They also decide the interim safety position for the leak. The tenant gets a dated update.

**Follow up by:** 2025-06-16

### Why

The repair cannot go ahead as approved. The planned ceiling opening would disturb an unidentified fibrous lining, and the contractor has stopped work and cannot price or specify an assessment (E017, E023). The landlord has refused to treat a material assessment as covered by her approval and wants the cost and timing first (E022). Nobody in the records can supply that cost, so the agency needs someone to decide who identifies the material and how. Meanwhile there is an active leak that recurs when the tap is used (E020), in a home with a young child (E007). The manual's triggers point to escalation rather than waiting or chasing: a possible hazardous material with no safe way to retry the work, an active leak, a vulnerable occupant, and spend or scope beyond what was approved. The landlord was asked at the decision moment (E024), so chasing her now would be premature. Under refinement 6, the routine tenant update goes out in this same turn.

### Boundaries (what this does not prove or settle)

- This escalation does not identify the lining or say whether it is hazardous.
- No assessment, ceiling opening, pipe isolation or extra spend is approved; the landlord approved only the original plumbing quote.
- No repair date or cost has been promised to the tenant or the landlord.
- The source of the leak has been seen at the joint but not confirmed; the communal roof and stack have not been ruled out.
- Sending the tenant update does not confirm the tenant has read it.

### Remaining work

- Get a specialist identification price and timing, and send them to the landlord for approval.
- Get affected-area photographs from the contractor.
- Answer the landlord's request for cost and timing (E022) once a figure exists.
- Ask the building manager for the result of the communal roof inspection.
- Re-instruct the plumbing repair only once the material is identified and any change in scope or cost is approved.
- Update the tenant by Monday 16 June 2025.

### Assumptions

- 13 June 2025 is a Friday, so the next working day for a follow-up is Monday 16 June.
- The internal escalation owner is not named in the records.
- The computed flags showing E006 and E014 as unanswered are wrong: E006 is Bren's reply and E015 answers E014. The 13 June visit took place (E017).

### Evidence

- **S:initial-request** · Initial request: “Please arrange an inspection of a damp patch and occasional dripping from the kitchen ceiling. The patch has returned after rain.”
- **E003** · 2025-06-10 09:17 · Iven Rell (Tenant) → Mara Voss (Property Manager, Northbridge Lettings): “Says there is no light directly below the patch, kitchen sockets appear dry, and no water is dripping at present. Describes a ceiling stain and a narrow crack but cannot identify the material or the s…”
- **E006** · 2025-06-10 13:06 · Bren Talwick (Building Manager, Alderwake Court) → Mara Voss (Property Manager, Northbridge Lettings): “Reports no current building-wide leak notification. A communal roof inspection is planned for the following week. Bren has not inspected the flat ceiling and has no flat-specific ceiling survey or alt…”
- **E007** · 2025-06-10 14:18 · Mara Voss (Property Manager, Northbridge Lettings) → Iven Rell (Tenant): “Offers an inspection on 2025-06-11 between 10:30 and 12:30. Iven agrees to the window, says they will be home to let the contractor into the flat, and asks for a call on arrival because a young child …”
- **E008** · 2025-06-10 15:02 · Mara Voss (Property Manager, Northbridge Lettings) → Kellan Orve (Contractor, Mossbarrow Pipe Services): “Instructs a non-invasive leak and pipework inspection only, with no drilling, cutting, sampling, or opening-up without further written authority. Provides the agreed access window and requests affecte…”
- **E009** · 2025-06-11 11:18 · Kellan Orve (Contractor, Mossbarrow Pipe Services) → Mara Voss (Property Manager, Northbridge Lettings): “Records attending at 11:00 after calling on arrival; Iven admitted him. Kellan saw moisture at a compression joint above the kitchen ceiling access hatch while the tap was running. The hatch opening w…”
- **E011** · 2025-06-11 14:12 · Kellan Orve (Contractor, Mossbarrow Pipe Services) → Mara Voss (Property Manager, Northbridge Lettings): “Sends an estimate for isolating the affected pipe, opening approximately 30 cm of ceiling lining, replacing the joint, and making the opening safe. The estimate excludes investigation, testing, remova…”
- **E013** · 2025-06-12 08:44 · Ossa Fenlow (Landlord) → Mara Voss (Property Manager, Northbridge Lettings): “Says she cannot locate a survey or records of ceiling work. Authorizes the quoted plumbing scope up to the estimate amount, provided the work is carried out safely, and asks to be contacted before any…”
- **E014** · 2025-06-12 09:26 · Mara Voss (Property Manager, Northbridge Lettings) → Kellan Orve (Contractor, Mossbarrow Pipe Services): “Confirms authorization for the quoted plumbing scope only. States that no work beyond the quote is approved and that no survey records have been located. Requests a proposed return appointment for the…”
- **E017** · 2025-06-13 10:42 · Kellan Orve (Contractor, Mossbarrow Pipe Services) → Mara Voss (Property Manager, Northbridge Lettings): “Calls from outside the flat at 10:40, within the confirmed appointment window. Iven answers and admits him. From the access hatch, Kellan can see a pale, fibrous-looking lining behind the painted ceil…”
- **E018** · 2025-06-13 10:51 · Mara Voss (Property Manager, Northbridge Lettings) → Kellan Orve (Contractor, Mossbarrow Pipe Services): “Instructs Kellan not to disturb the lining or proceed with drilling, cutting, sampling, or removal while the material is unidentified. Kellan confirms that none of those actions has occurred and says …”
- **E020** · 2025-06-13 11:27 · Iven Rell (Tenant) → Mara Voss (Property Manager, Northbridge Lettings): “Acknowledges the instruction. Reports a small drip when the kitchen tap was used that morning and says they have stopped using that tap. The ceiling is not visibly sagging, and Iven has not touched th…”
- **E022** · 2025-06-13 12:14 · Ossa Fenlow (Landlord) → Mara Voss (Property Manager, Northbridge Lettings): “Confirms she has no further records. Says her authorization covered the quoted plumbing work only, not a specialist material assessment or other work outside that scope. Requests the likely cost and t…”
- **E023** · 2025-06-13 13:48 · Kellan Orve (Contractor, Mossbarrow Pipe Services) → Mara Voss (Property Manager, Northbridge Lettings): “Confirms he has left without opening the ceiling. The joint remains inaccessible through the hatch, and he cannot price work involving the unidentified lining or specify what assessment would be requi…”
- **E024** · 2025-06-13 15:26 · Mara Voss (Property Manager, Northbridge Lettings) → Ossa Fenlow (Landlord): “Records that the underlying pipe repair remains necessary, the leak has recurred when the tap is used, and Iven has stopped using that tap. The ceiling has not been opened; the visible lining remains …”

---

Generated by agent-c on 2026-10-10 15:39:00 UTC from `Property Management/011`. Full reasoning in REASONING.md, trace in trace.jsonl.
