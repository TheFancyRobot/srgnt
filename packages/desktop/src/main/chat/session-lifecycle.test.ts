/**
 * @vitest-environment node
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SupervisorEvent } from '@srgnt/harness';
import { connectMockAgent, parseScenario, type Scenario } from '@srgnt/harness/testing';
import { createSessionStore, type SessionStore } from '@srgnt/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatSessionController,
  DEFAULT_CHECKPOINT_INTERVAL_MS,
  DEFAULT_IDLE_TIMEOUT_MS,
  type ChatConnectFn,
  type ChatSessionPersistence,
} from './session-controller.js';

/**
 * Transcript checkpointing and process lifecycle (PHASE-24, STEP-24-05).
 *
 * A REAL `SessionStore` over a temp workspace and the REAL in-process mock
 * agent, with only the supervisor faked — the reap is a supervisor event the
 * controller has to react to, and driving one deterministically is the whole
 * point. What is asserted is the observable result on disk and in the session
 * map, never an internal call count for its own sake.
 */

const ACP_ID = 'mock-fixed-acp-id';

function scenario(overrides: Record<string, unknown> = {}): Scenario {
  return parseScenario({ name: 'lifecycle-test', sessionId: ACP_ID, directives: [], ...overrides });
}

const chunks = (texts: readonly string[], delayMs = 0) => [
  { type: 'emit_chunks' as const, channel: 'agent' as const, chunks: [...texts], delayMs },
];

interface FakeSupervisor {
  connect: ChatConnectFn;
  /** Fires a supervisor event at the controller (the reap, in these tests). */
  emit: (event: SupervisorEvent) => void;
  /** Every `setIdleHold` transition, in order — the arm/disarm state machine. */
  holds: boolean[];
  connects: number;
  /** Whether the connection's kill-tree teardown actually ran. */
  cleanups: number;
}

function fakeSupervisor(script: Scenario): FakeSupervisor {
  const listeners = new Set<(event: SupervisorEvent) => void>();
  const state: FakeSupervisor = {
    holds: [],
    connects: 0,
    cleanups: 0,
    emit: (event) => {
      for (const listener of [...listeners]) listener(event);
    },
    connect: async () => {
      state.connects += 1;
      const { connection } = await connectMockAgent(script);
      return {
        connection,
        harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
        onSupervisorEvent: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        setIdleHold: (held) => void state.holds.push(held),
        cleanup: async () => {
          state.cleanups += 1;
          connection.close();
        },
      };
    },
  };
  return state;
}

let root = '';
let store: SessionStore;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'srgnt-chat-lifecycle-'));
  store = createSessionStore(root);
});

afterEach(async () => {
  await store.close();
  rmSync(root, { recursive: true, force: true });
});

function transcriptPath(projectId: string, sessionId: string): string {
  return join(root, 'projects', projectId, 'sessions', sessionId, 'transcript.md');
}

function readLogKinds(projectId: string, sessionId: string): string[] {
  const raw = readFileSync(join(root, 'projects', projectId, 'sessions', sessionId, 'events.jsonl'), 'utf8');
  return raw
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => (JSON.parse(line) as { kind: string }).kind);
}

/**
 * Appends are fire-and-forget by design (a disk write must never sit in front
 * of a streamed chunk), so an audit assertion waits for the kind it needs
 * rather than assuming the write already landed.
 */
async function waitForKind(projectId: string, sessionId: string, kind: string): Promise<string[]> {
  let kinds: string[] = [];
  await vi.waitFor(() => {
    kinds = readLogKinds(projectId, sessionId);
    expect(kinds).toContain(kind);
  });
  return kinds;
}

/** The real store with a counting `checkpointTranscript`, so writes are visible. */
function countingStore(): { persistence: ChatSessionPersistence; writes: () => number } {
  const checkpointTranscript = vi.fn(async (ref: { projectId: string; sessionId: string }) => {
    await store.checkpointTranscript(ref);
  });
  const persistence = new Proxy(store, {
    get: (target, property, receiver) =>
      property === 'checkpointTranscript'
        ? checkpointTranscript
        : (Reflect.get(target, property, receiver) as unknown),
  }) as unknown as ChatSessionPersistence;
  return { persistence, writes: () => checkpointTranscript.mock.calls.length };
}

