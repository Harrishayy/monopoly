import 'server-only';
import { RunEvent, type Assessment, type NextStep } from '@casework/core';
import { VIDEO_CALL_LINES, VIDEO_DEMO_REF, VIDEO_SHOTS } from '@/lib/demo';
import { ACTIVE_TRACK } from '../config';
import { importStoredRun, forgetRunsFor, type RunMeta } from '../runs';
import { attachCrm, directory } from './directory';
import { liveEnv } from './env';
import { emitLive } from './intake';
import {
  clearCaseHistory,
  finishRun,
  getLiveCaseRow,
  insertCase,
  insertOutbound,
  insertSource,
  isCaseHidden,
  saveRunEvent,
  saveRunMeta,
  setCaseHidden,
  updateCase,
  type Outbound,
} from './store';

const AGENCY = process.env.AGENCY_NAME || 'Northgate Lettings';

function ago(hours: number, extraMin = 0) {
  return new Date(Date.now() - hours * 3_600_000 - extraMin * 60_000).toISOString();
}

function tenantOf() {
  const t = directory().tenants[0];
  if (!t) throw new Error('Directory has no tenant to put on the video case.');
  const property = directory().properties.find((p) => p.id === t.propertyId);
  const landlord = property && directory().landlords.find((l) => l.id === property.landlordId);
  const landlordEmail = liveEnv('DEMO_LANDLORD_EMAIL', true);
  return {
    tenant: t,
    property,
    landlord: landlord && landlordEmail ? { ...landlord, email: landlordEmail } : landlord,
  };
}

export interface VideoDemoState {
  caseRef: string;
  title: string;
  prepared: boolean;
  tenantName: string;
  contact: string | null;
  phone: string | null;
  callReady: boolean;
  portalUrl: string;
  shots: typeof VIDEO_SHOTS;
  callLines: typeof VIDEO_CALL_LINES;
}

export function videoDemoState(): VideoDemoState {
  const row = getLiveCaseRow(VIDEO_DEMO_REF);
  const { tenant } = tenantOf();
  const phone = liveEnv('DEMO_TENANT_PHONE') || tenant.phone;
  const publicUrl = (liveEnv('PUBLIC_URL') || '').replace(/\/$/, '');
  return {
    caseRef: VIDEO_DEMO_REF,
    title: row?.title ?? 'No heating — Flat 2, 12 Elm Road',
    prepared: !!row && !isCaseHidden(VIDEO_DEMO_REF),
    tenantName: tenant.name,
    contact: row?.contact ?? tenant.email,
    phone,
    callReady: !!(liveEnv('ELEVENLABS_API_KEY') && liveEnv('ELEVENLABS_AGENT_ID')),
    portalUrl: `${publicUrl || 'http://localhost:3100'}/portal?demo=1`,
    shots: VIDEO_SHOTS,
    callLines: VIDEO_CALL_LINES,
  };
}

