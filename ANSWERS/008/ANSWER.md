# Case 008: Water ingress affecting two flats

**Next action:** Phone Devra Senn (Duty Manager) now and follow up with a written update, so the agency director decides straight away on emergency services and on whether anyone may enter or isolate Flat 3

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Escalate to a person (`escalate_to_human`) | Devra Senn (Duty Manager, Northbridge Lettings), for the agency director | Phone call now, then an internal written Update | 85% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 24 events (E001–E024), decision moment 2025-06-18 12:55.
- Attachments: none.

## Actions taken

1. **Hand the case to a person** (`case.escalate`) → Devra Senn (Duty Manager, Northbridge Lettings), for the agency director via Phone call now, then an internal written Update (see Escalated).

2. Same turn (`tenant.update`) → Bevin Orlo (Tenant, Flat 2) via SMS:

> Hi Bevin, thank you for keeping us updated. Please stay out of the bedroom, keep the door closed and keep everyone away from the light fitting, the switches and the wet ceiling. Please let the Vellum Electrical electrician in when they arrive (their window ends at 13:15). If you see sparks or smoke, notice a burning smell, see the bulge sag suddenly, or anything falls, leave the area and call 999 straight away, then let us know. I have passed this to our duty manager to deal with urgently. I will update you by 14:00 today, or sooner if anything changes. Arlen, Northbridge Lettings

3. Same turn (`tenant.update`) → Yara Mallow (Tenant, Flat 3) via Portal:

> Dear Yara, as you asked, here are the details in writing. The plumber is Daro Fen of Brindle Flow Plumbing. The work proposed for Flat 3 is to inspect for the source of the water reaching the flat below and to find a safe point to turn off the supply if needed. No repair work is proposed at this stage. Water is still coming through the ceiling below and getting worse, so it would really help if you could let us know as soon as you can whether you would agree to an accompanied visit before you get home, or when you are back at about 17:30. Please reply here or call me. Nobody is being sent to Flat 3 at the moment, and we will contact you before anyone comes, as you asked. Kind regards, Arlen Quist, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.wait for the electrician's findings: The bulge is getting bigger beside a wet fitting, and the decision on emergency services and entry should not wait for the window to close.
- contractor.update telling Daro to enter Flat 3 or turn off riser valves: There is no consent or authority to enter, and no valve is confirmed to serve only Flat 3. Doing so would be unauthorised and could cut off other flats.
- landlord.chase to Niko for authorisation: Niko has already said he does not authorise entry and has passed the check to the agency. The decision now sits with the director.

## Escalated

Yes, to Devra Senn (Duty Manager, Northbridge Lettings), for the agency director.

**Why a person is needed:** Only the agency director can decide on emergency entry after a refusal, and on whether the danger justifies calling emergency services (E022).

**Summary:** Water is still coming through the Flat 2 bedroom ceiling at a light fitting, and the ceiling bulge is getting bigger. The electrics have not been confirmed safe. The source is not found and Flat 3 is suspected. Yara Mallow refuses entry to Flat 3 until about 17:30. The landlord has not authorised entry, and no agency authority to override the refusal has been found.

**Done so far:**
- Bevin was told to keep clear of the fitting and ceiling and to call emergency services if there are sparks, smoke or falling material (E003, E015, E017)
- Plumber and building manager went into Flat 2 and the common riser; no source found and no valve confirmed (E016, E021)
- Electrician booked for 12:30–13:15 (E014, E018)
- Landlord told; he did not authorise entry and asked us to check the full agreement (E006, E011, E019)
- Yara asked twice; she refuses until she is back and wants the details in writing (E009, E020)
- Duty manager reviewed the record and found no delegated authority (E022)

**Options:**
- Call emergency services now and follow what they direct. Risk: May not count as immediate danger if the electrician finds the circuit is safe. But the risk of waiting is collapse or electrocution.
- Authorise accompanied emergency entry to Flat 3 if the full tenancy agreement allows it, telling Niko first. Risk: Legal risk if the wording does not allow entry after a refusal.
- Hold until Yara returns at about 17:30, with Daro on standby. Risk: Roughly 4.5 more hours of water damage and the ceiling bulge getting worse.

**Recommended:** Check the full agreement at once. If Vellum's findings or Bevin's reports suggest collapse or electrical danger, call emergency services without waiting. Otherwise aim for consented entry when Yara returns, with Daro booked.