describe('transcript checkpointing', () => {
  it('renders transcript.md at turn end, once per turn and never per token', async () => {
    const { persistence, writes } = countingStore();
    const controller = new ChatSessionController({
      connect: fakeSupervisor(scenario({ directives: chunks(Array.from({ length: 40 }, () => 'x')) })).connect,
      onUpdate: () => {},
      getStore: () => persistence,
      // Long enough that the periodic timer can never fire inside this turn:
      // whatever writes happen are turn-boundary writes.
      checkpointIntervalMs: 60_000,
    });

    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    expect(existsSync(transcriptPath('proj-a', session.sessionId))).toBe(false);

    await controller.prompt(session.sessionId, 'stream a lot at me');
    await vi.waitFor(() => expect(existsSync(transcriptPath('proj-a', session.sessionId))).toBe(true));

    // 40 streamed chunks; one turn. The transcript is a checkpointed cache, so
    // the write count tracks turns, not tokens.
    expect(writes()).toBeLessThanOrEqual(2);
    const markdown = readFileSync(transcriptPath('proj-a', session.sessionId), 'utf8');
    expect(markdown).toContain('stream a lot at me');
    expect(markdown).toContain('_Stopped: end_turn_');

    await controller.dispose(session.sessionId);
  });

  it('checkpoints periodically while a turn is still running', async () => {
    const { persistence, writes } = countingStore();
    const fake = fakeSupervisor(
      // Blocks the turn until the controller cancels, so "mid-turn" is a real
      // state rather than a timing guess.
      scenario({ directives: [...chunks(['working']), { type: 'expect_cancel', timeoutMs: 5_000 }] }),
    );
    const controller = new ChatSessionController({
      connect: fake.connect,
      onUpdate: () => {},
      getStore: () => persistence,
      checkpointIntervalMs: 10,
    });

    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    const turn = controller.prompt(session.sessionId, 'take your time');

    // The file exists BEFORE the turn ended — that is the property memsearch
    // and any other live external reader depends on.
    await vi.waitFor(() => expect(writes()).toBeGreaterThanOrEqual(2), { timeout: 4_000 });
    expect(existsSync(transcriptPath('proj-a', session.sessionId))).toBe(true);

    await controller.cancel(session.sessionId);
    await turn;
    const settled = writes();
    await controller.dispose(session.sessionId);

    // The periodic timer stops with the turn: disposing adds the final
    // checkpoint and nothing keeps ticking after it.
    expect(writes()).toBeGreaterThan(settled);
  });

  it('writes a final checkpoint on dispose, with the closed status in the header', async () => {
    const controller = new ChatSessionController({
      connect: fakeSupervisor(scenario({ directives: chunks(['done']) })).connect,
      onUpdate: () => {},
      getStore: () => store as unknown as ChatSessionPersistence,
    });
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    await controller.prompt(session.sessionId, 'hello there');
    await controller.dispose(session.sessionId);

    const markdown = readFileSync(transcriptPath('proj-a', session.sessionId), 'utf8');
    expect(markdown).toContain('- Status: closed');
    expect(markdown).toContain('- Session closed');
    expect(markdown).toContain('hello there');
  });

  it('never touches disk for a memory-only session', async () => {
    const { persistence, writes } = countingStore();
    const controller = new ChatSessionController({
      connect: fakeSupervisor(scenario({ directives: chunks(['hi']) })).connect,
      onUpdate: () => {},
      getStore: () => persistence,
      checkpointIntervalMs: 5,
    });
    // No projectId → no `persistRef` → nothing to checkpoint.
    const session = await controller.newSession('mock');
    await controller.prompt(session.sessionId, 'hello');
    await controller.dispose(session.sessionId);
    expect(writes()).toBe(0);
  });
});

