/**
 * @vitest-environment node
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChatSessionUpdateEvent, ChatTerminalOutputEvent } from '@srgnt/contracts';
import type { ClientPorts } from '@srgnt/harness';
import { connectMockAgent, readScenario, type Scenario } from '@srgnt/harness/testing';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createChatClientServices, type TerminalSpawn } from './client-services.js';
import { ChatSessionController, MOCK_DEMO_SCENARIO, type ChatConnectFn } from './session-controller.js';

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

describe('built-in mock demo scenario', () => {
  it('validates against the mock agent scenario schema', () => {
    // The scenario is serialized to JSON and handed to the mock bin, which fails
    // fast on an invalid one. Without this test a typo in a directive would only
    // show up as a chat session that dies the moment a user clicks Start.
    const result = readScenario(JSON.parse(JSON.stringify(MOCK_DEMO_SCENARIO)));
    expect(result.success ? null : result.error).toBeNull();
  });

  it('covers every card variant this step renders', () => {
    const types = MOCK_DEMO_SCENARIO.directives.map((directive) => directive.type);
    expect(types).toContain('plan');
    expect(types).toContain('use_terminal');
    // The manual `pnpm dev` path for the permission prompt: Pi never sends this,
    // so without it the prompt is unreachable by hand.
    expect(types).toContain('request_permission');
    const contents = MOCK_DEMO_SCENARIO.directives.flatMap((directive) =>
      'content' in directive ? (directive.content as readonly { type: string }[]) : [],
    );
    expect(contents.map((block) => block.type)).toEqual(
      expect.arrayContaining(['content', 'diff', 'terminal']),
    );
  });
});

describe('ChatSessionController — client services (STEP-23-02)', () => {
  /**
   * A `TerminalSpawn` over plain `child_process`. The production backend is
   * node-pty; this keeps the end-to-end directive test free of a native addon
   * (node-pty's `posix_spawnp` is not available in every CI sandbox) while still
   * running a real process through the real `TerminalPort`.
   */
  const childProcessSpawn: TerminalSpawn = (options) => {
    const child = spawn(options.command, [...options.args], { cwd: options.cwd, env: { ...options.env } });
    return {
      onData: (listener) => {
        child.stdout.on('data', (buffer: Buffer) => listener(buffer.toString('utf8')));
        child.stderr.on('data', (buffer: Buffer) => listener(buffer.toString('utf8')));
      },
      onExit: (listener) => {
        child.on('close', (code, signal) => listener({ exitCode: code, signal: signal ?? null }));
      },
      kill: () => void child.kill(),
    };
  };

  /** Connects the mock agent with exactly the ports the controller built. */
  const portsAwareConnect =
    (scenario: Scenario): ChatConnectFn =>
    async (_target, ports) => {
      const { connection } = await connectMockAgent(scenario, { ports });
      return {
        connection,
        harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
        cleanup: async () => connection.close(),
      };
    };

  const scenarioWith = (directives: Scenario['directives']): Scenario => ({
    ...demoScenario,
    directives,
  });

  let cwd: string;

  beforeEach(() => {
    cwd = realpathSync(mkdtempSync(join(tmpdir(), 'srgnt-chat-cwd-')));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('confines a workspace-less session to its own scratch dir, not the shared temp root', async () => {
    // The cwd is the containment boundary for fs/* and terminal/*, so falling
    // back to `tmpdir()` itself would expose every other process's temp files.
    const roots: string[] = [];
    const controller = new ChatSessionController({
      connect: portsAwareConnect(scenarioWith([])),
      onUpdate: () => {},
      getCwd: () => undefined,
      createClientServices: (options) => {
        roots.push(options.sessionRoot);
        return createChatClientServices(options);
      },
    });
    const session = await controller.newSession('mock');
    expect(roots[0]).not.toBe(tmpdir());
    expect(realpathSync(roots[0]!).startsWith(realpathSync(tmpdir()))).toBe(true);
    await controller.dispose(session.sessionId);
    rmSync(roots[0]!, { recursive: true, force: true });
  });

  it('serves the mock agent read_file from the session cwd', async () => {
    writeFileSync(join(cwd, 'note.txt'), 'from the session cwd');
    const scenario = scenarioWith([
      { type: 'read_file', path: join(cwd, 'note.txt'), expectContentContains: 'from the session cwd' },
    ]);
    const controller = new ChatSessionController({
      connect: portsAwareConnect(scenario),
      onUpdate: () => {},
      getCwd: () => cwd,
    });
    const session = await controller.newSession('mock');
    // The mock records a scenario assertion failure rather than throwing, so a
    // clean `end_turn` is the proof the read actually returned the content.
    await expect(controller.prompt(session.sessionId, 'go')).resolves.toEqual({ stopReason: 'end_turn' });
    await controller.dispose(session.sessionId);
  });

  it('runs use_terminal end to end and streams output out for the renderer embed', async () => {
    const scenario = scenarioWith([
      { type: 'use_terminal', command: 'echo', args: ['embedded-output'], expectOutputContains: 'embedded-output' },
    ]);
    const streamed: ChatTerminalOutputEvent[] = [];
    const controller = new ChatSessionController({
      connect: portsAwareConnect(scenario),
      onUpdate: () => {},
      onTerminalOutput: (event) => streamed.push(event),
      getCwd: () => cwd,
      createClientServices: (options) => createChatClientServices({ ...options, spawn: childProcessSpawn }),
    });
    const session = await controller.newSession('mock');
    await expect(controller.prompt(session.sessionId, 'run it')).resolves.toEqual({ stopReason: 'end_turn' });

    expect(streamed.length).toBeGreaterThan(0);
    expect(streamed.every((event) => event.sessionId === session.sessionId)).toBe(true);
    expect(streamed.map((event) => event.chunk).join('')).toContain('embedded-output');
    // Every chunk is tagged with the terminal id the card embeds on.
    expect(new Set(streamed.map((event) => event.terminalId)).size).toBe(1);
    await controller.dispose(session.sessionId);
  });

  it('advertises fs read and — since the permission engine landed — fs write', async () => {
    let captured: ClientPorts | undefined;
    const capturingConnect: ChatConnectFn = async (_target, ports) => {
      captured = ports;
      const { connection } = await connectMockAgent(demoScenario, { ports });
      return {
        connection,
        harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
        cleanup: async () => connection.close(),
      };
    };
    const controller = new ChatSessionController({
      connect: capturingConnect,
      onUpdate: () => {},
      getCwd: () => cwd,
    });
    const session = await controller.newSession('mock');
    expect(captured?.fs?.readTextFile).toBeTypeOf('function');
    // STEP-23-03: present now, because every write goes through a default-ask
    // permission round-trip. See permissions.test.ts for the refusal path.
    expect(captured?.fs?.writeTextFile).toBeTypeOf('function');
    expect(captured?.terminal).toBeDefined();
    await controller.dispose(session.sessionId);
  });

  it('kills client terminals on dispose (the supervisor kill-tree cannot reach them)', async () => {
    let killed = 0;
    const neverExits: TerminalSpawn = () => ({
      onData: () => {},
      onExit: () => {},
      kill: () => {
        killed += 1;
      },
    });
    let captured: ClientPorts | undefined;
    const controller = new ChatSessionController({
      connect: async (_target, ports) => {
        captured = ports;
        const { connection } = await connectMockAgent(demoScenario, { ports });
        return {
          connection,
          harness: { id: 'mock', name: 'Mock Agent', quirks: [] },
          cleanup: async () => connection.close(),
        };
      },
      onUpdate: () => {},
      getCwd: () => cwd,
      createClientServices: (options) => createChatClientServices({ ...options, spawn: neverExits }),
    });
    const session = await controller.newSession('mock');
    // A long-running command the agent never released: dispose must reap it.
    await captured?.terminal?.createTerminal({ sessionId: 'mock-session-1', command: 'sleep', args: ['600'] });
    await controller.dispose(session.sessionId);
    expect(killed).toBe(1);
  });
});
