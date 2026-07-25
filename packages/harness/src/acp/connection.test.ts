import {
  AgentSideConnection,
  ndJsonStream,
  RequestError,
  type Agent,
  type AnyMessage,
  type CancelNotification,
  type InitializeRequest,
  type InitializeResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type SessionNotification,
  type Stream as AcpStream,
} from '@agentclientprotocol/sdk';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  AcpAgentConnection,
  ConnectionLost,
  InitializeFailed,
  ProtocolError,
  SpawnFailed,
  TurnFailed,
  type AcpWrapperError,
  type ClientPorts,
  type ConnectOptions,
} from './index.js';

// ─── In-process client↔agent pair (message-level, per SDK test pattern) ───

function messagePair(): { clientStream: AcpStream; agentStream: AcpStream } {
  const clientToAgent = new TransformStream<AnyMessage, AnyMessage>();
  const agentToClient = new TransformStream<AnyMessage, AnyMessage>();
  return {
    clientStream: { writable: clientToAgent.writable, readable: agentToClient.readable },
    agentStream: { writable: agentToClient.writable, readable: clientToAgent.readable },
  };
}

interface MockAgentOptions {
  chunks?: string[];
  /** prompt() blocks until cancel() arrives, then returns stopReason 'cancelled'. */
  waitForCancel?: boolean;
  /** prompt() also emits one update for this (unregistered) sessionId. */
  strayUpdateSessionId?: string;
  initializeError?: Error;
  promptError?: Error;
  initializeResponse?: Partial<InitializeResponse>;
}

class MockAgent implements Agent {
  lastInitializeRequest: InitializeRequest | undefined;
  private cancelWaiters: Array<() => void> = [];
  private cancelledSessions = new Set<string>();

  constructor(
    private readonly conn: AgentSideConnection,
    private readonly options: MockAgentOptions,
  ) {}

  async initialize(params: InitializeRequest): Promise<InitializeResponse> {
    this.lastInitializeRequest = params;
    if (this.options.initializeError) {
      throw this.options.initializeError;
    }
    return {
      protocolVersion: params.protocolVersion,
      agentCapabilities: {
        loadSession: true,
        promptCapabilities: { image: true },
        sessionCapabilities: { resume: {} },
      },
      agentInfo: { name: 'mock-agent', version: '0.1.0' },
      ...this.options.initializeResponse,
    };
  }

  async newSession(_params: NewSessionRequest): Promise<NewSessionResponse> {
    return { sessionId: 'sess-1' };
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    if (this.options.promptError) {
      throw this.options.promptError;
    }
    for (const text of this.options.chunks ?? []) {
      await this.conn.sessionUpdate({
        sessionId: params.sessionId,
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } },
      });
    }
    if (this.options.strayUpdateSessionId !== undefined) {
      await this.conn.sessionUpdate({
        sessionId: this.options.strayUpdateSessionId,
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'stray' } },
      });
    }
    if (this.options.waitForCancel === true) {
      if (!this.cancelledSessions.has(params.sessionId)) {
        await new Promise<void>((resolve) => this.cancelWaiters.push(resolve));
      }
      return { stopReason: 'cancelled' };
    }
    return { stopReason: 'end_turn' };
  }

  async cancel(params: CancelNotification): Promise<void> {
    this.cancelledSessions.add(params.sessionId);
    for (const waiter of this.cancelWaiters.splice(0)) {
      waiter();
    }
  }
}

const permissionPort = {
  requestPermission: () =>
    Promise.resolve({ outcome: { outcome: 'cancelled' as const } }),
};

async function connectInProcess(
  agentOptions: MockAgentOptions = {},
  connectOverrides: Partial<ConnectOptions> = {},
): Promise<{ connection: AcpAgentConnection; agent: MockAgent }> {
  const { clientStream, agentStream } = messagePair();
  let agent: MockAgent | undefined;
  new AgentSideConnection((conn) => {
    agent = new MockAgent(conn, agentOptions);
    return agent;
  }, agentStream);
  const ports: ClientPorts = connectOverrides.ports ?? { permission: permissionPort };
  const connection = await Effect.runPromise(
    AcpAgentConnection.connect({
      launch: { command: 'mock-agent', args: [], env: {} },
      spawn: () => ({ stream: clientStream }),
      ports,
      ...connectOverrides,
    }),
  );
  return { connection, agent: agent as MockAgent };
}

