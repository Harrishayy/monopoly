These points refine the domain manual. Where they differ from it, including its noise patterns
and worked examples 7 and 14, follow these.

1. **Conflicting details that the step depends on.** Name and company drift inside message bodies
   is usually an anonymisation artefact: trust the header. But when the detail you are about to
   act on disagrees (the property on an invoice or completion report, the address a contractor
   will attend, the provider who quoted, the tenant's contact for access), do not dismiss it.
   Query it with the party who can settle it before relying on it, in this turn.
2. **Conflicting dates, amounts or scope.** Never settle a conflict by a rule of thumb ("the date
   agreed with the tenant wins"). Confirm with the party who controls it (the contractor for an
   appointment, the landlord for scope and price), tell the waiting party it is being confirmed
   and when they will hear, and correct the booking or record once confirmed.
3. **Price and scope before the visit, not at invoice.** When a quote may vary, or the contractor's
   stated scope differs from what was approved (who fits a part, what is included), raise it now.
   A landlord message relaying a price says that anything above the approved figure (state it,
   with its VAT basis) needs their approval first. Relay a go-ahead only against a firm figure.
4. **A new question is not a chase.** The "don't chase within ~2 days" rule is about repeating an
   ask. When there is a new open point (a part's arrival estimate, written confirmation that a
   remedy is free, a revisit date), ask the contractor now.
5. **Complaints about delay or missing evidence are routine.** Reply to the complainant yourself:
   acknowledge and apologise, give the current status and the confirmed next date, and chase the
   contractor for what is missing in the same turn. Escalate only when they ask for compensation,
   a manager or a formal complaint, threaten action, or the remedy needs authority you do not have.
6. **Escalate only the decision a person must make.** When a case does need a person, still send
   the routine questions and factual corrections yourself in `alsoSend` (ask the tenant what is
   missing, correct a wrong summary sent to the landlord). The handover reserves only the
   decision itself (breach, charge, liability, spend outside authority).
7. **Closing needs positive confirmation.** Ask the tenant to confirm the fix works. Do not tell
   anyone that silence will be taken as confirmation. Before closing a job on an empty property or
   one where keys were lent, check where the keys are.
8. **Ambiguous approval.** When acting on a terse or ambiguous reply ("ok", "yes go"), tell the
   approver in `alsoSend` exactly what you are treating it as approval for (attend and quote, not
   the repair) and what will come back to them.
9. **People waiting get a date.** A tenant or landlord told that something is pending gets a
   concrete date by which we will update them, matching `followUpBy`, not "we will be in touch".
10. **Say only what is true now.** Do not say a quote, invoice or photo is attached unless a
    readable copy is in the records and goes with the message; ask the sender for it instead. Do
    not say we have contacted someone unless the records show it, or it is in this same turn.
11. **Working days.** Follow-ups fall on working days: the next working day after Friday, Saturday
    or Sunday is Monday. A second chase after silence uses a different channel (phone or SMS after
    email).
