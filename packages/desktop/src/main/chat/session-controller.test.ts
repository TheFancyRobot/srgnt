/**
 * @vitest-environment node
 */
import type { ChatSessionUpdateEvent } from '@srgnt/contracts';
import { connectMockAgent, type Scenario } from '@srgnt/harness/testing';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { ChatSessionController, type ChatConnectFn } from './session-controller.js';

/**
 * The chat controller drives real `@srgnt/harness` wrapper sessions. Here we
 * inject an in-process mock connection (no spawned process) so the round trip —
 * newSession → streamed updates → prompt → cancel → dispose — is deterministic
 * and fast. The real `defaultChatConnect` path (spawning the mock/Pi bin via the
 * Supervisor) is exercised by the manual smoke + harness integration tests.
 */

const demoScenario: Scenario = {
  name: 'chat-controller-test',
  sessionId: 'mock-session-1',
  stopReason: 'end_turn',
  initialize: { loadSession: false, resumeSession: false, images: false, modes: [], agentName: 'mock', agentVersion: '0.0.0' },
  directives: [
    { type: 'emit_chunks', channel: 'thought', chunks: ['Thinking.'], delayMs: 0 },
    { type: 'emit_chunks', channel: 'agent', chunks: ['Hello ', 'world.'], delayMs: 0 },
    { type: 'tool_call', toolCallId: 't1', title: 'Read', kind: 'read', status: 'in_progress', content: undefined, rawInput: undefined },
    { type: 'tool_call_update', toolCallId: 't1', status: 'completed', content: undefined },
  ],
};

const mockConnect: ChatConnectFn = async () => {
  const { connection } = await connectMockAgent(demoScenario);
  return {
    connection,
    harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
    cleanup: async () => connection.close(),
  };
};

const tick = (ms = 60): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('ChatSessionController (mock target, in-process)', () => {
  it('opens a session, streams updates, completes a prompt turn, and disposes', async () => {
    const updates: ChatSessionUpdateEvent[] = [];
    const controller = new ChatSessionController({ connect: mockConnect, onUpdate: (event) => updates.push(event) });

    const session = await controller.newSession('mock');
    expect(session.sessionId).toMatch(/^chat-mock-/);
    expect(session.target).toBe('mock');
    expect(session.capabilities.protocolVersion).toBeGreaterThan(0);
    expect(controller.has(session.sessionId)).toBe(true);

    const turn = await controller.prompt(session.sessionId, 'hi');
    expect(turn.stopReason).toBe('end_turn');

    await tick();
    expect(updates.length).toBeGreaterThan(0);
    // Every streamed frame is keyed by the chat handle, not the ACP id.
    expect(updates.every((event) => event.sessionId === session.sessionId)).toBe(true);
    const kinds = updates.map(
      (event) => (event.update as { update?: { sessionUpdate?: string } }).update?.sessionUpdate,
    );
    expect(kinds).toContain('agent_thought_chunk');
    expect(kinds).toContain('agent_message_chunk');
    expect(kinds).toContain('tool_call');

    await controller.dispose(session.sessionId);
    expect(controller.has(session.sessionId)).toBe(false);
  });

  it('reports harness identity and quirks so the renderer can badge trust', async () => {
    const quirkyConnect: ChatConnectFn = async () => {
      const { connection } = await connectMockAgent(demoScenario);
      return {
        connection,
        harness: { id: 'pi', name: 'Pi', quirks: ['adapter-mediated', 'permission-routing-gaps'] },
        cleanup: async () => connection.close(),
      };
    };
    const controller = new ChatSessionController({ connect: quirkyConnect, onUpdate: () => {} });
    const session = await controller.newSession('pi');
    expect(session.harnessId).toBe('pi');
    expect(session.harnessName).toBe('Pi');
    expect(session.quirks).toEqual(['adapter-mediated', 'permission-routing-gaps']);
    await controller.dispose(session.sessionId);
  });

  it('gives distinct handles to concurrent mock sessions sharing one ACP session id', async () => {
    const controller = new ChatSessionController({ connect: mockConnect, onUpdate: () => {} });
    const a = await controller.newSession('mock');
    const b = await controller.newSession('mock');
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(controller.sessionCount).toBe(2);
    await controller.disposeAll();
    expect(controller.sessionCount).toBe(0);
  });

  it('cancel on a live session resolves without throwing', async () => {
    const controller = new ChatSessionController({ connect: mockConnect, onUpdate: () => {} });
    const session = await controller.newSession('mock');
    await expect(controller.cancel(session.sessionId)).resolves.toBeUndefined();
    await controller.dispose(session.sessionId);
  });

  it('cancel surfaces a transport failure instead of silently succeeding', async () => {
    const failingConnect: ChatConnectFn = async () => {
      const { connection } = await connectMockAgent(demoScenario);
      (connection as unknown as { cancel: () => unknown }).cancel = () =>
        Effect.fail(new Error('cancel transport boom'));
      return {
        connection,
        harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
        cleanup: async () => connection.close(),
      };
    };
    const controller = new ChatSessionController({ connect: failingConnect, onUpdate: () => {} });
    const session = await controller.newSession('mock');
    await expect(controller.cancel(session.sessionId)).rejects.toThrow(/cancel transport boom/i);
    await controller.dispose(session.sessionId);
  });

  it('cleans up (no leaked handle) when session/new fails', async () => {
    // Mirrors the Pi-not-installed case: the process connects but `session/new`
    // rejects. The controller must kill-tree before rethrowing, or the child
    // outlives the app with no handle to dispose it by.
    let cleanupCalls = 0;
    const failingNewSession: ChatConnectFn = async () => {
      const { connection } = await connectMockAgent(demoScenario);
      (connection as unknown as { newSession: () => unknown }).newSession = () =>
        Effect.fail(new Error('SpawnFailed: pi not installed'));
      return {
        connection,
        harness: { id: 'pi', name: 'Pi', quirks: [] },
        cleanup: async () => {
          cleanupCalls += 1;
          connection.close();
        },
      };
    };
    const controller = new ChatSessionController({ connect: failingNewSession, onUpdate: () => {} });
    await expect(controller.newSession('pi')).rejects.toThrow(/spawnfailed/i);
    expect(cleanupCalls).toBe(1);
    expect(controller.sessionCount).toBe(0);
  });

  it('prompt on an unknown handle throws', async () => {
    const controller = new ChatSessionController({ connect: mockConnect, onUpdate: () => {} });
    await expect(controller.prompt('nope', 'hi')).rejects.toThrow(/no chat session/i);
  });
});