const flip = <A>(effect: Effect.Effect<A, AcpWrapperError>): Promise<AcpWrapperError> =>
  Effect.runPromise(Effect.flip(effect));

const textOf = (n: SessionNotification): string =>
  n.update.sessionUpdate === 'agent_message_chunk' && n.update.content.type === 'text'
    ? n.update.content.text
    : '';

// ─── Byte-level scripted agent (for garbage frames and abrupt closure) ───

interface ScriptedAgentBehavior {
  /** Raw lines written to the client before the session/new response. */
  garbageBeforeNewSession?: string[];
  /** Respond to session/new with this JSON-RPC error instead of a result. */
  newSessionError?: { code: number; message: string; data?: unknown };
  /** Close the byte stream instead of answering session/new. */
  closeOnNewSession?: boolean;
}

function scriptedAgent(behavior: ScriptedAgentBehavior): { stream: AcpStream } {
  const clientToAgent = new TransformStream<Uint8Array, Uint8Array>();
  const agentToClient = new TransformStream<Uint8Array, Uint8Array>();
  const clientStream = ndJsonStream(clientToAgent.writable, agentToClient.readable);
  const writer = agentToClient.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const sendRaw = (line: string) => writer.write(encoder.encode(`${line}\n`));
  const send = (message: unknown) => sendRaw(JSON.stringify(message));

  void (async () => {
    const reader = clientToAgent.readable.getReader();
    let pending = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      pending += decoder.decode(value, { stream: true });
      let index = pending.indexOf('\n');
      while (index !== -1) {
        const line = pending.slice(0, index).trim();
        pending = pending.slice(index + 1);
        index = pending.indexOf('\n');
        if (line === '') {
          continue;
        }
        const message = JSON.parse(line) as { id?: number; method?: string };
        if (message.method === 'initialize') {
          await send({
            jsonrpc: '2.0',
            id: message.id,
            result: { protocolVersion: 1, agentCapabilities: {} },
          });
        } else if (message.method === 'session/new') {
          if (behavior.closeOnNewSession === true) {
            await writer.close();
            return;
          }
          for (const garbage of behavior.garbageBeforeNewSession ?? []) {
            await sendRaw(garbage);
          }
          if (behavior.newSessionError !== undefined) {
            await send({ jsonrpc: '2.0', id: message.id, error: behavior.newSessionError });
          } else {
            await send({ jsonrpc: '2.0', id: message.id, result: { sessionId: 'sess-raw' } });
          }
        }
      }
    }
  })();

  return { stream: clientStream };
}

async function connectScripted(behavior: ScriptedAgentBehavior): Promise<AcpAgentConnection> {
  return Effect.runPromise(
    AcpAgentConnection.connect({
      launch: { command: 'scripted-agent', args: [], env: {} },
      spawn: () => scriptedAgent(behavior),
      ports: { permission: permissionPort },
    }),
  );
}

// ─── Tests ───

