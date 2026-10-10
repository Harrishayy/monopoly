# Case 001: Bathroom leak and wall repair

**Next action:** Ask Hearthline for one corrected, itemised quote for 4 Thistlewick Rise, so the landlord gets a single figure that adds up before he is asked to approve

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Chase (`chase`) | Ewan Rook, Hearthline Plumbing & Bath | Email | 55% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 23 events (E001–E023), decision moment 2025-09-23 16:12.
- Attachments: A1 attachments/bathroom-works-quotation.pdf (pdf).

## Actions taken

1. **Ask Hearthline for one corrected, itemised quote for 4 Thistlewick Rise, so the landlord gets a single figure that adds up before he is asked to approve** (`contractor.chase`) → Ewan Rook, Hearthline Plumbing & Bath via Email:

> Hi Ewan,
> 
> Thank you for the breakdown on 18 September. Before I can put this job to the landlord for a decision, I need one corrected, itemised quote. At the moment the figures don't match each other, and the landlord has asked which quote he is being asked to approve.
> 
> The problems are:
> 1. Address: quotation NBL-001-Q1 (18 September 2025) gives the property as 8 Wrenfold Mews, Brindlewick. This job is at 4 Thistlewick Rise, Larkcombe. Please confirm the quote is for 4 Thistlewick Rise and reissue it with the right address.
> 2. Figures: the quote shows a subtotal of £2,370.00 + VAT £474.00 = £2,844.00. Your breakdown gives materials £1,270 + labour £1,170, which comes to £2,440 before VAT, £70 more than the quoted subtotal. Please give one itemised figure (materials, labour, any other items), the subtotal, VAT at 20% and the total.
> 3. The 10% "Northbridge commission": please do not put this on the quote. Tell me separately whether it is already in any of your figures, and if so, which ones. We will deal with our own charges to the landlord ourselves.
> 4. Deposit: please confirm what the 50% deposit is worked out on (which total, with or without VAT) and when you would need it.
> 5. Scope: the tenant reported a leaking pipe behind the shower that came back after an earlier tightening, and water coming through the grout behind the wall covering. Please confirm what you found at the inspection (the date you attended, the cause of the leak, how far the damp goes) and whether the quoted works repair the leaking pipe and deal with the wet wall. If the leak repair is not included, please price it as a separate line.
> 6. Keys: please confirm the office keys used for access have been returned to our office.
> 
> Please reply by end of Thursday 25 September with the reissued quote as a PDF. Do not start any work or take any deposit: the landlord has not approved the repair, and you should only go ahead once we confirm his approval in writing. If you see anything that suggests the leak is getting worse or water is reaching any electrics, please tell me straight away.
> 
> Kind regards,
> Mira Sallow
> Property Manager, Northbridge Lettings

2. Same turn (`landlord.update`) → Orin Vale (Landlord) via Email:

> Dear Orin,
> 
> Apologies. My email earlier today should have said which quote I meant.
> 
> There is one formal quotation from Hearthline Plumbing & Bath (ref NBL-001-Q1, 18 September 2025). It covers removing the shower screen, bath taps and shower valve, fitting wall-and-riser cladding with chrome trims, fitting new bath taps and a new shower valve, and refitting the screen. The price is £2,370.00 + VAT £474.00 = £2,844.00.
> 
> When you asked for an itemised breakdown, the contractor sent materials £1,270 and labour £1,170. That comes to £2,440 before VAT, which doesn't match the quoted £2,370. He also mentioned a commission and a 50% deposit but gave no revised total. The quote document also shows the wrong property address. So I'm not asking you to approve anything at the moment.
> 
> I have asked the contractor for a corrected, itemised quote for 4 Thistlewick Rise. I've also asked him to confirm whether the works repair the leaking pipe and the wet wall the tenant reported, and to explain the deposit terms. I will send it to you by Friday 26 September, so you have one figure to decide on.
> 
> The tenant reports that the leak is still going on and the wall is getting worse, so I would be grateful for a prompt decision once you have the corrected quote. I'll tell you straight away if anything changes before then.
> 
> Kind regards,
> Mira Sallow
> Northbridge Lettings

3. Same turn (`tenant.ask`) → Nessa Quill (Tenant) via Email:

