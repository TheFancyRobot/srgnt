/**
 * @vitest-environment node
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionEvent } from '@srgnt/contracts';
import { connectMockAgent, parseScenario, type Scenario } from '@srgnt/harness/testing';
import { createSessionStore, type SessionStore } from '@srgnt/runtime';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChatSessionController, type ChatConnectFn } from './session-controller.js';

/**
 * Honest resume (PHASE-24, STEP-24-04): the capability cascade, the failure
 * classes, and load-replay reconciliation.
 *
 * Driven through the REAL in-process mock agent and a REAL `SessionStore` over
 * a temp workspace, because the two things most likely to be wrong here —
 * which ACP method actually went on the wire, and whether a replay got
 * re-appended to the log it was replayed from — are exactly what a stubbed
 * connection or store would be the one deciding.
 */

const ACP_ID = 'mock-fixed-acp-id';

/**
 * Built through the mock's own decoder rather than as a literal, so a test can
 * set one capability knob and let every default fill in — the same path a
 * scenario file takes.
 */
function scenario(overrides: Record<string, unknown>): Scenario {
  return parseScenario({ name: 'resume-test', sessionId: ACP_ID, directives: [], ...overrides });
}

const chunks = (texts: readonly string[]) => [
  { type: 'emit_chunks' as const, channel: 'agent' as const, chunks: [...texts], delayMs: 0 },
];

interface Recorder {
  connect: ChatConnectFn;
  /** ACP session methods called, in order — the capability branch, observed. */
  calls: string[];
  /** How many times a connection (i.e. a process, in the real connector) was opened. */
  connects: number;
}

/**
 * A connector that records which session methods the controller called, and can
 * make one of them fail in a specific way. Failures are injected on the
 * CONNECTION rather than scripted into the scenario when the scenario has no
 * way to express them (a dead session id, a dropped transport).
 */
function recorder(
  script: Scenario,
  inject: Partial<Record<'resume' | 'load', unknown>> = {},
): Recorder {
  const state: Recorder = {
    calls: [],
    connects: 0,
    connect: async () => {
      state.connects += 1;
      const { connection } = await connectMockAgent(script);
      for (const method of ['resume', 'load'] as const) {
        const original = connection[method].bind(connection);
        (connection as unknown as Record<string, unknown>)[method] = (params: never) => {
          state.calls.push(method);
          const failure = inject[method];
          return failure === undefined ? original(params) : Effect.fail(failure as never);
        };
      }
      return {
        connection,
        harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
        cleanup: async () => connection.close(),
      };
    },
  };
  return state;
}

function readLog(root: string, sessionId: string): SessionEvent[] {
  const raw = readFileSync(join(root, 'projects', 'p1', 'sessions', sessionId, 'events.jsonl'), 'utf8');
  return raw
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as SessionEvent);
}

