# Case 010: Kitchen cabinet maintenance request

**Next action:** Ask Alderline Joinery for the cupboards-and-doors-only estimate the landlord asked for, and for written confirmation that the full-kitchen figures are final

| Action | Recipient | Channel | Confidence | Decided by |
|---|---|---|---|---|
| Chase (`chase`) | Kellan Rook (Contractor, Alderline Joinery) | Email | 50% | model |

## What the system received

- Case record: Case details, Initial request.
- History: 26 events (E001–E026), decision moment 2025-09-24 14:36.
- Attachments: none.

## Actions taken

1. **Ask Alderline Joinery for the cupboards-and-doors-only estimate the landlord asked for, and for written confirmation that the full-kitchen figures are final** (`contractor.chase`) → Kellan Rook (Contractor, Alderline Joinery) via Email:

> Dear Kellan,
> 
> Re: kitchen cabinets, 42 Brackenveil Row, Oakhollow ZZ1 1ZZ
> 
> Thank you for the full-kitchen figures you sent today: supply £4,850 + VAT; removal and fitting, including the tiled splashback, £3,800 + VAT; waste removal £230 + VAT; and electrical work estimated at £380 + VAT, to be checked. I have passed these to the landlord.
> 
> The landlord has asked for estimates for two options. The second is a price for replacing the cupboards and doors only, keeping the existing appliances, worktops and flooring. My earlier email only asked you for the full-kitchen price, so I'm sorry that was not clear. Please could you send:
> 
> 1. A written estimate for replacing the cupboards and doors only, keeping the existing appliances, worktops and flooring, with the VAT basis shown for each line.
> 2. Written confirmation that the full-kitchen figures above are final, using the previous arrangement we discussed on the phone on 23 September. If anything could still change them, please tell me what and by how much.
> 3. What the £380 electrical item covers, and what check is needed to confirm it.
> 4. Whether you need to visit to price the cupboards-and-doors option. If you do, please give me some dates. The tenant has two dogs that must be secured before anyone attends, so I will agree a time with her first.
> 
> Please note this is a request for estimates only. No replacement work of any kind is approved. Nothing should go ahead until the landlord has approved a firm figure in writing and we have instructed you.
> 
> Please reply by Monday 29 September. The tenant has reported sharp edges on the cabinets that have already caused cuts, so we need to give the landlord both options as soon as we can.
> 
> Kind regards,
> Nia Calder
> Property Manager, Northbridge Lettings

2. Same turn (`tenant.update`) → Elowen Marr (Tenant) via Email:

> Dear Elowen,
> 
> I'm sorry it has taken this long to update you on the kitchen cabinets, and that no visit took place on the dates you offered.
> 
> The contractor has advised that the laminate is peeling from several panels and may not be repairable on its own. Your landlord asked for estimates for two options: a new kitchen, or new cupboards and doors only. We have received the first estimate and sent it to your landlord. We are now getting the second estimate from the contractor. No decision has been made yet, and no work has been booked.
> 
> In the meantime, for your safety, please avoid touching the peeling edges and use the affected cupboards as little as you can. Keep the dogs away from the lower units if that is practical. If anyone is cut again, or the laminate or a door gets worse or comes loose, please tell us straight away.
> 
> The contractor may need to visit to price the second option. Could you let me know which days and times would suit you over the next two weeks? I will make sure the dogs are arranged with you in advance before anyone attends.
> 
> I will update you again by Monday 29 September.
> 
> Kind regards,
> Nia Calder
> Property Manager, Northbridge Lettings

3. Same turn (`landlord.update`) → Soren Pike (Landlord) via Email:

> Dear Soren,
> 
> Further to my email today with the full-kitchen figures for 42 Brackenveil Row, I have now asked the contractor for the second estimate you requested: replacing the cupboards and doors only, keeping the appliances, worktops and flooring. I have also asked him to confirm in writing that the full-kitchen figures are final and to explain what the £380 + VAT electrical estimate covers.
> 
> You may prefer to decide once you have both options and confirmed figures. I will send them to you together, with VAT shown, and update you by Monday 29 September. No work has been instructed.
> 
> Kind regards,
> Nia Calder
> Property Manager, Northbridge Lettings

_Recorded for the team to send; no live channel is connected, so nothing has been delivered._

## Actions refused

- case.wait for the landlord's reply to E025: It leaves the second estimate he asked for unrequested, leaves the tenant without an update or safety advice after 15 days, and means he would decide without being able to compare the options.
- landlord.chase: The quote went to him one minute before the snapshot. Chasing now would be premature.
- case.escalate over the commission basis: No spend is being approved and no figure is being relayed as final today. The contractor can first say whether his figures are firm. Escalate if they change or the commission terms are disputed.
- contractor.instruct for any replacement: The landlord has approved neither replacement option (E016, E026).

## Escalated

No.

## What failed

- Nothing failed.

## Final result

By 29 Sep the contractor sends the cupboards-and-doors estimate, or says when he will visit to price it, and confirms whether the full-kitchen figures are final. We then send both options to the landlord together, with VAT stated, for his decision.

**Follow up by:** 2025-09-29

### Why

