import { homedir } from 'node:os';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import { SESSION_EVENT_ENVELOPE_VERSION, type SessionEvent } from '@srgnt/contracts';
import type { AcpAgentConnection } from '../../acp/connection.js';

/**
 * Fixture recorder: tees a live wrapper connection's `session/update` traffic to
 * disk as srgnt {@link SessionEvent} envelopes — the exact `events.jsonl` shape
 * the persistence layer (Phase 24) reads. Committed recordings become the
 * tolerant-decode corpus that pins reader behavior against real-agent drift
 * (ARCH-0009), so machine-identifying absolute paths are redacted before any
 * frame is written.
 */

const HOME = homedir();
// A single canonical token (with leading slash) so every absolute user home —
// the current machine's and any other — normalizes to the identical string; the
// committed fixtures and README use this exact form.
const HOME_TOKEN = '/<HOME>';
// Any absolute macOS/Linux user home, so a fixture recorded on one machine never
// leaks another's username when re-recorded or hand-edited.
const USER_HOME_PATTERN = /\/(?:Users|home)\/[^/\s"]+/g;

/** Redacts absolute home paths from any JSON value, returning a deep copy. */
export function redactHomePaths<T>(value: T): T {
  if (typeof value === 'string') {
    // Standard user homes first, then the current machine's home in case it is
    // non-standard (e.g. `/root`) and the pattern above misses it. Both map to
    // the same token.
    const withPattern = value.replace(USER_HOME_PATTERN, HOME_TOKEN);
    return (HOME.length > 0 ? withPattern.split(HOME).join(HOME_TOKEN) : withPattern) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactHomePaths(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = redactHomePaths(item);
    }
    return out as unknown as T;
  }
  return value;
}

export interface RecorderOptions {
  /** Negotiated ACP protocol version stamped on every envelope. */
  readonly protocolVersion: number;
  /** First `seq` to assign (envelopes are numbered densely from here). */
  readonly startSeq?: number;
  /** Fixed timestamp for deterministic fixtures; defaults to `new Date().toISOString()`. */
  readonly timestamp?: string;
}

/** Accumulates redacted {@link SessionEvent} envelopes for one session. */
export class FrameRecorder {
  private readonly captured: SessionEvent[] = [];
  private seq: number;

  constructor(private readonly options: RecorderOptions) {
    this.seq = options.startSeq ?? 0;
  }

  /** Records one ACP `session/update` as an `acp/session_update` envelope. */
  recordUpdate(notification: SessionNotification): SessionEvent {
    return this.record('acp/session_update', notification);
  }

  /** Records an arbitrary srgnt client event kind (e.g. `client/prompt`). */
  record(kind: string, payload: unknown): SessionEvent {
    const event: SessionEvent = {
      seq: this.seq++,
      ts: this.options.timestamp ?? new Date().toISOString(),
      protocolVersion: this.options.protocolVersion,
      kind,
      payload: redactHomePaths(payload),
    };
    this.captured.push(event);
    return event;
  }

  /** All captured envelopes, in record order. */
  frames(): readonly SessionEvent[] {
    return this.captured;
  }

  /** Serializes the recording to newline-delimited JSON (one envelope per line). */
  toJsonl(): string {
    return this.captured.map((event) => JSON.stringify(event)).join('\n') + '\n';
  }
}

export const ENVELOPE_VERSION = SESSION_EVENT_ENVELOPE_VERSION;

/**
 * Drives a live connection's update stream to exhaustion, recording every frame.
 * Resolves when the session's stream ends (turn complete / connection closed).
 */
export async function recordUpdates(
  connection: AcpAgentConnection,
  sessionId: string,
  options: RecorderOptions,
): Promise<SessionEvent[]> {
  const recorder = new FrameRecorder(options);
  for await (const notification of connection.updates(sessionId)) {
    recorder.recordUpdate(notification);
  }
  return [...recorder.frames()];
}
