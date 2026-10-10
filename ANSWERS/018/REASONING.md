# Reasoning: case 018

## 1. What the system received

- Folder: `Property Management/018` · track detected: **property**
- Case record sections: Case details (S:case-details), Initial request (S:initial-request)
- History: 19 events (E001–E019); decision moment 2025-09-11T14:30:00.000Z
- Attachments: none
- Withheld from the agent: nothing
- Ingest notes: none

## 2. Computed facts (code, no model)

```
As of: 2025-09-11T14:30:00.000Z · first event 2025-08-14T11:05:29.000Z · 19 events over 28.1 days
Channels seen: Portal, Email, Call, Note, Update

Parties (sent / received · last message from them · unanswered requests to them since):
- Tara Wren (Property Manager, Northbridge Lettings): 12 / 0 · last from them E019 (0d before as-of)
- Northbridge Lettings): 0 / 9 · never wrote · 1 unanswered request(s): E004
- Elise Rowan (Tenant): 2 / 5 · last from them E010 (10.1d before as-of) · 1 unanswered request(s): E017
- Tara Wren (Property Manager: 0 / 7 · never wrote · 1 unanswered request(s): E004
- Gareth Vale (Landlord): 2 / 3 · last from them E006 (24.2d before as-of) · 1 unanswered request(s): E007
- Northbridge Lettings workflow (System): 3 / 2 · last from them E018 (0d before as-of)
- Priya Noll (Maintenance Coordinator: 0 / 2 · never wrote

Possible failures (keyword match, check the text):
- "voicemail" [E005]
- "did not attend" [E018]
```

## 3. Situation (model reading)

**Task:** Chase landlord Gareth Vale by email, with a call to 07700 900184 if no reply, for a decision on who does the rodent proofing, the scope, the contractor and the date, and for any pest report. Reply requested by 12:00 UTC on Fri 12 Sep 2025. If there is no reply by then, escalate to a person.  
**Stage:** awaiting_party (Landlord-arranged rodent proofing: awaiting landlord confirmation of who does the work, scope and date. No contractor instructed by the agency and no completion evidence.)  
**Waiting on:** The landlord, Gareth Vale, must confirm whether he or a contractor he appoints is doing the proofing, the scope, the date, and whether a pest report exists. The agency owes him a chase now (not yet sent) and owes the tenant an update by Mon 15 Sep 2025. The tenant is waiting for a call back. Nothing is owed by the tenant.

Tenant Elise Rowan reported rats in the kitchen, including beneath the sink, at 14 Mosswold Crescent on 14 Aug 2025 and asked for prompt attention (E001). The landlord, Gareth Vale, has never given written approval or said who will do the proofing. On 18 Aug the agency recorded that he would arrange the works directly (E007), but his call that day gave no decision, contractor, scope or date (E006). He has not answered the request for a completion date in the 24 days since, and the agency has not chased him. Pest control reportedly attended on 7 Sep with no written report on file, and a separate contractor the tenant expected on 8 Sep did not attend (E014, E017).

**Parties**
- Elise Rowan: Tenant, 14 Mosswold Crescent. Reported the rat activity and gives access.. Authority: Reports faults and gives access. Has no authority to approve spend. Says she is at work and prefers phone to email.
- Tara Wren: Property Manager, Northbridge Lettings. Case handler.. Authority: Can chase, relay information and record waits. Cannot approve spend or instruct a contractor without the landlord's approval, which is not on record.
- Gareth Vale: Landlord. Owner of the property.. Authority: Approves spend. Decides whether the work is done by him, by an agency contractor or by a contractor he appoints. Has not yet confirmed any of these in writing.
- Priya Noll: Maintenance Coordinator, Northbridge Lettings. Copied on internal notes only.. Authority: Authority is not stated in the record. Receives internal notes (E011, E019).
- Northbridge Lettings workflow (System): Automated escalation and waiting-period expiry.. Authority: None. Its notices do not evidence completion or approval.
- Pest control contractor (not named in record): Attended on 7 Sep per the tenant. No written report on file.. Authority: Works under the landlord's arrangement. Not instructed by the agency.
- Separate proofing contractor(s) (not named in record): Expected by the tenant on 8 Sep to work on the openings. Did not attend per the tenant. No booking on record.. Authority: Unknown. Appointment, if any, is by the landlord, which is unconfirmed.

