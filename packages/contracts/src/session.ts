import { Schema } from 'effect';
import { safeParse } from './shared-schemas.js';

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

// ─── Session ───

/** 'single' = one harness instance; 'group' = multiple members over the group bus. */
export const SSessionKind = Schema.Literal('single', 'group');
export type SessionKind = Schema.Schema.Type<typeof SSessionKind>;

/**
 * Session lifecycle status:
 * - active: a prompt turn is in flight
 * - idle: connected or resumable, no turn in flight
 * - interrupted: last turn did not complete (crash, corrupt log tail)
 * - error: recoverable error state surfaced by the supervisor
 * - closed: ended; reopen is read-only unless the harness supports load/resume
 */
export const SSessionStatus = Schema.Literal('active', 'idle', 'interrupted', 'error', 'closed');
export type SessionStatus = Schema.Schema.Type<typeof SSessionStatus>;

export const SSession = Schema.Struct({
  id: Schema.String,
  projectId: Schema.String,
  harnessId: Schema.String,
  kind: Schema.optionalWith(SSessionKind, { default: () => 'single' as const }),
  status: SSessionStatus,
  title: Schema.optional(Schema.String),
  /** ACP-side session id returned by session/new, when one exists. */
  acpSessionId: Schema.optional(Schema.String),
  /** Set on fork-with-handoff: links a forked session to the session it continues. */
  parentSessionId: Schema.optional(Schema.String),
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  updatedAt: Schema.optional(Schema.String.pipe(Schema.pattern(datetimePattern))),
});
export type Session = Schema.Schema.Type<typeof SSession>;

// ─── SessionEvent envelope ───

/** Version of the srgnt event envelope itself (not the ACP protocol version). */
export const SESSION_EVENT_ENVELOPE_VERSION = 1;

/**
 * Event kinds srgnt writes today. The envelope's `kind` field is intentionally
 * an open string set (tolerant reader, ARCH-0009): readers must not fail on
 * kinds they do not recognize — newer writers may add kinds at any time.
 */
export const knownSessionEventKinds = [
  'acp/session_update',
  'client/session_created',
  'client/prompt',
  'client/stop',
  'client/permission_request',
  'client/permission_decision',
  // Client-service audit surface (STEP-23-02 emitted these, STEP-23-03 formalizes
  // them). They belong in the shared vocabulary for the same reason the
  // permission kinds do: what the agent read, wrote, and was refused is part of
  // the same trust record, and Phase 24 persists one stream, not two.
  'client/fs_read_text_file',
  'client/fs_write_text_file',
  'client/fs_denied',
  'client/session_closed',
] as const;
export type KnownSessionEventKind = (typeof knownSessionEventKinds)[number];

export function isKnownSessionEventKind(kind: string): kind is KnownSessionEventKind {
  return (knownSessionEventKinds as readonly string[]).includes(kind);
}

/**
 * Versioned envelope for one line of events.jsonl — the session source of truth.
 * `payload` carries raw ACP updates verbatim (or srgnt client event data) and is
 * deliberately opaque; `protocolVersion` records the negotiated ACP protocol
 * version so fixture-pinned decodes catch drift at upgrade time, not read time.
 * Unknown extra fields on the envelope are tolerated (and dropped on decode).
 */
export const SSessionEvent = Schema.Struct({
  seq: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  ts: Schema.String.pipe(Schema.pattern(datetimePattern)),
  protocolVersion: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  kind: Schema.String,
  payload: Schema.optional(Schema.Unknown),
});
export type SessionEvent = Schema.Schema.Type<typeof SSessionEvent>;

/**
 * Tolerant reader for a single decoded JSONL value. Never throws; unknown
 * `kind` values and unknown extra fields decode successfully. Only structural
 * damage to the envelope itself (missing seq/ts/kind, wrong types) fails.
 */
export function readSessionEvent(value: unknown):
  | { success: true; data: SessionEvent }
  | { success: false; error: unknown } {
  return safeParse(SSessionEvent, value);
}