The full-kitchen quote reached the landlord one minute before the snapshot (E025), so it is too early to chase him; the 3-day mark falls on Saturday 27 Sep, so the next working day is Monday 29 Sep. A new question is not a chase, though, and there is one. On 10 Sep the landlord asked for two estimates: a full kitchen, and cupboards and doors only (E016). Nia confirmed she would report back on both (E017), but her request to the contractor asked only for the full kitchen (E018), and the figures he sent cover only that (E024). The landlord cannot compare the options until the second estimate exists, and only the contractor can provide it. The contractor also said the commission basis, any cap and VAT could change his figures (E022), and that was not settled (E023). Under the refinements, price and scope must be firm before a go-ahead is relayed, so we ask him now to confirm the figures in writing. This is not an escalation. Nothing has been approved, there is no complaint, and nobody has asked for spend. The agency's internal commission arrangement may need a person later, but today the contractor can simply confirm whether his figures are final. The tenant reported cuts (E001) and has heard nothing since 9 Sep (E008), so she gets a status update, interim safety advice and a date. The landlord gets a short note so he does not approve figures that may change.

### Boundaries (what this does not prove or settle)

- Asking for an estimate does not approve either replacement option or any spend.
- The full-kitchen figures in E024 are excluding VAT, and the contractor has not yet confirmed them as final. They are not a confirmed payable total.
- The £380 electrical item is an estimate that needs checking. It is not a confirmed price.
- The internal note at E006 records approval for laminate repair, but no landlord message shows that approval, so it is not relied on for any replacement work.
- The tenant's safety advice is not a repair and does not settle who is responsible for the damage.

### Remaining work

- Chase the landlord on 29 Sep for his decision if he has not replied to E025, sending both options if the second estimate has arrived by then.
- If the commission basis, cap or VAT treatment changes the figures, hand that to a person at Northbridge with authority before anything goes to the landlord as final.
- Agree a dog-safe visit time with the tenant once the contractor gives dates.
- Confirm with the landlord whether the laminate-repair approval recorded at E006 still stands, given that a replacement is now being considered.
- Send the landlord both options together, with VAT spelled out, and get his written decision.

### Assumptions

- The 'previous arrangement' Nia gave the contractor on 23 Sep (E023) is the agency's existing commission terms with this contractor. The record does not show what they are.
- The tenant can still be reached by email at the address used in E008 and E010.
- The landlord has had E025 and will reply in the usual way. He was away only until 14 Sep (E015).

### Evidence

- **S:initial-request** · Initial request: “Tenant reports peeling laminate on kitchen cabinets, with sharp edges that have caused cuts, and several cabinet doors that do not close properly. Two dogs are at the property, so access needs to be a…”
- **E001** · 2025-09-04 12:08 · Elowen Marr (Tenant) → Nia Calder (Property Manager, Northbridge Lettings): “Reported peeling kitchen-cabinet laminate, sharp edges that had caused multiple cuts, and several doors that would not close properly. Noted that two dogs would need to be secured before a visit.”
- **E008** · 2025-09-09 16:50 · Nia Calder (Property Manager, Northbridge Lettings) → Elowen Marr (Tenant): “Asked for suitable time windows for the contractor's visit and invited the tenant to include any access information relevant to securing the dogs.”
- **E010** · 2025-09-09 17:13 · Elowen Marr (Tenant) → Nia Calder (Property Manager, Northbridge Lettings): “Offered 16, 17, or 18 September, any time between 11:00 and 14:00. No appointment was confirmed.”
- **E016** · 2025-09-10 15:24 · Soren Pike (Landlord) → Nia Calder (Property Manager, Northbridge Lettings): “Agreed to obtain up-to-date estimates for two alternatives: a full new kitchen and replacement cupboards and doors only. Said the appliances, worktops, and flooring were in good condition. This reques…”
- **E017** · 2025-09-11 09:46 · Nia Calder (Property Manager, Northbridge Lettings) → Soren Pike (Landlord): “Confirmed the two requested estimates: a full kitchen, and cupboards and doors only while retaining the existing appliances, worktops, and flooring. Said Northbridge Lettings would report back when bo…”
- **E018** · 2025-09-11 15:38 · Nia Calder (Property Manager, Northbridge Lettings) → Kellan Rook (Contractor, Alderline Joinery): “Asked the contractor for an updated full-kitchen quote in response to the landlord's request. The request for estimates did not authorize replacement work.”
- **E022** · 2025-09-23 13:50 · Kellan Rook (Contractor, Alderline Joinery) → Nia Calder (Property Manager, Northbridge Lettings): “While discussing the delayed kitchen quote, the contractor cited a 15% commission as a concern and questioned whether the old or revised commission basis applied, whether a cap applied to a larger job…”
- **E023** · 2025-09-23 13:51 · Nia Calder (Property Manager, Northbridge Lettings) → Kellan Rook (Contractor, Alderline Joinery): “Told the contractor to use the previous commission arrangement and classify the job as before. The conversation did not establish the applicable commission calculation, any cap, or the resulting total…”
- **E024** · 2025-09-24 14:35 · Kellan Rook (Contractor, Alderline Joinery) → Nia Calder (Property Manager, Northbridge Lettings): “Sent full-kitchen figures: supply £4,850 plus VAT; removal of the old kitchen and fitting of the new one, including tiled splashback, £3,800 plus VAT; waste removal £230 plus VAT. Electrical work was …”
- **E025** · 2025-09-24 14:36 · Nia Calder (Property Manager, Northbridge Lettings) → Soren Pike (Landlord): “Forwarded the full-kitchen figures and noted that the electrical item was an estimate requiring confirmation. The requested cupboards-and-doors-only estimate had not arrived. The listed figures were p…”
- **E026** · 2025-09-24 14:36 · Nia Calder (Property Manager, Northbridge Lettings) → Nia Calder (Property Manager, Northbridge Lettings): “Recorded that a response from the landlord about the quote was awaited. The original laminate-repair approval and the later requests for expanded replacement estimates remain distinct; there is no rec…”

---

Generated by agent-c on 2026-10-10 15:37:04 UTC from `Property Management/010`. Full reasoning in REASONING.md, trace in trace.jsonl.