/** Seeds the prerun email chain. Idempotent unless `reset` is set. */
export function prepareVideoDemo(opts: { reset?: boolean } = {}): VideoDemoState {
  const existing = getLiveCaseRow(VIDEO_DEMO_REF);
  if (existing && !opts.reset) {
    setCaseHidden(VIDEO_DEMO_REF, false);
    return videoDemoState();
  }

  const { tenant, property, landlord } = tenantOf();
  const contact = tenant.email;
  const title = 'No heating — Flat 2, 12 Elm Road';
  const tEmail1 = ago(18, 12);
  const tAsk = ago(18, 10);
  const tEmail2 = ago(3, 19);
  const tHold = ago(3, 17);
  const run1 = 'demo-video-run-ask';
  const run2 = 'demo-video-run-hold';

  forgetRunsFor(VIDEO_DEMO_REF);
  if (existing) {
    clearCaseHistory(VIDEO_DEMO_REF);
    updateCase(VIDEO_DEMO_REF, { title, customerName: tenant.name, contact, status: 'needs_info', updatedAt: tHold });
    setCaseHidden(VIDEO_DEMO_REF, false);
  } else {
    insertCase({
      ref: VIDEO_DEMO_REF,
      title,
      customerName: tenant.name,
      contact,
      channel: 'email',
      status: 'needs_info',
      createdAt: tEmail1,
      updatedAt: tHold,
    });
  }

  attachCrm(VIDEO_DEMO_REF, contact, tEmail1);

  const threadId = 'demo-video-heating';
  insertSource(
    VIDEO_DEMO_REF,
    {
      id: `${VIDEO_DEMO_REF}:event-1`,
      kind: 'email',
      title: 'Boiler banging — no hot water',
      receivedAt: tEmail1,
      body: [
        `Hi ${AGENCY},`,
        '',
        `The boiler at ${property?.address ?? 'Flat 2, 12 Elm Road'} has been making a loud banging noise since Monday evening. This morning there's no hot water at all.`,
        '',
        'Please can someone look at it?',
        '',
        `Thanks,\n${tenant.name}`,
      ].join('\n'),
      meta: { name: tenant.name, contact, threadId, via: 'email' },
    },
    'demo-video:email-1',
  );

  insertSource(
    VIDEO_DEMO_REF,
    {
      id: `${VIDEO_DEMO_REF}:event-2`,
      kind: 'email',
      title: 'Re: Boiler banging — no hot water',
      receivedAt: tEmail2,
      body: [
        'Still no heating or hot water. The flat is freezing and I have a two-year-old here.',
        '',
        'Please can someone come today?',
        '',
        tenant.name,
      ].join('\n'),
      meta: { name: tenant.name, contact, threadId, via: 'email' },
    },
    'demo-video:email-2',
  );

  const ask: NextStep = {
    action: 'tenant.ask',
    recipient: 'tenant',
    channel: 'email',
    message: [
      `Hi ${tenant.name},`,
      '',
      `Thanks for reporting this — I've logged it against ${property?.address ?? 'Flat 2, 12 Elm Road'}.`,
      '',
      "Could you send the make of the boiler if you can see it, and any error code on the display? If there's no hot water at all we'll treat it as a breakdown and contact your landlord about a heating engineer.",
      '',
      "I'll update you as soon as I have a next step.",
      '',
      AGENCY,
    ].join('\n'),
    reason: 'Need the boiler make and any error code before asking the landlord to send an engineer.',
    citations: [`${VIDEO_DEMO_REF}:event-1`],
    confidence: 0.86,
    boundaries: ['Do not promise a same-day visit.', 'Do not claim the cause of the bang.'],
    remainingWork: ['Wait for the boiler make or error code.', 'Contact the landlord if it is a full breakdown.'],
    decidedBy: 'model',
  };

  const hold: NextStep = {
    action: 'landlord.request_approval',
    recipient: 'landlord',
    channel: 'email',
    message: [
      `Hi ${landlord?.name ?? 'Priya'},`,
      '',
      `Urgent: ${property?.address ?? 'Flat 2, 12 Elm Road'} (${tenant.name}). The boiler has been banging since Monday; this morning there is no heating or hot water. ${tenant.name} has a two-year-old in the flat and has asked for a visit today.`,
      '',
      "May we send Testford Heating & Plumbing (Gas Safe) to inspect and repair, and confirm access? Standing consent is £300 — we'll stop and come back to you if the engineer quotes above that.",
      '',
      'Please reply today if you can.',
      '',
      AGENCY,
    ].join('\n'),
    reason: 'No heat, a child in the flat, and no landlord instruction on file. A contractor cannot be sent until a person approves.',
    citations: [`${VIDEO_DEMO_REF}:event-1`, `${VIDEO_DEMO_REF}:event-2`],
    confidence: 0.91,
    boundaries: ['Do not instruct a contractor before approval.', 'Do not tell the tenant a time that has not been booked.'],
    remainingWork: ['Landlord approval.', 'Access window from the tenant.', 'Instruct the Gas Safe contractor once approved.'],
    decidedBy: 'model',
  };

  const assess1: Assessment = {
    asOf: tAsk,
    stage: 'New report — waiting on tenant detail',
    facts: [{ text: 'Boiler banging since Monday; no hot water this morning.', sourceIds: [`${VIDEO_DEMO_REF}:event-1`] }],
    flags: [],
    suggested: [{ action: 'tenant.ask', why: 'Need the boiler make and any error code before instructing anyone.' }],
    barred: [{ action: 'contractor.instruct', ruleId: 'property.approval', why: 'No landlord instruction and the fault is not yet confirmed.' }],
    boundaries: ['Do not promise a same-day engineer.', 'Do not claim the cause of the bang.'],
    noise: [],
  };

  const assess2: Assessment = {
    asOf: tHold,
    stage: 'Breakdown with a child in the home — waiting on landlord approval',
    facts: [
      { text: 'Still no heating or hot water this morning.', sourceIds: [`${VIDEO_DEMO_REF}:event-2`] },
      { text: 'A two-year-old lives at the property.', sourceIds: [`${VIDEO_DEMO_REF}:event-2`] },
    ],
    flags: [{ id: 'child-no-heat', text: 'Young child in a flat with no heating.', sourceIds: [`${VIDEO_DEMO_REF}:event-2`], mustEscalate: false }],
    suggested: [{ action: 'landlord.request_approval', why: 'Urgent repair; standing consent does not cover sending an engineer without asking on a breakdown like this.' }],
    barred: [{ action: 'contractor.instruct', ruleId: 'property.approval', why: 'Landlord has not approved a visit. The guard refuses an instruction.' }],
    boundaries: ['Do not send a contractor before approval.', 'Do not tell the tenant someone is on the way.'],
    noise: [],
  };

  persistRun({
    runId: run1,
    at: tAsk,
    next: ask,
    assessment: assess1,
    outcome: 'needs_info',
    summary: 'Asked the tenant for the boiler make and any error code.',
    blocked: false,
  });

  persistRun({
    runId: run2,
    at: tHold,
    next: hold,
    assessment: assess2,
    outcome: 'needs_info',
    summary: 'Refused to instruct a contractor. Held an urgent landlord approval, with the child flagged.',
    blocked: true,
  });

  insertOutbound(out(`${run1}:out`, run1, ask, 'sent', tAsk, tAsk, 'Low-stakes reply to the customer, confident, no escalation', tenant.email, `Re: Boiler banging — no hot water [${VIDEO_DEMO_REF}]`));
  insertOutbound(
    out(
      `${run2}:out`,
      run2,
      hold,
      'awaiting_approval',
      tHold,
      null,
      'landlord.request_approval needs a person’s sign-off',
      landlord?.email ?? null,
      `Re: No heating — Flat 2, 12 Elm Road [${VIDEO_DEMO_REF}]`,
    ),
  );

  emitLive({ kind: 'case.opened', caseRef: VIDEO_DEMO_REF, title, channel: 'email' });
  return videoDemoState();
}

