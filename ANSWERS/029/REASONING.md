# Reasoning: case 029

## 1. What the system received

- Folder: `Property Management/029` · track detected: **property**
- Case record sections: Case details (S:case-details), Initial request (S:initial-request)
- History: 20 events (E001–E020); decision moment 2025-05-14T13:48:00.000Z
- Attachments: none
- Withheld from the agent: nothing
- Ingest notes: none

## 2. Computed facts (code, no model)

```
As of: 2025-05-14T13:48:00.000Z · first event 2025-05-12T08:10:00.000Z · 20 events over 2.2 days
Channels seen: Portal, Note, SMS, Email, Call

Parties (sent / received · last message from them · unanswered requests to them since):
- Tamsin Rook (Property Manager: 0 / 12 · never wrote · 4 unanswered request(s): E003, E005, E009, E014
- Northbridge Lettings): 0 / 12 · never wrote · 4 unanswered request(s): E003, E005, E009, E014
- Elowen Vey (Tenant): 6 / 1 · last from them E018 (0.2d before as-of) · 1 unanswered request(s): E020
- Tamsin Rook (Property Manager, Northbridge Lettings): 7 / 0 · last from them E019 (0.2d before as-of)
- Orren Vale (Landlord): 4 / 2 · last from them E014 (1.1d before as-of) · 1 unanswered request(s): E019
- Northbridge Lettings workflow (System): 0 / 3 · never wrote
- Bram Alder (Contractor, Hearthline Boiler Service): 3 / 0 · last from them E020 (0d before as-of)
- Bram Alder (Contractor: 0 / 2 · never wrote · 1 unanswered request(s): E012
- Hearthline Boiler Service): 0 / 2 · never wrote · 1 unanswered request(s): E012

Dates mentioned (resolved against when they were written):
- "on Wednesday" → 2025-05-14 (NOT YET REACHED at as-of) · written by Elowen Vey (Tenant) [E001]
```

## 3. Situation (model reading)

**Task:** Stop an unverified visit and a meter-cabinet key drop from going ahead, and tell the tenant where things stand.  
**Stage:** awaiting_party (Visit unconfirmed; contractor identity and landlord access decision outstanding)  
**Waiting on:** Us (Northbridge Lettings). The tenant is waiting on us, and the contractor's key request is open to her. Next action: tenant.update to Elowen Vey via the portal, with a one-line SMS pointing to it, now. Message: "Hello Elowen, thank you for your messages, and sorry we have not replied before now. As of today, 14 May: (1) We have not confirmed any heating visit or appointment, and neither we nor your landlord have agreed Saturday 17 May. (2) We have not agreed any key arrangement. Please do not leave a key in the meter cabinet, and do not confirm a time to the caller yet. You do not need to be at home for a visit we have not confirmed with you. (3) We are checking the caller's identity and business details with him and with your landlord. We will not share your contact details with him without your agreement. (4) Your son does not need to be asked to let anyone in. (5) If you notice a gas smell, a leak, or the heating or hot water stop, leave the property if needed, call the gas emergency number and tell us straight away. Please reply to tell us if you have had any other contact from this caller. We will update you by 12:00 on Thursday 15 May, whether or not a visit has been confirmed." Also send contractor.update to Bram Alder by email, as a second step in the same turn: "Dear Bram, your landlord has authorised a diagnostic visit at 62 Brindlewick Row for intermittent boiler pressure loss, but only by a suitably identified heating engineer. No visit is confirmed. No key arrangement or entry while the tenant is out has been agreed, so please do not ask the tenant to leave a key in the meter cabinet. Please send by 12:00 on Thursday 15 May: your company's registered name and business address, a business landline, the name of the engineer who would attend, and your public liability insurance details. We will confirm any visit in writing after we have checked these with the landlord. All access arrangements go through us, not directly with the tenant." Add to the landlord's open question (E019) that the contractor texted the tenant at 13:48 asking for a key drop; do not chase the landlord yet, since his reply is only about four hours old. Escalate to a person if the contractor cannot verify his details by Thursday 15 May, if the tenant reports a visit attempt or a key request, or if she reports any gas or CO sign.