## What failed

- Nothing failed.

## Final result

The director, through Devra, decides quickly whether to call emergency services and whether any entry to or isolation of Flat 3 is authorised. Meanwhile Bevin stays safe, and Yara has the written details she asked for and may agree to entry sooner.

**Follow up by:** 2025-06-18

### Why

There is a live safety risk: an active leak at a ceiling light fitting, electrical safety not established, and a ceiling bulge that is getting bigger (E012, E017, E018, E023). The manual says to escalate in that situation. The step that would move the job on is tracing and isolating the source in Flat 3, and that is blocked. The occupant has refused entry (E009, E020), the landlord has not authorised it (E011, E019), and the duty manager found no delegated authority. The duty manager also set the route: the full agreement plus a director decision, or emergency services if there is immediate danger (E022). The agent has no authority to make either call. Routine messages that need no extra authority go out in the same turn. Bevin gets refreshed safety advice. Yara gets the written proposal she asked for as a condition of reconsidering (E020). That is the quickest lawful way to get access with consent.

### Boundaries (what this does not prove or settle)

- Escalating does not authorise entry to Flat 3, using a key, or turning any valve.
- Flat 3 is not confirmed as the source, and nobody is responsible or liable at this stage.
- The electrician's visit window is not a finding that the electrics are safe. Until Vellum has tested, the electrical status is unknown.
- Sending Yara the written proposal does not mean she has consented, and it is not a promise of entry or of when work will happen.
- This step does not decide what the tenancy agreement allows. Only checking the full wording does that.

### Remaining work

- Get the full Flat 3 tenancy agreement for the director's decision.
- Record what Vellum Electrical finds and pass it to Devra and Bevin.
- Tell Niko before any non-routine access, as he asked.
- Arrange for Daro to attend Flat 3 once consent or authority is in place, which may be when Yara returns at about 17:30.
- Once the source is fixed, take Flat 2's ceiling and fitting repairs and the related costs to the right landlord(s) for approval.

### Assumptions

- Devra can reach the agency director at once.
- Yara can be reached in writing through the portal, the channel she reported on.
- Bevin is still outside the bedroom as reported at 12:38.

### Evidence

