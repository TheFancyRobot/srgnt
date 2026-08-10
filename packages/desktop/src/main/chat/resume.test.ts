/**
 * @vitest-environment node
 */
import type { SessionEvent } from '@srgnt/contracts';
import { describe, expect, it } from 'vitest';
import {
  buildHandoffText,
  classifyReconnectFailure,
  forkRequestFingerprint,
  frameDigest,
  persistedUpdatePayloads,
  readHandoffSource,
  reconcileReplay,
  HANDOFF_EXCERPT_MAX,
} from './resume.js';

/** One `session/update` frame in the shape both the wire and the log carry it. */
const chunk = (text: string) => ({
  sessionId: 'acp-1',
  update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } },
});

const event = (seq: number, kind: string, payload?: unknown): SessionEvent => ({
  seq,
  ts: '2026-08-01T10:00:00.000Z',
  protocolVersion: 1,
  kind,
  ...(payload !== undefined ? { payload } : {}),
});

describe('classifyReconnectFailure', () => {
  it('reads -32601 as an advertise/implement mismatch, not a dead session', () => {
    // The distinction the whole cascade rests on: the METHOD is unusable, so
    // the other transparent-continue path is still worth trying.
    expect(classifyReconnectFailure({ _tag: 'ProtocolError', code: -32601, message: 'Method not found' })).toBe(
      'unsupported',
    );
  });

  it('reads a missing session as terminal for that id', () => {
    expect(classifyReconnectFailure({ _tag: 'ProtocolError', code: -32002, message: 'Resource not found' })).toBe(
      'missing_session',
    );
    // Agents phrase this in prose more often than they use the reserved code.
    expect(classifyReconnectFailure({ _tag: 'ProtocolError', code: -32602, message: 'session not found' })).toBe(
      'missing_session',
    );
  });

  it('treats transport, spawn and unrecognised failures as transient', () => {
    expect(classifyReconnectFailure({ _tag: 'ConnectionLost', message: 'stream closed' })).toBe('transient');
    expect(classifyReconnectFailure({ _tag: 'SpawnFailed', message: 'ENOENT' })).toBe('transient');
    // Unknown failures default to retryable on purpose: a recoverable session is
    // recoverable, while a wrongly read-only one looks permanent to the user.
    expect(classifyReconnectFailure(new Error('who knows'))).toBe('transient');
    expect(classifyReconnectFailure(undefined)).toBe('transient');
  });
});

describe('reconcileReplay', () => {
  it('reports no divergence for an identical replay', () => {
    const local = [chunk('a'), chunk('b'), chunk('c')];
    const result = reconcileReplay(local, [chunk('a'), chunk('b'), chunk('c')]);
    expect(result.diverged).toBe(false);
    expect(result.divergedAt).toBeUndefined();
    expect(result.localDigest).toBe(result.replayedDigest);
  });

  it('detects a MIDDLE divergence that count-plus-last would miss', () => {
    // Same length, same final frame: the exact shape a cheap check passes.
    const result = reconcileReplay(
      [chunk('a'), chunk('b'), chunk('c')],
      [chunk('a'), chunk('X'), chunk('c')],
    );
    expect(result.diverged).toBe(true);
    expect(result.divergedAt).toBe(1);
    expect(result.localCount).toBe(3);
    expect(result.replayedCount).toBe(3);
    expect(result.localDigest).not.toBe(result.replayedDigest);
  });

  it('detects a tail-only difference at the shorter length', () => {
    const result = reconcileReplay([chunk('a'), chunk('b')], [chunk('a')]);
    expect(result.diverged).toBe(true);
    expect(result.divergedAt).toBe(1);
    expect(result.replayedCount).toBe(1);
  });

  it('ignores key order and the frame envelope sessionId', () => {
    // A replay is about the same session by construction; differing key order is
    // a serialisation detail. Neither is a real divergence.
    expect(frameDigest({ sessionId: 'a', update: { x: 1, y: 2 } })).toBe(
      frameDigest({ sessionId: 'b', update: { y: 2, x: 1 } }),
    );
  });

  it('reads only the ACP frames out of a mixed persisted log', () => {
    const payloads = persistedUpdatePayloads([
      event(0, 'client/prompt', { text: 'hi' }),
      event(1, 'acp/session_update', chunk('a')),
      event(2, 'client/stop', { stopReason: 'end_turn' }),
      event(3, 'acp/session_update', chunk('b')),
    ]);
    expect(payloads).toEqual([chunk('a'), chunk('b')]);
  });
});

describe('forkRequestFingerprint', () => {
  it('is stable across payload key order and changes with every parameter', () => {
    const base = { projectId: 'p1', sourceSessionId: 's1', includeHandoff: true };
    expect(forkRequestFingerprint(base)).toBe(
      forkRequestFingerprint({ includeHandoff: true, sourceSessionId: 's1', projectId: 'p1' }),
    );
    // Every parameter that changes what the fork IS must move the fingerprint,
    // or a reused key could silently answer a different request.
    expect(forkRequestFingerprint({ ...base, includeHandoff: false })).not.toBe(forkRequestFingerprint(base));
    expect(forkRequestFingerprint({ ...base, sourceSessionId: 's2' })).not.toBe(forkRequestFingerprint(base));
    expect(forkRequestFingerprint({ ...base, projectId: 'p2' })).not.toBe(forkRequestFingerprint(base));
  });
});

describe('handoff summary', () => {
  const log: SessionEvent[] = [
    event(0, 'client/prompt', { text: 'first question' }),
    event(1, 'acp/session_update', chunk('first answer')),
    event(2, 'client/stop', { stopReason: 'end_turn' }),
    event(3, 'client/prompt', { text: 'second question' }),
    event(4, 'acp/session_update', chunk('second ')),
    event(5, 'acp/session_update', chunk('answer')),
  ];

  it('quotes the LAST exchange, not the first', () => {
    const source = readHandoffSource(log);
    expect(source.lastPrompt).toBe('second question');
    expect(source.lastAnswer).toBe('second answer');

    const text = buildHandoffText('Fix the login bug', source);
    expect(text).toContain('Continuing from "Fix the login bug".');
    expect(text).toContain('> second question');
    expect(text).toContain('> second answer');
    expect(text).not.toContain('first question');
  });

  it('degrades gracefully for a session with no turns', () => {
    const text = buildHandoffText(undefined, readHandoffSource([]));
    // Still a legitimate, linked fork — just nothing to quote.
    expect(text.trim()).toBe('Continuing from a previous session.');
  });

  it('is deterministic and bounded', () => {
    const long = 'x'.repeat(HANDOFF_EXCERPT_MAX * 3);
    const source = readHandoffSource([event(0, 'client/prompt', { text: long })]);
    expect(source.lastPrompt!.length).toBe(HANDOFF_EXCERPT_MAX);
    // No LLM, no clock, no randomness: the same log yields the same text twice.
    expect(buildHandoffText('t', source)).toBe(buildHandoffText('t', source));
  });

  it('quotes every line of a multi-line excerpt', () => {
    const source = readHandoffSource([event(0, 'client/prompt', { text: 'one\ntwo' })]);
    expect(buildHandoffText('t', source)).toContain('> one\n> two');
  });
});