Tenant Elowen Vey reports an unverified heating contractor, Bram Alder (Hearthline Boiler Service), wants to visit to check intermittent boiler pressure loss and asks for a key to be left in the shared outdoor meter cabinet. No visit is confirmed. There is no work order, the landlord has authorised only a diagnostic visit by a suitably identified contractor and has not agreed any key arrangement or entry while the tenant is out, and the contractor has not given verifiable business details. At 13:48 on 14 May the contractor texted the tenant offering Saturday 17 May 08:00-13:00 and asking for a key drop; she has not replied. The agency has sent her no message in the record, so her questions from 12 May are unanswered.

**Parties**
- Elowen Vey: Tenant, 62 Brindlewick Row. Authority: Consents to access and to disclosure of her contact details; decides whether she is home and what times suit her. Cannot approve spend. Her availability is Sat 17 May 10:00-12:00 only if the visitor and purpose are confirmed in advance.
- Orren Vale: Landlord. Authority: Approves spend and the visit. Decides key and entry arrangements. Has authorised a diagnostic visit only by a suitably identified contractor and has not agreed any external key drop or entry while the tenant is absent.
- Tamsin Rook: Property Manager, Northbridge Lettings (our agency). Authority: Runs the enquiry, verifies contractors, relays information between parties and raises work orders. Cannot approve spend, access or key arrangements. Work-order appointment and key-drop authorisation fields are empty.
- Bram Alder (Hearthline Boiler Service): Self-described heating contractor, identity unverified. Authority: No work order or instruction from us on record. Landlord has not confirmed he is engaged by Hearthline. Has no authority over keys or access.
- Northbridge Lettings workflow: System notes. Authority: Records only; no decisions.

**Requests**
- Elowen Vey (Tenant) → Tamsin Rook (Northbridge Lettings): Whether a visit has actually been arranged (E010). Her conditions for Saturday (E015) and her report of the 14 May message (E018) also need a reply. — UNANSWERED [E010, E015, E018]
- Tamsin Rook (Northbridge Lettings) → Orren Vale (Landlord): Confirm whether Bram Alder is the contractor he intends to engage, and confirm the access arrangements he is authorising (E019). — UNANSWERED [E019]
- Tamsin Rook (Northbridge Lettings) → Bram Alder (Contractor): Business identity, work scope, proposed time, and whether he asked for a meter-cabinet key (E008). The key question was answered (E009). Identity and a business landline were not provided (E009, E012). — UNANSWERED [E008, E009, E012]
- Bram Alder (Contractor) → Tamsin Rook (Northbridge Lettings): Tenant's mobile number so he can coordinate directly (E016). Not shared; no reply recorded. This should stay unanswered unless the tenant consents. — UNANSWERED [E016, E017]
- Bram Alder (Contractor) → Elowen Vey (Tenant): Confirm Saturday 17 May 08:00-13:00 and leave the key in the meter cabinet if she is out (E020). Tenant has not replied; the key request is not authorised. — UNANSWERED [E020, E014]

**Conflicts**
- Key arrangement. The contractor asks for the key in the meter cabinet (E001, E018, E020). The tenant has not agreed and describes the cabinet as shared outdoors (E010). The landlord has not agreed any external key arrangement (E014), and the authorisation field is empty (E013). [E001, E010, E014, E018, E020, E013]
- Visit window. The tenant can be home only 10:00-12:00 on Saturday, and only if confirmed in advance (E015). The contractor offers 08:00-13:00 and wants a key drop if she is out (E020). Entry while the tenant is absent is not agreed (E014). [E015, E020, E014]
- Contractor identity. The landlord says Bram has done work for him before (E011), but he cannot confirm the caller's identity (E005) or that Bram is engaged by Hearthline (E014). The contractor has given no business address or landline (E009, E012). [E011, E005, E014, E009, E012]
- Wednesday visit. The caller set Wednesday 14 May morning (E001). Bram later said Wednesday was not booked (E012). The computed facts say Wednesday is not yet reached, but at the 13:48 as-of time the morning has passed and no attendance is recorded. The computed fact is wrong. [E001, E012, S:case-details]
- Saturday status. Bram said Saturday might be possible and he had not checked his schedule (E016). Later he said he can come Saturday (E020). The later message is firmer but still not verified, and there is no work order. [E016, E020]
- Tenant contact details. The caller already has the tenant's mobile number from an unrecorded source (E018, E003). Disclosure consent is empty (E017), and the contractor has asked for the number (E016). [E003, E016, E017, E018]

