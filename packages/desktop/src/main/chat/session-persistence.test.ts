/**
 * @vitest-environment node
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionEvent } from '@srgnt/contracts';
import { createSessionStore, type SessionStore } from '@srgnt/runtime';
import { connectMockAgent, type Scenario } from '@srgnt/harness/testing';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChatSessionController, type ChatConnectFn } from './session-controller.js';

/**
 * The persistence half of the chat controller (PHASE-24, STEP-24-03): every
 * prompt, streamed update, stop and lifecycle transition of a session that
 * resolved a project has to land in THAT session's `events.jsonl` and
 * `meta.json`, and in no other session's.
 *
 * A real `SessionStore` over a temp workspace, not a fake: cross-talk between
 * two sessions is exactly the failure a stubbed store would hide, because the
 * stub would be the thing recording which log a write went to.
 */

function scenarioFor(name: string, chunks: readonly string[]): Scenario {
  return {
    name,
    // Every mock session answers with the SAME ACP session id — which is why
    // srgnt ids must be independent of it.
    sessionId: 'mock-fixed-acp-id',
    stopReason: 'end_turn',
    initialize: {
      loadSession: false,
      resumeSession: false,
      images: false,
      modes: [],
      agentName: 'mock',
      agentVersion: '0.0.0',
    },
    directives: [{ type: 'emit_chunks', channel: 'agent', chunks: [...chunks], delayMs: 0 }],
  };
}

function connectorFor(scenario: Scenario): ChatConnectFn {
  return async () => {
    const { connection } = await connectMockAgent(scenario);
    return {
      connection,
      harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
      cleanup: async () => connection.close(),
    };
  };
}

/** Reads a session's log straight off disk — never through the store. */
function readLog(root: string, projectId: string, sessionId: string): SessionEvent[] {
  const raw = readFileSync(join(root, 'projects', projectId, 'sessions', sessionId, 'events.jsonl'), 'utf8');
  return raw
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as SessionEvent);
}

function textOf(event: SessionEvent): string {
  const update = (event.payload as { update?: { content?: { text?: string } } })?.update;
  return update?.content?.text ?? '';
}