> Dear Nessa,
> 
> An update on the shower leak at 4 Thistlewick Rise. Hearthline Plumbing & Bath have inspected and given a quote. I've asked them to clarify a few points before it goes to your landlord for a decision. I will update you by Friday 26 September. I can't give a date for the repair until the landlord has approved it.
> 
> Please could you tell me, by reply, by Thursday 25 September:
> 1. Is the pipe still leaking, and has the damp area on the wall got bigger since mid-September?
> 2. Have you seen water anywhere outside the bathroom, or near any light fittings, switches or sockets?
> 
> In the meantime, if using the shower makes the leak worse, please avoid using it where you can. If water reaches any electrics, comes through a ceiling or floor, or starts spreading to another room, please call the office straight away rather than waiting for my update.
> 
> Kind regards,
> Mira Sallow
> Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- landlord.send_quote: re-send the £2,844.00 quote with the E021 breakdown: The figures don't reconcile, the commission and deposit are unexplained, the quote document names another address, and it may not cover the leak. Sending it would invite an approval nobody could rely on.
- landlord.update as the main action: It answers his question but doesn't get the corrected figures. It goes in alsoSend instead, so he hears from us now and gets a date.
- case.escalate: These conflicts can be settled by asking the contractor, which the playbook covers. A person is needed only if the leak turns out to be unsafe or the contractor can't produce a coherent quote.
- case.wait: The landlord is waiting on us, and the leak is getting worse.

## Escalated

No.

## What failed

- Nothing failed.

## Final result

Hearthline reissues a PDF quote for 4 Thistlewick Rise. It should have itemised figures, a subtotal, VAT and a total, the deposit basis, inspection findings and confirmation that the leak repair is in scope (or priced separately). That lets the agency send one clear quote to the landlord by Friday 26 September.

**Follow up by:** 2025-09-25

### Why

The landlord has only approved an inspection and a quote (E005), not the repair. He asked for an itemised breakdown (E018) and now asks which quote is meant (E023), because the agency's follow-up named no amount (E022). The next normal step is landlord.send_quote, but there is no single reliable quote to send yet. The breakdown (E021) does not match the quote: £1,270 + £1,170 = £2,440 before VAT, against a £2,370 subtotal (E016, A1). It also adds an unexplained 10% Northbridge commission and a 50% deposit with no stated basis. The quote document names a different address (A1 against S:case-details). It also doesn't say whether it fixes the leaking pipe and wet wall that were reported (E001, E003). E015 says the inspection window had passed with no visit report, so the visit date and findings should be confirmed too. Under refinements 1 and 3, these conflicts have to go to the party who can settle them before the price is put to the landlord. Only the contractor can do that, so this is the step that unblocks the case. The landlord's question gets a direct answer in this same turn, with a date. The tenant has heard nothing since 16 September (E014) while a worsening leak continues (E011), so she gets an update, interim safety advice and a check on the current state of the leak.

### Boundaries (what this does not prove or settle)

- This does not approve any repair, deposit or spend. The landlord has approved only an inspection and a quote.
- Neither the £2,844.00 total nor the breakdown figures are confirmed as correct for this property.
- Asking about the commission does not settle what Northbridge charges the landlord. That is for the agency to state separately.
- The contractor's description of what he found is not independent proof of the cause of the leak or how far the damage goes.
- No date for the works is promised to the tenant or the landlord.

### Remaining work

- When the corrected quote arrives, send it to the landlord (landlord.send_quote) with the itemised figures, the VAT basis, the deposit terms and whether the leak repair is included, and ask whether he is happy to go ahead.
- Get the agency's own position on its commission before anything goes to the landlord.
- If Hearthline hasn't replied by 25 September, chase by phone or SMS. If the landlord or tenant reports the leak spreading or water near electrics, escalate.
- Act on the tenant's reply about the current state of the leak. If it is near electrics or spreading to other rooms, escalate at once.
- Confirm the office keys are back.

### Assumptions

- Quotation NBL-001-Q1 is the only formal quote, and the E021 breakdown is the second document the landlord means by 'a couple'.
- The Wrenfold Mews address on A1 may be a template or anonymisation error, but it hasn't been confirmed, so it is being queried.
- The inspection took place on or around 18 September, as E016 suggests, though no visit report is on record.

