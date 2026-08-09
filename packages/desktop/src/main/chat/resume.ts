import { createHash } from 'node:crypto';
import type { SessionEvent } from '@srgnt/contracts';

/**
 * Pure helpers behind "honest resume" (PHASE-24, STEP-24-04).
 *
 * Everything here is deterministic and I/O-free so the hard parts — which
 * failure means what, whether a replay actually matches the local log, what
 * text a fork hands off — are provable without a process, a socket, or a disk.
 * The controller owns the effects; this file owns the decisions.
 */

// ─── Failure classes ───

/**
 * Why a `session/resume` or `session/load` call failed, which is what decides
 * whether the session degrades, retries, or tries the other ACP path.
 *
 * - `unsupported`     — `-32601`: the harness advertised a capability it does
 *   not implement. The *capability* is dead for this connection, not the
 *   session, so the cascade tries the other transparent-continue path first.
 * - `missing_session` — the id itself is gone agent-side. Retrying the other
 *   path with the same id would fail identically, so it degrades immediately.
 * - `transient`       — spawn/transport/timeout. The session is untouched and
 *   still resumable; the next prompt re-attempts.
 */
export type ReconnectFailureClass = 'unsupported' | 'missing_session' | 'transient';

/** JSON-RPC "method not found" — the advertise/implement mismatch. */
const METHOD_NOT_FOUND = -32601;
/** ACP `RequestError.resourceNotFound`. */
const RESOURCE_NOT_FOUND = -32002;

const MISSING_SESSION_TEXT = /session (?:was )?not found|no such session|unknown session|invalid session/i;

/**
 * Classifies a wrapper failure (`ProtocolError` / `ConnectionLost` /
 * `SpawnFailed`, or any stray throwable).
 *
 * The default is `transient`, deliberately: an unrecognised failure leaves the
 * session retryable, which is recoverable, rather than collapsing it to
 * read-only, which reads to the user as permanent. Only evidence — a `-32601`,
 * or an explicit session-not-found — moves it off that default.
 */
export function classifyReconnectFailure(cause: unknown): ReconnectFailureClass {
  const error = cause as { _tag?: unknown; code?: unknown; message?: unknown } | null;
  const code = typeof error?.code === 'number' ? error.code : undefined;
  if (code === METHOD_NOT_FOUND) return 'unsupported';
  if (code === RESOURCE_NOT_FOUND) return 'missing_session';
  const message = typeof error?.message === 'string' ? error.message : '';
  if (MISSING_SESSION_TEXT.test(message)) return 'missing_session';
  return 'transient';
}

// ─── Load-replay reconciliation ───

/** Stable JSON: object keys sorted at every depth, so two equal values hash equal. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return Object.fromEntries(entries.map(([key, item]) => [key, canonicalize(item)]));
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex').slice(0, 32);
}

/**
 * One frame's identity for comparison. ACP `session/update` notifications carry
 * the sessionId alongside the payload; only the payload is compared, because a
 * replay is *about* the same session by construction and a differing id would
 * report every frame as diverged for no useful reason.
 */
export function frameDigest(frame: unknown): string {
  const update = (frame as { update?: unknown } | null)?.update;
  return digest(update === undefined ? frame : update);
}

export interface ReplayReconciliation {
  readonly diverged: boolean;
  /**
   * Index of the FIRST differing frame, or the shorter sequence's length when
   * one simply ran out. Absent when the sequences match.
   */
  readonly divergedAt?: number;
  readonly localCount: number;
  readonly replayedCount: number;
  /** Digest over the whole sequence, so a report names both sides, not just the gap. */
  readonly localDigest: string;
  readonly replayedDigest: string;
}

/**
 * Full ordered comparison of a `session/load` replay against the persisted log.
 *
 * Ordered, not count-plus-last: a divergence in the MIDDLE leaves both the
 * total and the final frame identical, which is exactly the case a cheap check
 * misses and the one most likely to mean the agent's history is not ours.
 *
 * The local log stays canonical whatever this returns — the result only decides
 * whether a `client/load_reconciliation` event and a "history may differ" notice
 * are warranted. Never replaces what the renderer already drew.
 */