const kindsOf = (events: readonly SessionEvent[]) => events.map((event) => event.kind);
const tick = (ms = 40): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('ChatSessionController.reconnect (STEP-24-04)', () => {
  let root = '';
  let store: SessionStore;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'srgnt-chat-resume-'));
    store = createSessionStore(root);
  });

  afterEach(async () => {
    await store.close();
    rmSync(root, { recursive: true, force: true });
  });

  const project = { projectId: 'p1', cwd: '' };

  function controllerFor(connect: ChatConnectFn): ChatSessionController {
    return new ChatSessionController({ connect, onUpdate: () => {}, getStore: () => store });
  }

  /**
   * Runs one full session (open → prompt → dispose) so there is something on
   * disk to reopen, and returns its handle plus its persisted ACP id.
   */
  async function persistedSession(script: Scenario): Promise<{ handle: string; acpSessionId: string }> {
    const controller = controllerFor(recorder(script).connect);
    const opened = await controller.newSession('mock', { ...project, cwd: root });
    await controller.prompt(opened.sessionId, 'first question');
    await tick();
    await controller.dispose(opened.sessionId);
    const meta = await store.readMeta({ projectId: 'p1', sessionId: opened.sessionId });
    return { handle: opened.sessionId, acpSessionId: meta.acpSessionId! };
  }

  async function reconnect(
    rec: Recorder,
    handle: string,
    acpSessionId: string | undefined,
  ): Promise<Awaited<ReturnType<ChatSessionController['reconnect']>> & { controller: ChatSessionController }> {
    const controller = controllerFor(rec.connect);
    const result = await controller.reconnect(handle, {
      target: 'mock',
      project: { ...project, cwd: root },
      ...(acpSessionId !== undefined ? { acpSessionId } : {}),
    });
    return { ...result, controller };
  }

  it('spawns one agent when two prompts race the same reconnect', async () => {
    // The session is not in `sessions` until resume succeeds, so the
    // already-live guard cannot catch this: both calls would spawn, the second
    // would overwrite the map, and the first process would be unreachable by
    // dispose.
    const script = scenario({ initialize: { resumeSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const rec = recorder(scenario({ initialize: { resumeSession: true } }));
    const controller = controllerFor(rec.connect);
    const options = { target: 'mock' as const, project: { ...project, cwd: root }, acpSessionId };

    const [first, second] = await Promise.all([
      controller.reconnect(handle, options),
      controller.reconnect(handle, options),
    ]);

    expect(first.outcome).toBe('resumed');
    expect(second.outcome).toBe('resumed');
    expect(rec.connects).toBe(1);
    await controller.dispose(handle);
  });

  it('uses session/resume, with no replay, when the harness advertises it', async () => {
    const script = scenario({ initialize: { resumeSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const rec = recorder(scenario({ initialize: { resumeSession: true } }));

    const result = await reconnect(rec, handle, acpSessionId);

    expect(result.outcome).toBe('resumed');
    expect(rec.calls).toEqual(['resume']);
    expect(result.session?.sessionId).toBe(handle);
    // A resumed session takes prompts again, on the same handle.
    await expect(result.controller.prompt(handle, 'again')).resolves.toMatchObject({ stopReason: 'end_turn' });
    await result.controller.dispose(handle);
  });

  it('uses session/load and consumes the replay when only load is advertised', async () => {
    const script = scenario({ initialize: { loadSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const before = readLog(root, handle);
    const rec = recorder(
      scenario({ initialize: { loadSession: true }, loadReplay: chunks(['Hi.']) }),
    );

    const result = await reconnect(rec, handle, acpSessionId);

    expect(result.outcome).toBe('loaded');
    expect(rec.calls).toEqual(['load']);
    expect(result.historyDiverged).toBeUndefined();
    await tick();
    // The local log is canonical: a matching replay adds NO `acp/session_update`
    // events, only the reconnect marker.
    const after = readLog(root, handle);
    expect(after.filter((event) => event.kind === 'acp/session_update')).toEqual(
      before.filter((event) => event.kind === 'acp/session_update'),
    );
    expect(kindsOf(after).filter((kind) => kind === 'client/reconnected')).toHaveLength(1);
    await result.controller.dispose(handle);
  });

  it('falls through to session/load when an advertised resume answers -32601', async () => {
    // The advertise/implement mismatch pinned Pi actually has. The session must
    // continue transparently — degrading here would be a lie about the harness.
    const script = scenario({ initialize: { loadSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const rec = recorder(
      scenario({
        initialize: { loadSession: true, resumeSession: true },
        loadReplay: chunks(['Hi.']),
        unimplementedMethods: ['session/resume'],
      }),
    );

    const result = await reconnect(rec, handle, acpSessionId);

    expect(result.outcome).toBe('loaded');
    expect(rec.calls).toEqual(['resume', 'load']);
    await tick();
    const log = readLog(root, handle);
    // The mis-advertised capability is recorded even though nothing degraded,
    // so a later read-only notice can name which one lied.
    const mismatch = log.find((event) => event.kind === 'client/capability_mismatch');
    expect(mismatch?.payload).toMatchObject({ capability: 'resumeSession', method: 'session/resume' });
    await result.controller.dispose(handle);
  });

  it('degrades to read-only exactly once when BOTH advertised paths answer -32601', async () => {
    const script = scenario({ initialize: { loadSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const rec = recorder(
      scenario({
        initialize: { loadSession: true, resumeSession: true },
        unimplementedMethods: ['session/resume', 'session/load'],
      }),
    );

    const result = await reconnect(rec, handle, acpSessionId);

    expect(result.outcome).toBe('read_only');
    // Two attempts, no third: the cascade is exhausted, not retried.
    expect(rec.calls).toEqual(['resume', 'load']);
    expect(result.reason).toMatch(/loadSession/);
    expect(result.controller.has(handle)).toBe(false);
  });

  it('degrades to read-only after ONE connect when the harness advertises neither', async () => {
    const script = scenario({ directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const rec = recorder(scenario({}));

    const result = await reconnect(rec, handle, acpSessionId);

    expect(result.outcome).toBe('read_only');
    expect(rec.calls).toEqual([]);
    // Capabilities come from `initialize`, never from a harness id, so ONE
    // connect is needed before "read-only" can honestly be concluded.
    expect(rec.connects).toBe(1);
  });

  it('does not try the other path when the session itself is gone', async () => {
    const script = scenario({ initialize: { loadSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const rec = recorder(
      scenario({ initialize: { loadSession: true, resumeSession: true } }),
      { resume: { _tag: 'ProtocolError', code: -32002, message: 'session not found' } },
    );

    const result = await reconnect(rec, handle, acpSessionId);

    expect(result.outcome).toBe('read_only');
    // The id is dead, not the method: retrying `load` with it would fail the
    // same way, so the cascade stops immediately.
    expect(rec.calls).toEqual(['resume']);
    expect(result.reason).toMatch(/no longer has this session/i);
  });

  it('keeps a transient failure retryable instead of read-only', async () => {
    const script = scenario({ initialize: { loadSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const rec = recorder(
      scenario({ initialize: { loadSession: true } }),
      { load: { _tag: 'ConnectionLost', message: 'transport dropped' } },
    );

    const first = await reconnect(rec, handle, acpSessionId);
    expect(first.outcome).toBe('retryable');
    expect(first.reason).toMatch(/transport dropped/);
    // The session's own status is untouched, so the next prompt can try again…
    const meta = await store.readMeta({ projectId: 'p1', sessionId: handle });
    expect(meta.status).toBe('closed');

    // …and it does, successfully, once the transport behaves.
    const healthy = recorder(scenario({ initialize: { loadSession: true }, loadReplay: chunks(['Hi.']) }));
    const second = await reconnect(healthy, handle, acpSessionId);
    expect(second.outcome).toBe('loaded');
    await second.controller.dispose(handle);
  });

  it('degrades without spawning anything when the session has no ACP id', async () => {
    const script = scenario({ initialize: { loadSession: true }, directives: chunks(['Hi.']) });
    const { handle } = await persistedSession(script);
    const rec = recorder(scenario({ initialize: { loadSession: true } }));

    const result = await reconnect(rec, handle, undefined);

    expect(result.outcome).toBe('read_only');
    expect(result.reason).toMatch(/never registered with an agent/i);
    // Nothing to resume means nothing to ask: no capability check can help.
    expect(rec.connects).toBe(0);
  });

  it('records a load-replay that diverges in the MIDDLE, with both sequence digests', async () => {
    // Same frame count, same last frame — the divergence a count-plus-last
    // check passes straight over.
    const script = scenario({ initialize: { loadSession: true }, directives: chunks(['a', 'b', 'c']) });
    const { handle, acpSessionId } = await persistedSession(script);
    const before = readLog(root, handle).filter((event) => event.kind === 'acp/session_update');
    const rec = recorder(
      scenario({ initialize: { loadSession: true }, loadReplay: chunks(['a', 'X', 'c']) }),
    );

    const result = await reconnect(rec, handle, acpSessionId);

    expect(result.outcome).toBe('loaded');
    expect(result.historyDiverged).toBe(true);
    await tick();
    const log = readLog(root, handle);
    const reconciliation = log.filter((event) => event.kind === 'client/load_reconciliation');
    expect(reconciliation).toHaveLength(1);
    expect(reconciliation[0]!.payload).toMatchObject({
      diverged: true,
      divergedAt: 1,
      localCount: 3,
      replayedCount: 3,
    });
    const payload = reconciliation[0]!.payload as { localDigest: string; replayedDigest: string };
    expect(payload.localDigest).not.toBe(payload.replayedDigest);
    // The local log still wins: the replayed frames were not appended.
    expect(log.filter((event) => event.kind === 'acp/session_update')).toEqual(before);
    await result.controller.dispose(handle);
  });

  it('does not reconnect a session that is already live', async () => {
    const script = scenario({ initialize: { resumeSession: true }, directives: chunks(['Hi.']) });
    const rec = recorder(script);
    const controller = controllerFor(rec.connect);
    const opened = await controller.newSession('mock', { ...project, cwd: root });

    const result = await controller.reconnect(opened.sessionId, {
      target: 'mock',
      project: { ...project, cwd: root },
      acpSessionId: ACP_ID,
    });

    expect(result.outcome).toBe('resumed');
    // One connection, not two: reconnecting a live session would leave a second
    // agent process behind one handle.
    expect(rec.connects).toBe(1);
    expect(rec.calls).toEqual([]);
    await controller.dispose(opened.sessionId);
  });

  it('does not retitle a resumed session from the prompt that resumed it', async () => {
    const script = scenario({ initialize: { resumeSession: true }, directives: chunks(['Hi.']) });
    const { handle, acpSessionId } = await persistedSession(script);
    expect((await store.readMeta({ projectId: 'p1', sessionId: handle })).title).toBe('first question');

    const rec = recorder(scenario({ initialize: { resumeSession: true }, directives: chunks(['Hi.']) }));
    const result = await reconnect(rec, handle, acpSessionId);
    await result.controller.prompt(handle, 'a completely different second question');
    await result.controller.flushMeta();

    expect((await store.readMeta({ projectId: 'p1', sessionId: handle })).title).toBe('first question');
    await result.controller.dispose(handle);
  });
});