- **E001** · 2025-06-18 08:12 · Yara Mallow (Tenant, Flat 3) → Arlen Quist (Property Manager, Northbridge Lettings): “I have been told there is water coming through the ceiling of Flat 2, below my bathroom. I cannot see a leak in my flat. Please contact me before anyone comes to Flat 3.”
- **E002** · 2025-06-18 08:19 · Arlen Quist (Property Manager, Northbridge Lettings) → Bevin Orlo (Tenant, Flat 2): “Bevin reported water dripping from a bedroom ceiling light fitting and spreading across the ceiling. A bowl is underneath; the bed has been moved. Bevin said the wall switch is off but does not know w…”
- **E003** · 2025-06-18 08:27 · Arlen Quist (Property Manager, Northbridge Lettings) → Bevin Orlo (Tenant, Flat 2): “Arlen told Bevin not to touch the wet fitting, nearby switches, or the ceiling, and to keep people out of the affected bedroom. Arlen clarified that a wall switch being off does not establish that the…”
- **E006** · 2025-06-18 08:51 · Arlen Quist (Property Manager, Northbridge Lettings) → Niko Pell (Landlord, Flat 3): “Arlen reported active ingress, the wet light fitting below, and Yara's request to be contacted before entry. Niko said he was away, had no key, and had not given standing permission for entry in his a…”
- **E007** · 2025-06-18 09:03 · Bevin Orlo (Tenant, Flat 2) → Arlen Quist (Property Manager, Northbridge Lettings): “Bevin reported water at the ceiling light and a damp patch extending toward the bedroom wall. Bevin could not identify the source or confirm conditions in the space above the ceiling and asked that th…”
- **E009** · 2025-06-18 09:24 · Arlen Quist (Property Manager, Northbridge Lettings) → Yara Mallow (Tenant, Flat 3): “Yara said she would not agree to entry while away and could not return before 17:30. She asked that no key be used. She could answer calls during a break around noon.”
- **E010** · 2025-06-18 09:37 · Selka Venn (Building Manager, Tallowmere Row) → Arlen Quist (Property Manager, Northbridge Lettings): “Selka offered to meet Daro at 10:30 and provide access to the common riser. The labels are incomplete, and Selka cannot confirm that any valve serves only Flat 3. Selka has no key to either flat.”
- **E011** · 2025-06-18 09:49 · Niko Pell (Landlord, Flat 3) → Arlen Quist (Property Manager, Northbridge Lettings): “Niko said the tenancy paperwork refers to repairs on notice and separately mentions urgent repairs, but he did not have the full wording available. He was not expressly authorizing entry where Yara ha…”
- **E012** · 2025-06-18 10:02 · Arlen Quist (Property Manager, Northbridge Lettings) → Bevin Orlo (Tenant, Flat 2): “Bevin reported faster dripping and a new brown patch beside the fitting. No section had fallen. Bevin had not touched the consumer unit and remained outside the bedroom.”
- **E014** · 2025-06-18 10:22 · Arlen Quist (Property Manager, Northbridge Lettings) → Runa Elt (Contractor, Vellum Electrical): “Arlen requested an urgent qualified electrical attendance for the wet ceiling fitting in Flat 2. Runa confirmed electrical qualifications and offered an attendance window of 12:30–13:15, subject to th…”
- **E016** · 2025-06-18 10:48 · Daro Fen (Contractor, Brindle Flow Plumbing) → Arlen Quist (Property Manager, Northbridge Lettings): “Daro and Selka had met as arranged. Daro had access to Flat 2 and the common riser. He saw water at the bedroom ceiling but could not locate the source. The riser labels did not identify a confirmed F…”
- **E017** · 2025-06-18 11:02 · Arlen Quist (Property Manager, Northbridge Lettings) → Bevin Orlo (Tenant, Flat 2): “Bevin reported a shallow-looking bulge in the damp ceiling beside the light and continued dripping. Arlen asked Bevin to stay out of the bedroom and keep others away from the ceiling. Bevin said they …”
- **E018** · 2025-06-18 11:17 · Arlen Quist (Property Manager, Northbridge Lettings) → Runa Elt (Contractor, Vellum Electrical): “Runa confirmed the attendance window remained 12:30–13:15 and that the fitting was not considered safe based on the wall switch position. Runa would need to inspect and test on site. The electrical su…”
- **E019** · 2025-06-18 11:32 · Niko Pell (Landlord, Flat 3) → Arlen Quist (Property Manager, Northbridge Lettings): “Niko had found a tenancy clause for access by arrangement and a separate reference to emergency repairs. He was uncertain whether the wording permitted entry after Yara's refusal and asked Northbridge…”
- **E020** · 2025-06-18 11:48 · Arlen Quist (Property Manager, Northbridge Lettings) → Yara Mallow (Tenant, Flat 3): “Yara repeated that she did not consent to entry before she returned home. She asked for the plumber's name and proposed work in writing before reconsidering. Arlen provided Daro's name and said the pr…”
- **E021** · 2025-06-18 12:03 · Selka Venn (Building Manager, Tallowmere Row) → Arlen Quist (Property Manager, Northbridge Lettings): “Selka confirmed that the common-riser and Flat 2 attendance had taken place as arranged, but no source or usable isolation point was identified. Water had not reached the common corridor. Selka had no…”
- **E022** · 2025-06-18 12:20 · Arlen Quist (Property Manager, Northbridge Lettings) → Devra Senn (Duty Manager, Northbridge Lettings): “Arlen asked who could authorize emergency access after the occupant refused consent. Devra reviewed the available agency record and found no documented delegated authority for staff to override that r…”
- **E023** · 2025-06-18 12:38 · Bevin Orlo (Tenant, Flat 2) → Arlen Quist (Property Manager, Northbridge Lettings): “The drip continues and the ceiling bulge appears larger. I am still outside the bedroom and can meet the electrician. I have not seen sparks or smoke, and no material has fallen.”
- **E024** · 2025-06-18 12:55 · Arlen Quist (Property Manager, Northbridge Lettings) → Devra Senn (Duty Manager, Northbridge Lettings): “Current record: active dripping and a reportedly enlarging ceiling bulge in Flat 2 beside a wet light fitting; the room is being kept clear, but electrical safety has not been established. Vellum Elec…”

---

Generated by agent-c on 2026-10-10 15:37:04 UTC from `Property Management/008`. Full reasoning in REASONING.md, trace in trace.jsonl.