describe('idle reaping', () => {
  function reapController(script: Scenario, extra: Record<string, unknown> = {}) {
    const fake = fakeSupervisor(script);
    const controller = new ChatSessionController({
      connect: fake.connect,
      onUpdate: () => {},
      getStore: () => store as unknown as ChatSessionPersistence,
      ...extra,
    });
    return { fake, controller };
  }

  it('holds the idle clock for the whole turn and releases it at the end', async () => {
    const { fake, controller } = reapController(scenario({ directives: chunks(['ok'], 5) }));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    expect(fake.holds).toEqual([]);

    await controller.prompt(session.sessionId, 'go');
    // Held on turn start, released on turn end — the transition the reaper's
    // correctness rests on, not the streamed-chunk heartbeats.
    expect(fake.holds).toEqual([true, false]);

    await controller.dispose(session.sessionId);
  });

  it('releases the idle hold even when the turn fails', async () => {
    const { fake, controller } = reapController(
      scenario({ directives: [{ type: 'crash', exitCode: 7 }] }),
    );
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    await expect(controller.prompt(session.sessionId, 'go')).rejects.toThrow();
    // Without the release a failed turn would keep its agent alive forever.
    expect(fake.holds).toEqual([true, false]);
    await controller.dispose(session.sessionId);
  });

  it('hibernates a reaped session: audited, not closed, and still `idle`', async () => {
    const { fake, controller } = reapController(scenario({ directives: chunks(['ok']) }));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    await controller.prompt(session.sessionId, 'go');

    fake.emit({ kind: 'reaped', id: 'chat-mock', reason: 'idle' });
    await vi.waitFor(() => expect(controller.has(session.sessionId)).toBe(false));
    await vi.waitFor(() => expect(fake.cleanups).toBe(1));

    // The process is gone; the SESSION is not. It stays resumable.
    const meta = await store.readMeta({ projectId: 'proj-a', sessionId: session.sessionId });
    expect(meta.status).toBe('idle');
    const kinds = await waitForKind('proj-a', session.sessionId, 'client/harness_reaped');
    expect(kinds).not.toContain('client/session_closed');
    // The log handle was released too — a reaped session may sit for hours,
    // and its advisory lock must not sit with it.
    await vi.waitFor(() =>
      expect(
        existsSync(join(root, 'projects', 'proj-a', 'sessions', session.sessionId, 'events.jsonl.lock')),
      ).toBe(false),
    );
  });

  it('closes a hibernated session when the user ends it', async () => {
    // `dispose` used to return at the not-in-`sessions` check, so ending a
    // reaped session left it `idle` with no close event while the renderer had
    // already dropped it — and the retained record could still revive it.
    const { fake, controller } = reapController(scenario({ directives: chunks(['ok']) }));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    await controller.prompt(session.sessionId, 'go');

    fake.emit({ kind: 'reaped', id: 'chat-mock', reason: 'idle' });
    await vi.waitFor(() => expect(controller.has(session.sessionId)).toBe(false));

    await controller.dispose(session.sessionId);

    const meta = await store.readMeta({ projectId: 'proj-a', sessionId: session.sessionId });
    expect(meta.status).toBe('closed');
    const kinds = await waitForKind('proj-a', session.sessionId, 'client/session_closed');
    expect(kinds).toContain('client/session_closed');

    // And it cannot be revived by a later prompt.
    const connectsBefore = fake.connects;
    await expect(controller.prompt(session.sessionId, 'again')).rejects.toThrow(/no chat session/i);
    expect(fake.connects).toBe(connectsBefore);
  });

  it('respawns transparently on the next prompt through the reconnect cascade', async () => {
    const { fake, controller } = reapController(
      scenario({ initialize: { loadSession: true }, directives: chunks(['second turn']) }),
    );
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    await controller.prompt(session.sessionId, 'first');

    fake.emit({ kind: 'reaped', id: 'chat-mock', reason: 'idle' });
    await vi.waitFor(() => expect(controller.has(session.sessionId)).toBe(false));
    const connectsBeforeRevive = fake.connects;

    // No reconnect call from the caller: the prompt itself revives the session.
    const result = await controller.prompt(session.sessionId, 'second');
    expect(result.stopReason).toBe('end_turn');
    expect(fake.connects).toBe(connectsBeforeRevive + 1);
    expect(controller.has(session.sessionId)).toBe(true);

    const kinds = await waitForKind('proj-a', session.sessionId, 'client/reconnected');
    // Both turns are in ONE log: the reap did not start a new session.
    expect(kinds.filter((kind) => kind === 'client/prompt')).toHaveLength(2);

    await controller.dispose(session.sessionId);
  });

  it('reports an honest error when a reaped session cannot be continued', async () => {
    // No load and no resume capability: reviving is impossible, and saying so
    // is the contract — never a silent re-prime.
    const { fake, controller } = reapController(scenario({ directives: chunks(['ok']) }));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    await controller.prompt(session.sessionId, 'first');
    fake.emit({ kind: 'reaped', id: 'chat-mock', reason: 'idle' });
    await vi.waitFor(() => expect(fake.cleanups).toBe(1));

    await expect(controller.prompt(session.sessionId, 'second')).rejects.toThrow(/[Ff]ork it/);
  });

  it('ships a 10 minute idle timeout and a 30 second checkpoint cadence', () => {
    expect(DEFAULT_IDLE_TIMEOUT_MS).toBe(600_000);
    expect(DEFAULT_CHECKPOINT_INTERVAL_MS).toBe(30_000);
  });
});