export function reconcileReplay(
  local: readonly unknown[],
  replayed: readonly unknown[],
): ReplayReconciliation {
  const localDigests = local.map(frameDigest);
  const replayedDigests = replayed.map(frameDigest);
  const shared = Math.min(localDigests.length, replayedDigests.length);
  const base = {
    localCount: localDigests.length,
    replayedCount: replayedDigests.length,
    localDigest: digest(localDigests),
    replayedDigest: digest(replayedDigests),
  };
  for (let index = 0; index < shared; index += 1) {
    if (localDigests[index] !== replayedDigests[index]) {
      return { ...base, diverged: true, divergedAt: index };
    }
  }
  if (localDigests.length !== replayedDigests.length) {
    return { ...base, diverged: true, divergedAt: shared };
  }
  return { ...base, diverged: false };
}

/** The persisted ACP frames a replay is compared against, in `seq` order. */
export function persistedUpdatePayloads(events: readonly SessionEvent[]): unknown[] {
  return events.filter((event) => event.kind === 'acp/session_update').map((event) => event.payload);
}

// ─── Fork identity ───

export interface ForkRequestParameters {
  readonly projectId: string;
  readonly sourceSessionId: string;
  readonly includeHandoff: boolean;
}

/**
 * Canonical digest of a fork request, stored next to the `idempotencyKey` on
 * the child.
 *
 * The key alone is not the identity: a reused or colliding key must not be
 * answered with another request's child. Serialised in a FIXED field order
 * (this array), so the same parameters hash identically no matter how the
 * incoming payload was ordered — and so adding a fork option later forces this
 * list to be extended with it rather than silently ignoring it.
 */
export function forkRequestFingerprint(request: ForkRequestParameters): string {
  return digest([request.projectId, request.sourceSessionId, request.includeHandoff]);
}

// ─── Handoff summary ───

/** Longest quoted excerpt per section; a handoff is a pointer, not a transcript. */
export const HANDOFF_EXCERPT_MAX = 400;

function excerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= HANDOFF_EXCERPT_MAX) return trimmed;
  return `${trimmed.slice(0, HANDOFF_EXCERPT_MAX - 1).trimEnd()}…`;
}

function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/** Text blocks a chunk update carries, tolerant of anything the agent sends. */
function chunkText(payload: unknown, kind: string): string | undefined {
  const update = (payload as { update?: unknown } | null)?.update as
    | { sessionUpdate?: unknown; content?: unknown }
    | undefined;
  if (update?.sessionUpdate !== kind) return undefined;
  const content = update.content as { type?: unknown; text?: unknown } | undefined;
  return content?.type === 'text' && typeof content.text === 'string' ? content.text : undefined;
}

export interface HandoffSource {
  readonly lastPrompt?: string;
  readonly lastAnswer?: string;
}

/**
 * The two things a handoff quotes, read off the persisted log: the last thing
 * the user asked, and the answer that followed it. Everything after the last
 * `client/prompt` is the answer to that prompt, so the scan is a single pass
 * with a reset — no heuristics, no LLM, same output on every machine.
 */
export function readHandoffSource(events: readonly SessionEvent[]): HandoffSource {
  let lastPrompt: string | undefined;
  let answer = '';
  for (const event of events) {
    if (event.kind === 'client/prompt') {
      const text = (event.payload as { text?: unknown } | undefined)?.text;
      if (typeof text === 'string' && text.trim() !== '') {
        lastPrompt = text;
        answer = '';
      }
      continue;
    }
    if (event.kind === 'acp/session_update') {
      answer += chunkText(event.payload, 'agent_message_chunk') ?? '';
    }
  }
  return {
    ...(lastPrompt !== undefined ? { lastPrompt: excerpt(lastPrompt) } : {}),
    ...(answer.trim() !== '' ? { lastAnswer: excerpt(answer) } : {}),
  };
}

/**
 * The deterministic handoff summary pre-filled into a forked session's composer.
 *
 * Explicit and template-driven on purpose (phase invariant): the user reads
 * exactly what context the new session will get, edits it, and sends it — or
 * does not. No LLM summary (a round trip per fork, and a different result on
 * two machines), no silent re-priming behind the composer.
 *
 * An empty source degrades to the header line alone: a fork with nothing to
 * quote is still a legitimate, linked fork.
 */
export function buildHandoffText(title: string | undefined, source: HandoffSource): string {
  const heading = `Continuing from ${title !== undefined && title !== '' ? `"${title}"` : 'a previous session'}.`;
  const sections = [heading];
  if (source.lastPrompt !== undefined) {
    sections.push(`Last request:\n${quote(source.lastPrompt)}`);
  }
  if (source.lastAnswer !== undefined) {
    sections.push(`Last reply:\n${quote(source.lastAnswer)}`);
  }
  return `${sections.join('\n\n')}\n`;
}