**Requests**
- Northbridge Lettings (Tara Wren) → Gareth Vale (Landlord): Decide whether you will arrange the works yourself, or whether you want Northbridge to arrange them, and confirm in writing. Give approval for any spend. The agency has asked this since 17 Aug. — UNANSWERED [E003, E004, E006, E007]
- Northbridge Lettings (Tara Wren) → Gareth Vale (Landlord): Give an expected completion date for the proofing work and confirm when it is complete. — UNANSWERED [E007]
- Gareth Vale (Landlord) → Northbridge Lettings (Tara Wren): Urgent call back (given 07700 900184). — answered [E004, E005, E006]
- Northbridge Lettings (Tara Wren) → Elise Rowan (Tenant): Whether the landlord-arranged works have been completed. — answered [E009, E010]
- Elise Rowan (Tenant) → Northbridge Lettings (Tara Wren): Prompt attention to the rat activity in the kitchen (E001). No fix date has been given to her. — UNANSWERED [E001, E008, E017]

**Conflicts**
- Who is doing the work. The agency recorded that the landlord will arrange the works directly (E007), but the landlord's own words on 17-18 Aug give no decision (E004, E006). The tenant was told the landlord or a contractor he appoints may contact her (E008), and she expected contractors on 8 Sep (E014). The self-managed status rests on the agency's note, not the landlord's confirmation. [E004, E006, E007, E008, E014]
- Scope of the openings. The tenant first described openings beneath the kitchen sink (E001, E010). On 7 Sep she described work on the wall area (E014). The landlord's December 2024 record said filling external openings might not be feasible (E006). Nobody has confirmed which openings are to be sealed. [E001, E006, E010, E014]
- Pest control visit. On 1 Sep the tenant expected a final visit the following Monday, 8 Sep (E010). On 7 Sep she said pest control had attended that morning and removed its equipment (E014). No pest report has been received (E011). [E010, E011, E014]
- Expected contractor attendance. The tenant expected contractors on 8 Sep (E014). She reports that none attended (E017, E018). No contractor, booking or appointment appears in any agency record (E007, E016). [E014, E016, E017, E018]