describe('quit cleanup surface', () => {
  it('cancels every live session, checkpoints them, then kill-trees them all', async () => {
    const busy = fakeSupervisor(
      scenario({ directives: [...chunks(['working']), { type: 'expect_cancel', timeoutMs: 5_000 }] }),
    );
    const idle = fakeSupervisor(scenario({ directives: chunks(['done']) }));
    const streamed = new Set<string>();
    const controller = new ChatSessionController({
      connect: async (target, ports, options) =>
        target === 'pi' ? busy.connect(target, ports, options) : idle.connect(target, ports, options),
      onUpdate: (event) => void streamed.add(event.sessionId),
      getStore: () => store as unknown as ChatSessionPersistence,
    });

    const quiet = await controller.newSession('mock', { projectId: 'proj-a' });
    await controller.prompt(quiet.sessionId, 'finished already');
    const loud = await controller.newSession('pi', { projectId: 'proj-a' });
    const turn = controller.prompt(loud.sessionId, 'still running');
    // Quit has to arrive with the turn genuinely on the wire, not merely
    // scheduled — the mock's first chunk is the proof it is.
    await vi.waitFor(() => expect(streamed.has(loud.sessionId)).toBe(true));

    await controller.cancelInFlight();
    // The in-flight turn really was cancelled: this mock only unblocks on a
    // genuine `session/cancel`. Cancelling the already-finished session
    // alongside it is a harmless no-op, which is why quit does not try to
    // filter — a prompt sent microseconds before quit must not slip through.
    await turn;

    await controller.checkpointAll();
    expect(existsSync(transcriptPath('proj-a', quiet.sessionId))).toBe(true);
    expect(existsSync(transcriptPath('proj-a', loud.sessionId))).toBe(true);

    await controller.disposeAll();
    expect(controller.sessionCount).toBe(0);
    expect(busy.cleanups + idle.cleanups).toBe(2);
  });

  it('cancelInFlight never rejects when an agent refuses to answer', async () => {
    const fake = fakeSupervisor(scenario({ directives: chunks(['ok']) }));
    const controller = new ChatSessionController({
      connect: async (target, ports, options) => {
        const opened = await fake.connect(target, ports, options);
        return {
          ...opened,
          connection: new Proxy(opened.connection, {
            get: (target_, property, receiver) =>
              property === 'cancel'
                ? () => {
                    throw new Error('transport is gone');
                  }
                : (Reflect.get(target_, property, receiver) as unknown),
          }),
        };
      },
      onUpdate: () => {},
      getStore: () => store as unknown as ChatSessionPersistence,
    });
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    // Not awaited: the turn has to still be in flight when quit arrives.
    const turn = controller.prompt(session.sessionId, 'go');
    await expect(controller.cancelInFlight()).resolves.toBeUndefined();
    await turn;
    await controller.disposeAll();
  });
});