describe('AcpAgentConnection.connect', () => {
  it('negotiates capabilities through initialize', async () => {
    const { connection, agent } = await connectInProcess();
    expect(connection.capabilities.protocolVersion).toBe(1);
    expect(connection.capabilities.loadSession).toBe(true);
    expect(connection.capabilities.resumeSession).toBe(true);
    expect(connection.capabilities.images).toBe(true);
    expect(connection.capabilities.agentName).toBe('mock-agent');
    // no fs/terminal ports were provided → advertised off
    // (toMatchObject: SDK 1.2.1 augments the wire request with an `auth` block)
    expect(agent.lastInitializeRequest?.clientCapabilities).toMatchObject({
      fs: { readTextFile: false, writeTextFile: false },
      terminal: false,
    });
    expect(agent.lastInitializeRequest?.clientInfo?.name).toBe('srgnt');
  });

  it('advertises fs and terminal capabilities when those ports are injected', async () => {
    const fsPort = {
      readTextFile: () => Promise.resolve({ content: '' }),
      writeTextFile: () => Promise.resolve(),
    };
    const terminalPort = {
      createTerminal: () => Promise.resolve({ terminalId: 't1' }),
      terminalOutput: () => Promise.resolve({ output: '', truncated: false }),
      releaseTerminal: () => Promise.resolve(),
      waitForTerminalExit: () => Promise.resolve({}),
      killTerminal: () => Promise.resolve(),
    };
    const { agent } = await connectInProcess(
      {},
      { ports: { permission: permissionPort, fs: fsPort, terminal: terminalPort } },
    );
    expect(agent.lastInitializeRequest?.clientCapabilities).toMatchObject({
      fs: { readTextFile: true, writeTextFile: true },
      terminal: true,
    });
  });

  it('advertises a read-only fs when the port omits writeTextFile', async () => {
    // PHASE-23 ships client fs before the permission engine that gates writes,
    // so the write capability must be advertisable off independently.
    const { agent } = await connectInProcess(
      {},
      { ports: { permission: permissionPort, fs: { readTextFile: () => Promise.resolve({ content: '' }) } } },
    );
    expect(agent.lastInitializeRequest?.clientCapabilities).toMatchObject({
      fs: { readTextFile: true, writeTextFile: false },
    });
  });

  it('applies capabilityOverrides on top of negotiation', async () => {
    const { connection } = await connectInProcess(
      {},
      { capabilityOverrides: { loadSession: false, slashCommands: true } },
    );
    expect(connection.capabilities.loadSession).toBe(false);
    expect(connection.capabilities.slashCommands).toBe(true);
    expect(connection.capabilities.resumeSession).toBe(true);
  });

  it('fails with SpawnFailed when the injected spawner rejects', async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        AcpAgentConnection.connect({
          launch: { command: 'does-not-exist', args: [], env: {} },
          spawn: () => Promise.reject(new Error('ENOENT: no such binary')),
          ports: { permission: permissionPort },
        }),
      ),
    );
    expect(error).toBeInstanceOf(SpawnFailed);
    expect(error._tag).toBe('SpawnFailed');
    if (error instanceof SpawnFailed) {
      expect(error.command).toBe('does-not-exist');
      expect(error.message).toContain('ENOENT');
    }
  });

  it('fails with InitializeFailed when capability negotiation errors', async () => {
    const { clientStream, agentStream } = messagePair();
    new AgentSideConnection(
      (conn) => new MockAgent(conn, { initializeError: RequestError.authRequired() }),
      agentStream,
    );
    const error = await Effect.runPromise(
      Effect.flip(
        AcpAgentConnection.connect({
          launch: { command: 'mock-agent', args: [], env: {} },
          spawn: () => ({ stream: clientStream }),
          ports: { permission: permissionPort },
        }),
      ),
    );
    expect(error).toBeInstanceOf(InitializeFailed);
    expect(error._tag).toBe('InitializeFailed');
  });

  it('tears down the spawned agent when initialize fails (no orphan)', async () => {
    const { clientStream, agentStream } = messagePair();
    new AgentSideConnection(
      (conn) => new MockAgent(conn, { initializeError: RequestError.authRequired() }),
      agentStream,
    );
    let killed = false;
    const error = await Effect.runPromise(
      Effect.flip(
        AcpAgentConnection.connect({
          launch: { command: 'mock-agent', args: [], env: {} },
          spawn: () => ({ stream: clientStream, kill: () => (killed = true) }),
          ports: { permission: permissionPort },
        }),
      ),
    );
    expect(error).toBeInstanceOf(InitializeFailed);
    expect(killed).toBe(true);
  });
});