**Missing**
- Whether the landlord will do the proofing himself or through a contractor, and whether he confirms he is self-managing the job. (from Landlord (Gareth Vale); must ask)
- Name and contact of any contractor appointed for the proofing, and whether a visit was booked for 8 Sep. (from Landlord (Gareth Vale); pest control company if named; must ask)
- Which openings are to be sealed (under the sink, the wall area, or external openings) and whether external filling is feasible. (from Landlord, with the pest control company's written report; must ask)
- Expected completion date for the proofing and confirmation when it is complete. (from Landlord (Gareth Vale); must ask)
- Written pest control report, diagnosis and treatment record. (from Pest control contractor, via the landlord; must ask)
- Whether pest control treatment is finished or still ongoing. (from Pest control contractor; tenant's report only so far; must ask)
- Tenant's consent to share her contact details with any contractor the landlord appoints. None is recorded. (from Tenant (Elise Rowan); must ask)
- Whether any vulnerable person lives at the property, and whether the dog has access to treated areas. (from Tenant (Elise Rowan); must ask)
- The December 2024 property record that the landlord recalled (traps, kickboard, openings). (from Landlord; agency property file if it holds that record; must ask)

**Failed actions**
- Landlord voicemail (E005) was a failed contact attempt. The landlord did call back (E006), so this is resolved in part. [E005, E006]
- The landlord has not replied to the request for a completion date (E007). 24 days have passed since the landlord's last message (E006), and the agency has not chased him. [E006, E007]
- The written approval and decision requested on 17 Aug (E003) was never given. The landlord's reply (E004) asked for a call and gave none. [E003, E004]
- The 8 Sep contractor visit the tenant expected did not happen, per the tenant (E017, E018). It is unverified, since no contractor record exists. [E014, E017, E018]
- Two internal waits (E013, E016) lapsed without any landlord contact or agency chase. The case stalled and the tenant received no update about the next step. [E013, E016, E018]

**Risks**
- high safety: Rats have been in the kitchen, including beneath the sink, and the problem is not yet resolved after about four weeks (E001, E010). The tenant says she is not comfortable living with rats indoors and asked for prompt attention. The agency has no health information about the household. [E001, E010, E017]
- medium safety: A small dog lives at the property with no access restrictions recorded (E001). Baiting, proofing and open works could expose the dog, and no pest contractor has given written guidance. [E001]
- medium complaint: Expected contractors did not attend on 8 Sep, and the tenant says nobody has come. The landlord has not replied in 24 days. A formal complaint about delay is likely if this continues. [E007, E017, E018]
- high other: The job has no owner who controls the work. It depends on a landlord who has not confirmed who is acting, the agency has not instructed any contractor, and the two internal waits have expired. The job could stall with nobody acting. [E007, E013, E016, E018]
- medium other: The scope is unresolved. Openings may be sealed in the wrong place, or the external route left open. The landlord's record said external filling may not be feasible. [E006, E010, E014]
- low privacy: The tenant was told the landlord or his contractor may contact her directly (E008). No consent is recorded for sharing her details with a contractor the agency did not appoint. [E008]

**Treated as noise**
- E012: Automated escalation. It does not evidence completion or approval.
- E015: Automated waiting-period expiry. It records the absence of an update, not any progress.
- E018: Automated expiry notice. Its 'did not attend' wording repeats the tenant's report and is not independent evidence.
- E013: Internal wait decision. Records the agency's hold, not a landlord or contractor event.
- E016: Internal wait decision. Same as E013.
- E011: Internal note summarising the tenant's update. No action needed beyond the chase.
- E019: Internal note saying the tenant's update was recorded. No new fact.
- E002: Standard acknowledgement. No content bears on the next step.
- Computed facts: Party-name duplicates ('Northbridge Lettings)' and 'Tara Wren (Property Manager:') are parsing artefacts. The flag that E004 is unanswered is a false positive, since E005 and E006 answered it. The flag that the tenant has an unanswered request at E017 is wrong: E017 is an agency call, not a request to the tenant.

## 4. Independent proposals

| # | Action | Recipient | Channel | Confidence | Label |
|---|---|---|---|---|---|
| 1 | `chase` | Gareth Vale (Landlord) | Phone call to 07700 900184, with the same message sent by email afterwards | 72% | Chase landlord Gareth Vale by phone, followed by the same message in writing, for confirmation of who is doing the rodent proofing, which openings, the contractor, the rebooked date and any pest control report |
| 2 | `chase` | Gareth Vale (Landlord) | Email, followed by a call to 07700 900184 the same day | 72% | Chase landlord Gareth Vale for who is doing the rodent proofing, which openings, the new date, and the pest report |
| 3 | `chase` | Gareth Vale (Landlord) | Phone call to 07700 900184 (his preferred route, given in E004), then the same text by email so it is on record | 72% | Chase landlord Gareth Vale by phone and email for the rearranged proofing date, the contractor, the scope and any pest-control report |

## 5. Checks and review

**Rule checks on the final candidate**
- All passed.

**Review 1: pass**
- minor: c1 [communication] The tenant message gives pest-hygiene advice (sealed food, keep the dog from bait) that the records don't call for. The landlord message also says 'we noted' he would arrange the works, but E006 records no such statement from him. Only the agency's own note E007 says so. (E006, E007). Fix: Keep the tenant advice minimal, or drop it. Word the landlord line as 'our record of 18 August is that you are arranging the works; please correct us if that is wrong'.

Revised after review: no

## Decision 1: Chase landlord Gareth Vale by phone, followed by the same message in writing, for confirmation of who is doing the rodent proofing, which openings, the contractor, the rebooked date and any pest control report

- **landlord.chase** → Gareth Vale (Landlord) via Phone call to 07700 900184, with the same message sent by email afterwards
- Same turn: **tenant.update** → Elise Rowan (Tenant) via Phone call (her stated preference), with a confirming email
- Citations: E001, E004, E006, E007, E008, E010, E013, E014, E016, E017, E018
- Gate rule: reviewer passed; 100% of samples agree
- Agreement with independent proposals: 100% · confidence 72% · decided by model
- Rationale: The agency recorded this as a landlord-managed job (E007, E008). For landlord-managed works, the playbook says to chase the landlord about 3 days after any date given. The proofing visit the tenant expected on 8 September did not happen (E014, E017), and today is 3 days later. The landlord has not replied to the request for a completion date sent 24 days ago (E007). The agency's own internal waits have both run out without any landlord contact (E013, E016, E018), and nobody has chased him yet, so a chase is due now. He asked to be called (E004) and gave a number. The earlier request (E007) went by email, so this second contact goes by phone and then in writing. We cannot instruct our own contractor: the landlord's only position on record is that he will arrange the work himself, and he has not approved any spend by the agency. Rats indoors make the job urgent, but they are not one of the playbook's immediate escalation triggers. Pest treatment has been happening, and the open question is a decision only the landlord can make. So the right move is a firm chase with a short deadline, with escalation if he does not reply. The tenant prefers phone contact (E017) and has had no update since 8 September, so she is told the status and given a date in the same turn.
- Alternatives considered:
  - case.escalate: The landlord has not been chased once since E007. A chase with a 24-hour deadline comes first, and escalation follows if it fails or rat activity gets worse.
  - contractor.assign: The landlord has not approved an agency contractor or any spend, and the only position on record is that he is arranging the work himself.
  - case.wait: Both internal waits have run out and the expected visit on 8 September did not happen. Nobody has promised anything for a future date, so there is nothing to wait for.

## Failures and fallbacks

- None.

## Model calls

| Stage | Model | OK | ms | In | Out | Cache read | Request |
|---|---|---|---|---|---|---|---|
| situate | claude-haiku-5-5 | yes | 113505 | 4 | 27255 | 51159 | claude-code |
| decide | claude-opus-5-5 | yes | 31005 | 2 | 3074 | 25625 | claude-code |
| decide | claude-opus-5-5 | yes | 32263 | 2 | 3166 | 23321 | claude-code |
| decide | claude-opus-5-5 | yes | 32532 | 2 | 3206 | 25625 | claude-code |
| review-1 | claude-sonnet-5-5 | yes | 10814 | 2 | 1113 | 24657 | claude-code |

Total time: 156.9 s

## 5. Checks and review dialogue

Models: read claude-haiku-5-5 · decide claude-opus-5-5 · review claude-sonnet-5-5

**Rule checks on the final candidate**
- All passed.

### Round 1 · reviewer claude-sonnet-5-5

**Review: approve**
- **c1** minor · communication: The tenant message gives pest-hygiene advice (sealed food, keep the dog from bait) that the records don't call for. The landlord message also says 'we noted' he would arrange the works, but E006 records no such statement from him. Only the agency's own note E007 says so. [E006, E007]. Suggested fix: Keep the tenant advice minimal, or drop it. Word the landlord line as 'our record of 18 August is that you are arranging the works; please correct us if that is wrong'.

Revised after review: no
