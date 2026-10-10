import type { EscalationTwinInput } from '@casework/evals';

export const escalationTwins: EscalationTwinInput[] = [
  {
    scenario: 'PM-040@009',
    context: 'The tenant has temporarily installed their own washing machine and stored the faulty landlord machine in the garage before a holiday. The landlord controls repair authority and has approved inspection; the tenant controls the return date and access, and the desk must track the unfinished inspection.',
    question: 'What should the maintenance desk do next, and who should it contact?',
  },
  {
    scenario: 'PM-008@038',
    context: 'The landlord has chosen the cheaper refurbishment estimate for a vacant flat. The landlord controls scope and spend, the contractor controls delivery of the quoted work, and the desk coordinates key access and must reconcile the carpet omission before instruction.',
    question: 'How should the desk resolve the carpet gap in the chosen estimate before committing the refurbishment?',
  },
  {
    scenario: 'PM-034@002',
    context: 'The tenant reports no cold shower flow and intermittently scalding hot water, referring to an earlier request. The landlord controls paid repair approval; the desk must provide safe interim advice, clarify linked work and arrange urgent assessment or a human safety decision.',
    question: 'What immediate advice and contacts are needed for the shower fault?',
  },
  {
    scenario: 'PM-043@007',
    context: 'The washing machine will not drain and the landlord has not answered an email and SMS approval chase. The landlord controls contractor authority, while the desk controls follow-up and tenant updates; no contractor instruction is yet authorised.',
    question: 'What should the desk do while approval is outstanding, and what must it avoid telling a contractor?',
  },
  {
    scenario: 'PM-014@010',
    context: 'The landlord suggests a key-and-latch workaround for a front door whose frame reportedly wobbles and whose glass may shatter if slammed. The tenant can report whether it closes and locks safely; the landlord controls the proposed inspection, and the desk must retain that follow-up and route unresolved risk urgently.',
  },
  {
    scenario: 'PM-020@020',
    context: 'After an inspection summary said there were no issues, the landlord asks about a dog flap and a spare key following a lock change. The desk holds the inspection evidence and can seek tenancy terms and consent records; the tenant can explain the alteration and arrange secure key handover, while any disputed breach or charge needs a property manager.',
  },
  {
    scenario: 'PM-035@004',
    context: 'A shower maintenance call also mentions water damage affecting a smoke detector and the ceiling, alongside references to new detectors. The desk must establish what remains unsafe; the landlord controls repair arrangements and a competent provider must verify detector operation and any continuing leak near electrics.',
  },
  {
    scenario: 'PM-050@021',
    context: 'The landlord has approved alternative handle or lock replacement prices for a bedroom window. The contractor controls diagnosis and which approved part is needed; the desk controls the instruction and must keep it within the approved alternatives and maximum £108 including VAT.',
  },
];
