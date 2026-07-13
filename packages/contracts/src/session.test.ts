import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseSync, safeParse } from './shared-schemas.js';
import {
  SSession,
  SSessionEvent,
  SSessionKind,
  SSessionStatus,
  isKnownSessionEventKind,
  knownSessionEventKinds,
  readSessionEvent,
} from './session.js';

const validSession = {
  id: 'sess-1',
  projectId: 'proj-1',
  harnessId: 'pi',
  status: 'idle',
  createdAt: '2026-07-12T10:00:00.000Z',
};

describe('SSession', () => {
  it('decodes a minimal session and defaults kind to single', () => {
    const session = parseSync(SSession, validSession);
    expect(session.kind).toBe('single');
    expect(session.parentSessionId).toBeUndefined();
  });

  it('decodes a group session with a fork parent', () => {
    const session = parseSync(SSession, {
      ...validSession,
      kind: 'group',
      title: 'Review swarm',
      acpSessionId: 'acp-abc',
      parentSessionId: 'sess-0',
      updatedAt: '2026-07-12T12:00:00.000Z',
    });
    expect(session.kind).toBe('group');
    expect(session.parentSessionId).toBe('sess-0');
  });

  it('rejects unknown kinds', () => {
    expect(safeParse(SSessionKind, 'swarm').success).toBe(false);
    expect(safeParse(SSession, { ...validSession, kind: 'swarm' }).success).toBe(false);
  });

  it('accepts every declared status and rejects others', () => {
    for (const status of ['active', 'idle', 'interrupted', 'error', 'closed']) {
      expect(safeParse(SSessionStatus, status).success).toBe(true);
    }
    expect(safeParse(SSessionStatus, 'running').success).toBe(false);
    expect(safeParse(SSession, { ...validSession, status: 'running' }).success).toBe(false);
  });

  it('rejects a session without a projectId', () => {
    const { projectId: _omitted, ...rest } = validSession;
    expect(safeParse(SSession, rest).success).toBe(false);
  });
});

describe('SSessionEvent envelope', () => {
  const validEvent = {
    seq: 0,
    ts: '2026-07-12T10:00:01.000Z',
    protocolVersion: 1,
    kind: 'acp/session_update',
    payload: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } },
  };

  it('decodes a known event and preserves the payload verbatim', () => {
    const event = parseSync(SSessionEvent, validEvent);
    expect(event.payload).toEqual(validEvent.payload);
    expect(event.seq).toBe(0);
  });

  it('decodes events with a missing payload', () => {
    const { payload: _omitted, ...rest } = validEvent;
    expect(safeParse(SSessionEvent, rest).success).toBe(true);
  });

  it('rejects structural damage: missing seq, negative seq, bad ts, non-string kind', () => {
    const { seq: _seq, ...noSeq } = validEvent;
    expect(safeParse(SSessionEvent, noSeq).success).toBe(false);
    expect(safeParse(SSessionEvent, { ...validEvent, seq: -1 }).success).toBe(false);
    expect(safeParse(SSessionEvent, { ...validEvent, ts: 'noonish' }).success).toBe(false);
    expect(safeParse(SSessionEvent, { ...validEvent, kind: 7 }).success).toBe(false);
  });

  it('classifies known kinds', () => {
    for (const kind of knownSessionEventKinds) {
      expect(isKnownSessionEventKind(kind)).toBe(true);
    }
    expect(isKnownSessionEventKind('acp/some_future_kind')).toBe(false);
  });

  it('tolerates unknown envelope fields by dropping them', () => {
    const result = readSessionEvent({ ...validEvent, futureField: { nested: true } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('futureField' in result.data).toBe(false);
    }
  });

  it('property: any kind string with any payload round-trips through the tolerant reader', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.jsonValue(),
        fc.nat(),
        (kind, payload, seq) => {
          // Simulate one JSONL write/read cycle, as the SessionStore will do.
          const raw = JSON.parse(JSON.stringify({
            seq,
            ts: '2026-07-12T10:00:01.000Z',
            protocolVersion: 1,
            kind,
            payload,
          }));
          const result = readSessionEvent(raw);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.kind).toBe(kind);
            expect(result.data.payload).toEqual(raw.payload);
            // Round-trip: re-reading the decoded event yields the same event.
            const again = readSessionEvent(JSON.parse(JSON.stringify(result.data)));
            expect(again.success).toBe(true);
            if (again.success) {
              expect(again.data).toEqual(result.data);
            }
          }
        },
      ),
    );
  });

  it('property: unknown extra fields never break decoding', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1 }).filter((k) => !['seq', 'ts', 'protocolVersion', 'kind', 'payload'].includes(k)),
          fc.jsonValue(),
        ),
        (extras) => {
          const raw = {
            seq: 1,
            ts: '2026-07-12T10:00:01.000Z',
            protocolVersion: 1,
            kind: 'client/prompt',
            payload: null,
            ...extras,
          };
          expect(readSessionEvent(raw).success).toBe(true);
        },
      ),
    );
  });
});
