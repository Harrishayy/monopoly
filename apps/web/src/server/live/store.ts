import 'server-only';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Case, Source, SourceKind } from '@casework/core';
import { ACTIVE_TRACK, REPO_ROOT } from '../config';

/**
 * Durable store for live operations: cases opened by calls and emails, every message on them,
 * every run event, and outbound messages (sent or waiting for approval). Example cases from
 * data/ stay on disk; only live work lives here.
 */

/**
 * Lives outside the repo by default: the dev server watches the workspace, and SQLite's -wal file
 * changing on every write would otherwise trigger a rebuild and reload the browser in a loop.
 */
const DB_FILE = ((p: string) => (p.startsWith('~/') ? join(homedir(), p.slice(2)) : resolve(/* turbopackIgnore: true */ REPO_ROOT, p)))(
  process.env.DB_PATH || '~/.casework/casework.db',
);

const g = globalThis as unknown as { __caseworkDb?: DatabaseSync };

function open(): DatabaseSync {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cases (
      ref TEXT PRIMARY KEY,
      track TEXT NOT NULL,
      title TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      contact TEXT,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      case_ref TEXT NOT NULL,
      external_id TEXT UNIQUE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      received_at TEXT NOT NULL,
      body TEXT NOT NULL,
      meta TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS sources_case ON sources(case_ref);
    CREATE TABLE IF NOT EXISTS runs (
      run_id TEXT PRIMARY KEY,
      case_ref TEXT NOT NULL,
      meta TEXT NOT NULL,
      decision TEXT,
      error TEXT,
      finished INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS run_events (
      run_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      event TEXT NOT NULL,
      PRIMARY KEY (run_id, seq)
    );
    CREATE TABLE IF NOT EXISTS outbound (
      id TEXT PRIMARY KEY,
      case_ref TEXT NOT NULL,
      run_id TEXT,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      address TEXT,
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      why TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT,
      error TEXT
    );
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return db;
}

export const db = (): DatabaseSync => (g.__caseworkDb ??= open());

// ── cases ────────────────────────────────────────────────────────────────

export interface LiveCaseRow {
  ref: string;
  track: string;
  title: string;
  customerName: string;
  contact: string | null;
  channel: SourceKind;
  status: Case['status'];
  createdAt: string;
  updatedAt: string;
}

const toCase = (r: Record<string, unknown>): LiveCaseRow => ({
  ref: String(r.ref),
  track: String(r.track),
  title: String(r.title),
  customerName: String(r.customer_name),
  contact: (r.contact as string | null) ?? null,
  channel: r.channel as SourceKind,
  status: r.status as Case['status'],
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

/** Next free ref. Uses the highest number in use, so deleting a case never reissues a ref. */
export function nextRef(): string {
  const row = db().prepare(`SELECT MAX(CAST(SUBSTR(ref, 6) AS INTEGER)) AS n FROM cases WHERE ref LIKE 'LIVE-%'`).get() as { n: number | null };
  return `LIVE-${String((row.n ?? 0) + 1).padStart(3, '0')}`;
}

export function insertCase(c: Omit<LiveCaseRow, 'track'> & { track?: string }) {
  db()
    .prepare(`INSERT INTO cases (ref, track, title, customer_name, contact, channel, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(c.ref, c.track ?? ACTIVE_TRACK, c.title, c.customerName, c.contact, c.channel, c.status, c.createdAt, c.updatedAt);
}

export function updateCase(ref: string, patch: Partial<Pick<LiveCaseRow, 'title' | 'status' | 'customerName' | 'contact' | 'updatedAt'>>) {
  const cur = getLiveCaseRow(ref);
  if (!cur) return;
  const next = { ...cur, ...patch };
  db()
    .prepare(`UPDATE cases SET title = ?, status = ?, customer_name = ?, contact = ?, updated_at = ? WHERE ref = ?`)
    .run(next.title, next.status, next.customerName, next.contact, next.updatedAt, ref);
}

export function getLiveCaseRow(ref: string): LiveCaseRow | undefined {
  const r = db().prepare(`SELECT * FROM cases WHERE ref = ?`).get(ref) as Record<string, unknown> | undefined;
  return r ? toCase(r) : undefined;
}

/** The most recent case (last 14 days) for this phone number or email address. */
export function findOpenCaseByContact(contact: string, withinDays = 14): LiveCaseRow | undefined {
  const since = new Date(Date.now() - withinDays * 86_400_000).toISOString();
  const r = db()
    // Any recent case: a run "resolving" means the agent took its step, not that the job is closed.
    .prepare(`SELECT * FROM cases WHERE lower(contact) = lower(?) AND updated_at >= ? ORDER BY updated_at DESC LIMIT 1`)
    .get(contact, since) as Record<string, unknown> | undefined;
  return r ? toCase(r) : undefined;
}

export function listLiveCaseRows(): LiveCaseRow[] {
  return (db().prepare(`SELECT * FROM cases ORDER BY updated_at DESC`).all() as Record<string, unknown>[]).map(toCase);
}

/** The case an email thread already belongs to. */
export function findCaseByThread(threadId: string): LiveCaseRow | undefined {
  const r = db().prepare(`SELECT case_ref FROM sources WHERE json_extract(meta, '$.threadId') = ? ORDER BY received_at DESC LIMIT 1`).get(threadId) as { case_ref: string } | undefined;
  return r ? getLiveCaseRow(r.case_ref) : undefined;
}

// ── sources ──────────────────────────────────────────────────────────────

export function hasExternalId(externalId: string): boolean {
  return !!db().prepare(`SELECT 1 FROM sources WHERE external_id = ?`).get(externalId);
}

export function insertSource(caseRef: string, s: Source, externalId?: string) {
  db()
    .prepare(`INSERT INTO sources (id, case_ref, external_id, kind, title, received_at, body, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(s.id, caseRef, externalId ?? null, s.kind, s.title, s.receivedAt, s.body, JSON.stringify(s.meta ?? {}));
}

export function updateSourceBody(externalId: string, body: string, meta: Record<string, unknown>) {
  db().prepare(`UPDATE sources SET body = ?, meta = ? WHERE external_id = ?`).run(body, JSON.stringify(meta), externalId);
}

export function getSourceByExternalId(externalId: string): (Source & { caseRef: string }) | undefined {
  const r = db().prepare(`SELECT * FROM sources WHERE external_id = ?`).get(externalId) as Record<string, unknown> | undefined;
  return r ? { ...rowToSource(r), caseRef: String(r.case_ref) } : undefined;
}

const rowToSource = (r: Record<string, unknown>): Source => ({
  id: String(r.id),
  kind: r.kind as SourceKind,
  title: String(r.title),
  receivedAt: String(r.received_at),
  body: String(r.body),
  meta: JSON.parse(String(r.meta ?? '{}')),
});

export function sourcesFor(caseRef: string): Source[] {
  return (db().prepare(`SELECT * FROM sources WHERE case_ref = ? ORDER BY received_at`).all(caseRef) as Record<string, unknown>[]).map(rowToSource);
}

export function countSources(caseRef: string): number {
  return (db().prepare(`SELECT COUNT(*) AS n FROM sources WHERE case_ref = ?`).get(caseRef) as { n: number }).n;
}

/** A live case as the agent sees it. */
export function liveCase(ref: string): Case | undefined {
  const row = getLiveCaseRow(ref);
  if (!row) return undefined;
  return {
    ref: row.ref,
    track: row.track as Case['track'],
    title: row.title,
    customer: { id: row.contact ?? undefined, name: row.customerName },
    status: row.status,
    sources: sourcesFor(ref),
  };
}

export const listLiveCases = (): Case[] => listLiveCaseRows().map((r) => liveCase(r.ref)!).filter(Boolean);

// ── runs ─────────────────────────────────────────────────────────────────

export function saveRunMeta(runId: string, caseRef: string, meta: unknown) {
  db().prepare(`INSERT OR REPLACE INTO runs (run_id, case_ref, meta, finished) VALUES (?, ?, ?, 0)`).run(runId, caseRef, JSON.stringify(meta));
}

export function saveRunEvent(runId: string, seq: number, event: unknown) {
  db().prepare(`INSERT OR REPLACE INTO run_events (run_id, seq, event) VALUES (?, ?, ?)`).run(runId, seq, JSON.stringify(event));
}

export function finishRun(runId: string, error?: string) {
  db().prepare(`UPDATE runs SET finished = 1, error = ? WHERE run_id = ?`).run(error ?? null, runId);
}

export function saveRunDecision(runId: string, decision: unknown) {
  db().prepare(`UPDATE runs SET decision = ? WHERE run_id = ?`).run(JSON.stringify(decision), runId);
}

export interface StoredRun {
  runId: string;
  meta: unknown;
  events: unknown[];
  decision?: unknown;
  error?: string;
  finished: boolean;
}

export function loadStoredRuns(): StoredRun[] {
  const rows = db().prepare(`SELECT * FROM runs`).all() as Record<string, unknown>[];
  const ev = db().prepare(`SELECT event FROM run_events WHERE run_id = ? ORDER BY seq`);
  return rows.map((r) => ({
    runId: String(r.run_id),
    meta: JSON.parse(String(r.meta)),
    events: (ev.all(String(r.run_id)) as { event: string }[]).map((e) => JSON.parse(e.event)),
    decision: r.decision ? JSON.parse(String(r.decision)) : undefined,
    error: (r.error as string | null) ?? undefined,
    finished: !!r.finished,
  }));
}

// ── outbound ─────────────────────────────────────────────────────────────

export type OutboundStatus = 'sent' | 'awaiting_approval' | 'recorded' | 'failed' | 'rejected' | 'superseded';

export interface Outbound {
  id: string;
  caseRef: string;
  runId: string | null;
  channel: string;
  recipient: string;
  address: string | null;
  subject: string | null;
  body: string;
  status: OutboundStatus;
  why: string | null;
  createdAt: string;
  sentAt: string | null;
  error: string | null;
}

const toOutbound = (r: Record<string, unknown>): Outbound => ({
  id: String(r.id),
  caseRef: String(r.case_ref),
  runId: (r.run_id as string | null) ?? null,
  channel: String(r.channel),
  recipient: String(r.recipient),
  address: (r.address as string | null) ?? null,
  subject: (r.subject as string | null) ?? null,
  body: String(r.body),
  status: r.status as OutboundStatus,
  why: (r.why as string | null) ?? null,
  createdAt: String(r.created_at),
  sentAt: (r.sent_at as string | null) ?? null,
  error: (r.error as string | null) ?? null,
});

export function insertOutbound(o: Outbound) {
  db()
    .prepare(`INSERT OR IGNORE INTO outbound (id, case_ref, run_id, channel, recipient, address, subject, body, status, why, created_at, sent_at, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(o.id, o.caseRef, o.runId, o.channel, o.recipient, o.address, o.subject, o.body, o.status, o.why, o.createdAt, o.sentAt, o.error);
}

export function setOutboundStatus(id: string, status: OutboundStatus, extra: { sentAt?: string; error?: string } = {}) {
  db().prepare(`UPDATE outbound SET status = ?, sent_at = COALESCE(?, sent_at), error = ? WHERE id = ?`).run(status, extra.sentAt ?? null, extra.error ?? null, id);
}

/** A newer run replaces the case's older drafts that nobody has acted on yet. */
export function supersedePending(caseRef: string, keepId: string): string[] {
  const rows = db().prepare(`SELECT id FROM outbound WHERE case_ref = ? AND status = 'awaiting_approval' AND id != ?`).all(caseRef, keepId) as { id: string }[];
  db().prepare(`UPDATE outbound SET status = 'superseded', why = COALESCE(why, '') || '; replaced by a newer draft' WHERE case_ref = ? AND status = 'awaiting_approval' AND id != ?`).run(caseRef, keepId);
  return rows.map((r) => r.id);
}

export function setOutboundAddress(id: string, address: string) {
  db().prepare(`UPDATE outbound SET address = ? WHERE id = ?`).run(address, id);
}

export function setOutboundBody(id: string, body: string) {
  db().prepare(`UPDATE outbound SET body = ? WHERE id = ?`).run(body, id);
}

export function getOutbound(id: string): Outbound | undefined {
  const r = db().prepare(`SELECT * FROM outbound WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return r ? toOutbound(r) : undefined;
}

export function listOutbound(filter: { caseRef?: string; status?: OutboundStatus } = {}): Outbound[] {
  const rows = db().prepare(`SELECT * FROM outbound ORDER BY created_at DESC`).all() as Record<string, unknown>[];
  return rows.map(toOutbound).filter((o) => (!filter.caseRef || o.caseRef === filter.caseRef) && (!filter.status || o.status === filter.status));
}

// ── key/value (poll cursors) ─────────────────────────────────────────────

export const kvGet = (key: string): string | undefined =>
  (db().prepare(`SELECT value FROM kv WHERE key = ?`).get(key) as { value: string } | undefined)?.value;

export const kvSet = (key: string, value: string) => db().prepare(`INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)`).run(key, value);