### Evidence

- **E001** · 2025-09-04 08:10 · Nessa Quill (Tenant) → Mira Sallow (Property Manager, Northbridge Lettings): “The pipe behind the shower is leaking again. It was tightened during an earlier visit, but the leak has returned. Water is also coming through the grout behind the wall covering, and the damaged area …”
- **E003** · 2025-09-04 09:05 · Mira Sallow (Property Manager, Northbridge Lettings) → Orin Vale (Landlord): “Mira reported the recurring shower-pipe leak and damp grout/wall covering, noting the earlier tightening had not lasted and visible deterioration had increased. She asked whether the landlord would au…”
- **E005** · 2025-09-07 09:15 · Orin Vale (Landlord) → Mira Sallow (Property Manager, Northbridge Lettings): “Orin authorized arranging a plumbing inspection and obtaining a quote. His message did not authorize the quoted repair work.”
- **E011** · 2025-09-15 15:10 · Nessa Quill (Tenant) → Mira Sallow (Property Manager, Northbridge Lettings): “Nessa said she was away that week and authorized the contractor to enter using the office keys. She asked for the visit to happen as soon as possible, saying the leak had been going on for around a we…”
- **E014** · 2025-09-16 08:05 · Mira Sallow (Property Manager, Northbridge Lettings) → Nessa Quill (Tenant): “Mira advised Nessa that Hearthline Plumbing & Bath had proposed Thursday late morning and that access would be by office keys, as authorized.”
- **E015** · 2025-09-18 12:00 · Mira Sallow (Property Manager, Northbridge Lettings) → Orin Vale (Landlord): “The proposed inspection window has passed. No visit report, invoice, or repair authorization is recorded in the correspondence at this point.”
- **E016** · 2025-09-18 14:25 · Ewan Rook (Contractor, Hearthline Plumbing & Bath) → Mira Sallow (Property Manager, Northbridge Lettings): “Quotation received after the bathroom inspection. Scope: remove the existing shower screen, taps, and shower valve; install a wall-and-riser cladding system with chrome trims; fit new bath taps and a …”
- **E018** · 2025-09-18 15:00 · Orin Vale (Landlord) → Mira Sallow (Property Manager, Northbridge Lettings): “Orin asked for an itemized breakdown before confirming whether he would proceed.”
- **E020** · 2025-09-18 15:30 · Mira Sallow (Property Manager, Northbridge Lettings) → Ewan Rook (Contractor, Hearthline Plumbing & Bath): “Mira asked Ewan for an itemized breakdown, including materials and labour if available, and asked him to confirm whether the total remained £2,844.00.”
- **E021** · 2025-09-18 15:39 · Ewan Rook (Contractor, Hearthline Plumbing & Bath) → Mira Sallow (Property Manager, Northbridge Lettings): “Ewan replied: materials £1,270; labour £1,170 for two people, half a day each; VAT at 20%; Northbridge commission at 10%. He said a 50% deposit would be required if the landlord wished to proceed. The…”
- **E022** · 2025-09-23 16:08 · Mira Sallow (Property Manager, Northbridge Lettings) → Orin Vale (Landlord): “After trying unsuccessfully to reach Orin by phone, Mira sent a brief follow-up asking whether they could go ahead with the quote for the property. The message did not identify an amount or attach the…”
- **E023** · 2025-09-23 16:12 · Orin Vale (Landlord) → Mira Sallow (Property Manager, Northbridge Lettings): “Orin replied: “Which quote do you mean? There are a couple.” He asked for clarification before confirming whether to proceed.”
- **A1** · attachment attachments/bathroom-works-quotation.pdf
- **S:case-details** · Case details: “- **Source role:** Tenant - **Status:** Requires decision - **Created:** 2025-09-04 08:10:00 UTC - **Updated:** 2025-09-23 16:12:00 UTC - **Property:** 4 Thistlewick Rise, Larkcombe, ZZ1 1ZZ”

---

Generated by agent-c on 2026-10-10 15:37:04 UTC from `Property Management/001`. Full reasoning in REASONING.md, trace in trace.jsonl.