**Missing**
- Bram Alder's business name, registered address, business landline, the engineer's name, and public liability insurance (from Bram Alder (contractor), checked by the landlord; must ask)
- Whether the landlord has engaged Bram Alder or Hearthline Boiler Service to attend, and the access arrangements he authorises (from Orren Vale (landlord), reply to E019; must ask)
- How the caller obtained the tenant's mobile number (from Tenant may know more; the source is not in the record and cannot be inferred; must ask)
- Whether Hearthline Boiler Service is an agency-approved supplier or has any prior work at this property (from Northbridge Lettings supplier records (agency internal). The property record shows no work order (E002, E013), which is safe to state.; must ask)
- Tenant's consent to share her contact details with Bram Alder (from Elowen Vey (tenant). Consent field is empty (E017).; must ask)
- Whether the tenant has had any other contact from the caller, and whether she has smelled gas or seen any boiler warning (from Elowen Vey (tenant), in reply to the tenant.update; must ask)

**Failed actions**
- No agency reply is recorded to the tenant's questions. Her 12 May question whether a visit is arranged (E010) has no answer, and her 13 and 14 May messages (E015, E018) are also unanswered. The agency has sent her no message in the record. The computed fact lists only E020, so it understates this. [E010, E015, E018]
- Contractor did not give the business identity or landline requested in E008 (E009, E012). [E008, E009, E012]
- Landlord has not answered the question about Bram's engagement and access (E019). Not yet overdue at about four hours. [E019]
- Records show the work-order appointment and key-drop authorisation fields as empty (E013). The disclosure consent field is also empty (E017). [E013, E017]

**Risks**
- high fraud: An unverified caller asks the tenant to leave a property key in a shared, outdoor meter cabinet. He has her mobile number from an unrecorded source, has given no business identity, and the landlord has not agreed any key arrangement. This could be a social-engineering or unauthorised-entry attempt. Do not conclude that it is fraud; stop the key drop and verify. [E001, E003, E014, E018, E020, E010]
- medium privacy: The contractor asked the agency for the tenant's mobile number (E016). Disclosure consent is empty (E017). The number must not be passed on without her consent, and the tenant should know that the caller already has it. [E016, E017, E018]
- medium authority: Any visit that goes ahead without the landlord's agreement to entry while the tenant is absent, or to a key arrangement, would exceed what he has authorised (E014). [E014, E015, E020]
- medium safety: Intermittent boiler pressure loss, the heating currently working (E015). No gas smell or CO sign is reported. If any appears, escalate at once. [E005, E015]
- low vulnerability: A 15-year-old is in the household and may be home alone. The tenant does not want him asked to let anyone in. Keep this instruction in every message to the tenant and to the contractor. [E006]
- medium complaint: The tenant has had no agency reply to her questions since 12 May (E010, E015, E018). Her 12 May questions are still open. [E010, E015, E018]

**Treated as noise**
- S:case-details: Status shows requires decision, but that is the agency's own flag, not new evidence.
- E002: System note confirming no work order exists. Useful as fact, not as a party's message.
- E007: Landlord forwards Bram's message, which contains no window, reference or address. Adds nothing new.
- E013: System note. Its empty-field markers are real gaps, but the correspondence summary repeats earlier events.
- E017: System note. Consent field EMPTY is real. The rest repeats the record.
- E018: Repeats the Saturday request and key ask from E020. Treated as a second instance of the same pressure, not a new ask.
- Computed facts: 'unanswered requests' for Tamsin Rook, Northbridge Lettings and Hearthline: Artefact of duplicate party rows. Several items (E003, E005, E009, E014) are messages to the agency, not requests the agency owes to anyone. Only E019 and E020 matter.
- Computed facts: 'Wednesday NOT YET REACHED': Wrong. The Wednesday morning window had passed by 13:48 on 14 May, and no attendance is recorded.
- Duplicate party entries (Tamsin Rook twice, Bram Alder twice): Name and role drift, not separate people.

## 4. Independent proposals

| # | Action | Recipient | Channel | Confidence | Label |
|---|---|---|---|---|---|
| 1 | `send_message` | Elowen Vey (Tenant) | Portal, plus a short SMS pointing her to it | 62% | Tell the tenant that no heating visit or key arrangement has been confirmed, ask her not to leave a key in the meter cabinet, and give her a date for our next update |
| 2 | `send_message` | Elowen Vey (Tenant) | Portal, with a short SMS pointing her to the portal message | 62% | Tell the tenant that no visit or key arrangement is confirmed and that she should not leave a key in the meter cabinet. Ask the contractor for verifiable details and update the landlord. |
| 3 | `send_message` | Elowen Vey (Tenant) | Portal, with a one-line SMS asking her to check the portal | 62% | Tell the tenant that no visit or key arrangement has been agreed, that she should not leave a key in the meter cabinet, and when we will update her |