describe('prompt turns and the typed update stream', () => {
  it('runs initialize → session/new → prompt with a multi-chunk update stream', async () => {
    const { connection } = await connectInProcess({ chunks: ['Hello', ', ', 'world'] });
    const session = await Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    expect(session.sessionId).toBe('sess-1');

    const iterator = connection.updates(session.sessionId);
    const response = await Effect.runPromise(
      connection.prompt({
        sessionId: session.sessionId,
        prompt: [{ type: 'text', text: 'greet me' }],
      }),
    );
    expect(response.stopReason).toBe('end_turn');

    const received: string[] = [];
    for (let i = 0; i < 3; i++) {
      received.push(textOf((await iterator.next()).value as SessionNotification));
    }
    expect(received).toEqual(['Hello', ', ', 'world']);
  });

  it('cancels mid-turn: prompt resolves with stopReason cancelled', async () => {
    const { connection } = await connectInProcess({ chunks: ['partial'], waitForCancel: true });
    const session = await Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    const iterator = connection.updates(session.sessionId);

    const turn = Effect.runPromise(
      connection.prompt({
        sessionId: session.sessionId,
        prompt: [{ type: 'text', text: 'long task' }],
      }),
    );
    // wait until the first chunk proves the turn is in flight
    expect(textOf((await iterator.next()).value as SessionNotification)).toBe('partial');
    await Effect.runPromise(connection.cancel({ sessionId: session.sessionId }));
    const response = await turn;
    expect(response.stopReason).toBe('cancelled');
  });

  it('does not deadlock the read loop when nobody consumes updates (slow consumer)', async () => {
    const chunks = Array.from({ length: 64 }, (_, i) => `chunk-${i}`);
    const { connection } = await connectInProcess({ chunks });
    const session = await Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    // prompt completes even though no consumer is draining the stream
    const response = await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
    );
    expect(response.stopReason).toBe('end_turn');
    // everything was buffered and drains in order afterwards
    const iterator = connection.updates(session.sessionId);
    for (let i = 0; i < chunks.length; i++) {
      expect(textOf((await iterator.next()).value as SessionNotification)).toBe(`chunk-${i}`);
    }
  });

  it('drops updates for unknown sessionIds with a warning, not a crash', async () => {
    const { connection } = await connectInProcess({ chunks: ['ok'], strayUpdateSessionId: 'ghost' });
    const warnings: Array<{ kind: string; sessionId: string }> = [];
    connection.onUpdateWarning((w) => warnings.push({ kind: w.kind, sessionId: w.sessionId }));
    const session = await Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    const response = await Effect.runPromise(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
    );
    expect(response.stopReason).toBe('end_turn');
    expect(warnings).toContainEqual({ kind: 'unknown-session', sessionId: 'ghost' });
    // the known session's stream still works
    const iterator = connection.updates(session.sessionId);
    expect(textOf((await iterator.next()).value as SessionNotification)).toBe('ok');
  });

  it('fails with TurnFailed when the agent errors mid-prompt', async () => {
    const { connection } = await connectInProcess({ promptError: new Error('model exploded') });
    const session = await Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    const error = await flip(
      connection.prompt({ sessionId: session.sessionId, prompt: [{ type: 'text', text: 'go' }] }),
    );
    expect(error).toBeInstanceOf(TurnFailed);
    if (error instanceof TurnFailed) {
      expect(error.sessionId).toBe(session.sessionId);
    }
  });
});

describe('protocol robustness (byte-level scripted agent)', () => {
  it('tolerates garbage lines between frames (pinned SDK behavior: skip and continue)', async () => {
    const connection = await connectScripted({
      garbageBeforeNewSession: ['this is not json', '42', '"just a string"'],
    });
    // Despite three garbage stdout lines, the response frame still arrives.
    const session = await Effect.runPromise(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    expect(session.sessionId).toBe('sess-raw');
  });

  it('surfaces JSON-RPC error responses as ProtocolError with the code', async () => {
    const connection = await connectScripted({
      newSessionError: { code: -32602, message: 'bad params' },
    });
    const error = await flip(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    expect(error).toBeInstanceOf(ProtocolError);
    if (error instanceof ProtocolError) {
      expect(error.code).toBe(-32602);
      expect(error.method).toBe('session/new');
    }
  });

  it('maps abrupt stream closure to ConnectionLost and fails later calls fast', async () => {
    const connection = await connectScripted({ closeOnNewSession: true });
    const error = await flip(connection.newSession({ cwd: '/tmp', mcpServers: [] }));
    expect(error).toBeInstanceOf(ConnectionLost);
    await connection.closed;
    expect(connection.isClosed).toBe(true);
    // subsequent calls short-circuit without touching the dead transport
    const later = await flip(connection.cancel({ sessionId: 'sess-raw' }));
    expect(later).toBeInstanceOf(ConnectionLost);
  });
});
