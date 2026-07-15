/**
 * @vitest-environment node
 */
import type { DevSessionUpdateEvent } from '@srgnt/contracts';
import { connectMockAgent, type Scenario } from '@srgnt/harness/testing';
import { describe, expect, it } from 'vitest';
import { DevSessionController, type DevConnectFn } from './session-controller.js';

/**
 * The dev-console controller drives real `@srgnt/harness` wrapper sessions. Here
 * we inject an in-process mock connection (no spawned process) so the round-trip
 * — newSession → streamed updates → prompt → cancel → dispose — is deterministic
 * and fast. The real `defaultDevConnect` path (spawning the mock/Pi bin via the
 * Supervisor) is exercised by the manual console + the harness integration tests.
 */

const demoScenario: Scenario = {
  name: 'dev-controller-test',
  sessionId: 'mock-session-1',
  stopReason: 'end_turn',
  initialize: { loadSession: false, resumeSession: false, images: false, modes: [], agentName: 'mock', agentVersion: '0.0.0' },
  directives: [
    { type: 'emit_chunks', channel: 'agent', chunks: ['Hello ', 'world.'], delayMs: 0 },
    { type: 'tool_call', toolCallId: 't1', title: 'Read', kind: 'read', status: 'in_progress', content: undefined, rawInput: undefined },
    { type: 'tool_call_update', toolCallId: 't1', status: 'completed', content: undefined },
  ],
};

const mockConnect: DevConnectFn = async () => {
  const { connection } = await connectMockAgent(demoScenario);
  return { connection, cleanup: async () => connection.close() };
};

const tick = (ms = 60): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('DevSessionController (mock target, in-process)', () => {
  it('opens a session, streams updates, completes a prompt turn, and disposes', async () => {
    const updates: DevSessionUpdateEvent[] = [];
    const controller = new DevSessionController({ connect: mockConnect, onUpdate: (event) => updates.push(event) });

    const session = await controller.newSession('mock');
    expect(session.sessionId).toMatch(/^dev-mock-/);
    expect(session.target).toBe('mock');
    expect(session.capabilities.protocolVersion).toBeGreaterThan(0);
    expect(controller.has(session.sessionId)).toBe(true);

    const turn = await controller.prompt(session.sessionId, 'hi');
    expect(turn.stopReason).toBe('end_turn');

    await tick();
    expect(updates.length).toBeGreaterThan(0);
    // Every streamed frame is keyed by the console handle, not the ACP id.
    expect(updates.every((event) => event.sessionId === session.sessionId)).toBe(true);
    const kinds = updates.map(
      (event) => (event.update as { update?: { sessionUpdate?: string } }).update?.sessionUpdate,
    );
    expect(kinds).toContain('agent_message_chunk');
    expect(kinds).toContain('tool_call');

    await controller.dispose(session.sessionId);
    expect(controller.has(session.sessionId)).toBe(false);
  });

  it('gives distinct handles to concurrent mock sessions sharing one ACP session id', async () => {
    const controller = new DevSessionController({ connect: mockConnect, onUpdate: () => {} });
    const a = await controller.newSession('mock');
    const b = await controller.newSession('mock');
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(controller.sessionCount).toBe(2);
    await controller.disposeAll();
    expect(controller.sessionCount).toBe(0);
  });

  it('cancel on a live session resolves without throwing', async () => {
    const controller = new DevSessionController({ connect: mockConnect, onUpdate: () => {} });
    const session = await controller.newSession('mock');
    await expect(controller.cancel(session.sessionId)).resolves.toBeUndefined();
    await controller.dispose(session.sessionId);
  });

  it('prompt on an unknown handle throws', async () => {
    const controller = new DevSessionController({ connect: mockConnect, onUpdate: () => {} });
    await expect(controller.prompt('nope', 'hi')).rejects.toThrow(/no dev-console session/i);
  });
});