function persistRun(opts: { runId: string; at: string; next: NextStep; assessment: Assessment; outcome: 'needs_info'; summary: string; blocked: boolean }) {
  const row = getLiveCaseRow(VIDEO_DEMO_REF)!;
  const meta: RunMeta = {
    runId: opts.runId,
    caseRef: VIDEO_DEMO_REF,
    caseTitle: row.title,
    track: ACTIVE_TRACK,
    autonomy: 'ask_first',
    mode: 'model',
    agent: 'c',
    tag: { kind: 'live', name: 'Live intake' },
    startedAt: opts.at,
  };
  saveRunMeta(opts.runId, VIDEO_DEMO_REF, meta);
  const events: RunEvent[] = [
    { type: 'run.started', runId: opts.runId, seq: 0, at: opts.at, caseRef: VIDEO_DEMO_REF, autonomy: 'ask_first' },
    { type: 'step.read', runId: opts.runId, seq: 1, at: opts.at, sourceIds: [`${VIDEO_DEMO_REF}:event-1`, ...(opts.blocked ? [`${VIDEO_DEMO_REF}:event-2`] : [])], summary: opts.summary },
    { type: 'case.assessed', runId: opts.runId, seq: 2, at: opts.at, assessment: opts.assessment },
    ...(opts.blocked
      ? ([
          {
            type: 'action.blocked',
            runId: opts.runId,
            seq: 3,
            at: opts.at,
            action: 'contractor.instruct',
            ruleId: 'property.approval',
            why: 'No landlord approval on file for a heating engineer visit.',
          },
        ] as RunEvent[])
      : []),
    {
      type: 'decision.made',
      runId: opts.runId,
      seq: opts.blocked ? 4 : 3,
      at: opts.at,
      label: opts.next.action === 'tenant.ask' ? 'Ask the tenant for the error code' : 'Hold landlord approval',
      rationale: opts.next.reason,
      confidence: opts.next.confidence,
      citations: opts.next.citations,
    },
    { type: 'next.proposed', runId: opts.runId, seq: opts.blocked ? 5 : 4, at: opts.at, next: opts.next },
    {
      type: 'run.completed',
      runId: opts.runId,
      seq: opts.blocked ? 6 : 5,
      at: opts.at,
      outcome: opts.outcome,
      summary: opts.summary,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    },
  ];
  for (const e of events) {
    saveRunEvent(opts.runId, e.seq, RunEvent.parse(e));
  }
  finishRun(opts.runId);
  importStoredRun(opts.runId);
}

function out(id: string, runId: string, next: NextStep, status: Outbound['status'], createdAt: string, sentAt: string | null, why: string, address: string | null, subject: string): Outbound {
  return {
    id,
    caseRef: VIDEO_DEMO_REF,
    runId,
    channel: 'email',
    recipient: next.recipient,
    address,
    subject,
    body: next.message,
    status,
    why,
    createdAt,
    sentAt,
    error: null,
  };
}

export const videoDemoCallScript = (tenantName: string, address: string) => ({
  firstMessage: `Hello ${tenantName.split(' ')[0]}, it's ${AGENCY}. I'm calling about the heating at ${address} — still no heat, and you mentioned a two-year-old. Can you confirm the boiler is still off, and what time we can get someone in today?`,
  prompt: `You are the tenant line for ${AGENCY}, calling ${tenantName} at ${address} about a boiler breakdown (no heating or hot water, young child in the home). This is a follow-up, not a first contact. Confirm the heating is still off, get an access window today, and ask for the boiler make or error code if they have it. Be brief. British English. After you have access and the boiler detail, thank them and end the call. Use the log_issue tool with their name, phone, address, the issue (no heating), details (child, access time, boiler), and urgency urgent.`,
});