## 5. Checks and review

**Rule checks on the final candidate**
- All passed.

**Review 1: pass**
- minor: c1 [communication] The tenant message opens by apologising for no reply since 12 May, but the records only show no logged reply to her. The message also gives gas-emergency advice, which goes beyond the agency's role. (E010, E015, E018). Fix: Soften the apology to 'thank you for your patience'. Keep the gas line to a short pointer to the gas emergency service, or drop it.

Revised after review: no

## Decision 1: Tell the tenant that no heating visit or key arrangement has been confirmed, ask her not to leave a key in the meter cabinet, and give her a date for our next update

- **tenant.update** → Elowen Vey (Tenant) via Portal, plus a short SMS pointing her to it
- Same turn: **contractor.update** → Bram Alder (Hearthline Boiler Service) via Email
- Same turn: **landlord.update** → Orren Vale (Landlord) via Email
- Citations: E001, E003, E006, E008, E009, E010, E011, E012, E013, E014, E015, E016, E017, E018, E019, E020
- Gate rule: reviewer passed; 100% of samples agree
- Agreement with independent proposals: 100% · confidence 62% · decided by model
- Rationale: The tenant has been waiting on us since 12 May. She asked whether a visit had actually been arranged (E010), gave conditional Saturday availability (E015) and reported more contact (E018). The record shows no reply from the agency. At the decision moment the caller texted her directly to confirm Saturday 08:00–13:00 and leave the key in a shared outdoor meter cabinet (E020, E010). Nobody has authorised that: the landlord approved only a diagnostic visit by a suitably identified contractor, and agreed no entry while she is out and no external key (E014). The key-drop authorisation field and the work-order appointment are both empty (E013). The most urgent step is to stop the key drop and give the tenant the facts. This is routine handling, so a person is not needed yet: we can verify the contractor and wait for the landlord's answer to E019 ourselves. In the same turn, the contractor is told what he must provide and that access goes through us. The landlord is told about the new key request so he has it when he answers E019. His reply is only about 4 hours old, so this is not a chase.
- Alternatives considered:
  - case.escalate: The playbook already covers this: verify the contractor, stop an unauthorised key arrangement, and refuse to share the tenant's details. No decision needs a person's authority yet. Escalation is kept for failed verification, a visit attempt, or a safety sign.
  - contractor.update as the main action: Telling the contractor matters, but the tenant is the person exposed to the key request right now and has had no reply in 2 days. The contractor message goes in alsoSend.
  - landlord.chase: E019 was sent only about 4 hours ago, so a chase would be premature. The landlord gets an update with the new fact instead.
  - case.wait: There is a live, unauthorised key request to the tenant and she has had no reply from us since 12 May.

## Failures and fallbacks

- None.

## Model calls

| Stage | Model | OK | ms | In | Out | Cache read | Request |
|---|---|---|---|---|---|---|---|
| situate | claude-haiku-5-5 | yes | 102682 | 2 | 22314 | 25808 | claude-code |
| decide | claude-opus-5-5 | yes | 32608 | 2 | 3405 | 23321 | claude-code |
| decide | claude-opus-5-5 | yes | 34474 | 2 | 3691 | 25625 | claude-code |
| decide | claude-opus-5-5 | yes | 112848 | 2 | 3406 | 23321 | claude-code |
| review-1 | claude-sonnet-5-5 | yes | 9067 | 2 | 897 | 22353 | claude-code |

Total time: 224.6 s

## 5. Checks and review dialogue

Models: read claude-haiku-5-5 · decide claude-opus-5-5 · review claude-sonnet-5-5

**Rule checks on the final candidate**
- All passed.

### Round 1 · reviewer claude-sonnet-5-5

**Review: approve**
- **c1** minor · communication: The tenant message opens by apologising for no reply since 12 May, but the records only show no logged reply to her. The message also gives gas-emergency advice, which goes beyond the agency's role. [E010, E015, E018]. Suggested fix: Soften the apology to 'thank you for your patience'. Keep the gas line to a short pointer to the gas emergency service, or drop it.

Revised after review: no