describe('ChatSessionController persistence (STEP-24-03)', () => {
  let root = '';
  let store: SessionStore;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'srgnt-chat-persist-'));
    store = createSessionStore(root);
  });

  afterEach(async () => {
    await store.close();
    rmSync(root, { recursive: true, force: true });
  });

  function controllerFor(scenario: Scenario): ChatSessionController {
    return new ChatSessionController({
      connect: connectorFor(scenario),
      onUpdate: () => {},
      getStore: () => store,
    });
  }

  it('writes the prompt, the streamed updates and the stop to the session log', async () => {
    const controller = controllerFor(scenarioFor('one', ['Hello ', 'world.']));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    await controller.prompt(session.sessionId, 'Fix the login bug');
    await controller.dispose(session.sessionId);

    const kinds = readLog(root, 'proj-a', session.sessionId).map((event) => event.kind);
    expect(kinds).toContain('client/session_created');
    expect(kinds).toContain('client/prompt');
    expect(kinds).toContain('acp/session_update');
    expect(kinds).toContain('client/stop');
    expect(kinds).toContain('client/session_closed');
    // The prompt is recorded BEFORE the updates it caused: the log is the
    // audit trail, so a turn must read in the order it happened.
    expect(kinds.indexOf('client/prompt')).toBeLessThan(kinds.indexOf('acp/session_update'));
    expect(kinds.indexOf('acp/session_update')).toBeLessThan(kinds.indexOf('client/stop'));
    // seq is dense and monotonic — the store owns it, nobody skips one.
    const seqs = readLog(root, 'proj-a', session.sessionId).map((event) => event.seq);
    expect(seqs).toEqual(seqs.map((_value, index) => index));
  });

  it('keeps two concurrent sessions in different projects out of each other logs', async () => {
    // Distinct chunk text per session is what makes cross-talk visible: an
    // event routed to the wrong log carries the other session's words.
    const controllerA = controllerFor(scenarioFor('a', ['alpha-', 'alpha-', 'alpha']));
    const controllerB = controllerFor(scenarioFor('b', ['bravo-', 'bravo-', 'bravo']));
    const a = await controllerA.newSession('mock', { projectId: 'proj-a' });
    const b = await controllerB.newSession('mock', { projectId: 'proj-b' });
    expect(a.sessionId).not.toBe(b.sessionId);

    // Interleaved on purpose: both turns are in flight at the same time.
    await Promise.all([
      controllerA.prompt(a.sessionId, 'Prompt for A'),
      controllerB.prompt(b.sessionId, 'Prompt for B'),
    ]);
    await Promise.all([controllerA.dispose(a.sessionId), controllerB.dispose(b.sessionId)]);

    const logA = readLog(root, 'proj-a', a.sessionId);
    const logB = readLog(root, 'proj-b', b.sessionId);
    expect(logA.map(textOf).join('')).toContain('alpha');
    expect(logA.map(textOf).join('')).not.toContain('bravo');
    expect(logB.map(textOf).join('')).toContain('bravo');
    expect(logB.map(textOf).join('')).not.toContain('alpha');
    expect(JSON.stringify(logA)).toContain('Prompt for A');
    expect(JSON.stringify(logA)).not.toContain('Prompt for B');

    // Both are listed under their own project, and neither under the other's.
    expect((await store.listSessions('proj-a')).sessions.map((s) => s.id)).toEqual([a.sessionId]);
    expect((await store.listSessions('proj-b')).sessions.map((s) => s.id)).toEqual([b.sessionId]);
  });

  it('gives every session its own id even though the mock reuses one ACP id', async () => {
    const controller = controllerFor(scenarioFor('ids', ['x']));
    const first = await controller.newSession('mock', { projectId: 'proj-a' });
    const second = await controller.newSession('mock', { projectId: 'proj-a' });
    expect(first.sessionId).not.toBe(second.sessionId);
    await controller.flushMeta();

    const listed = await store.listSessions('proj-a');
    expect(listed.sessions).toHaveLength(2);
    // Both recorded the same ACP id — that is the collision srgnt ids avoid.
    expect(listed.sessions.every((session) => session.acpSessionId === 'mock-fixed-acp-id')).toBe(true);
    await controller.disposeAll();
  });

  it('titles a session from its first prompt and never retitles it', async () => {
    const controller = controllerFor(scenarioFor('title', ['ok']));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    const ref = { projectId: 'proj-a', sessionId: session.sessionId };
    await controller.flushMeta();
    // Untitled until the first prompt: an unused session is a placeholder row.
    expect((await store.readMeta(ref)).title).toBeUndefined();

    await controller.prompt(session.sessionId, '  Fix the login bug  \nand the logout one');
    await controller.flushMeta();
    expect((await store.readMeta(ref)).title).toBe('Fix the login bug');

    await controller.prompt(session.sessionId, 'Something else entirely');
    await controller.flushMeta();
    expect((await store.readMeta(ref)).title).toBe('Fix the login bug');
    await controller.dispose(session.sessionId);
  });

  it('leaves a session untitled when the first prompt has no visible text', async () => {
    const controller = controllerFor(scenarioFor('blank', ['ok']));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    const ref = { projectId: 'proj-a', sessionId: session.sessionId };
    await controller.prompt(session.sessionId, '   \n\t ');
    await controller.flushMeta();
    expect((await store.readMeta(ref)).title).toBeUndefined();
    // ...and the blank prompt still does not open a second titling window.
    await controller.prompt(session.sessionId, 'Too late to name it');
    await controller.flushMeta();
    expect((await store.readMeta(ref)).title).toBeUndefined();
    await controller.dispose(session.sessionId);
  });

  it('tracks lifecycle status through the turn and into close', async () => {
    const controller = controllerFor(scenarioFor('status', ['ok']));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    const ref = { projectId: 'proj-a', sessionId: session.sessionId };
    await controller.flushMeta();
    expect((await store.readMeta(ref)).status).toBe('idle');

    await controller.prompt(session.sessionId, 'go');
    await controller.flushMeta();
    // `idle` again once the stop reason landed — the turn is over.
    expect((await store.readMeta(ref)).status).toBe('idle');
    expect((await store.readMeta(ref)).updatedAt).toBeDefined();

    await controller.dispose(session.sessionId);
    expect((await store.readMeta(ref)).status).toBe('closed');
  });

  it('records a failed turn as an error session', async () => {
    const controller = controllerFor(scenarioFor('boom', ['ok']));
    const session = await controller.newSession('mock', { projectId: 'proj-a' });
    const ref = { projectId: 'proj-a', sessionId: session.sessionId };
    // Break the transport under the live session, as a dying agent would: a
    // failed Effect, which is how the wrapper reports a JSON-RPC/turn failure.
    const state = controller as unknown as {
      sessions: Map<string, { connection: { prompt: () => unknown } }>;
    };
    state.sessions.get(session.sessionId)!.connection.prompt = () =>
      Effect.fail(new Error('turn exploded'));
    await expect(controller.prompt(session.sessionId, 'go')).rejects.toThrow(/turn exploded/i);
    await controller.flushMeta();
    expect((await store.readMeta(ref)).status).toBe('error');
    const stops = readLog(root, 'proj-a', session.sessionId).filter((event) => event.kind === 'client/stop');
    expect((stops.at(-1)?.payload as { stopReason?: string }).stopReason).toBe('error');
    await controller.dispose(session.sessionId);
  });

  it('stays memory-only when the session resolved no project', async () => {
    const controller = controllerFor(scenarioFor('nofile', ['ok']));
    // No projectId: nothing on disk can name the session's directory.
    const session = await controller.newSession('mock');
    await controller.prompt(session.sessionId, 'hi');
    expect(controller.sessionEvents(session.sessionId).map((event) => event.kind)).toContain('client/prompt');
    expect((await store.listSessions('proj-a')).sessions).toEqual([]);
    await controller.dispose(session.sessionId);
  });
});
