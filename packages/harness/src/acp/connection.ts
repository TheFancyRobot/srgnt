import { spawn as nodeSpawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Client,
  type ClientCapabilities,
  type Stream as AcpStream,
  type CancelNotification,
  type CreateTerminalRequest,
  type CreateTerminalResponse,
  type Implementation,
  type KillTerminalRequest,
  type KillTerminalResponse,
  type LoadSessionRequest,
  type LoadSessionResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type ReadTextFileRequest,
  type ReadTextFileResponse,
  type ReleaseTerminalRequest,
  type ReleaseTerminalResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type ResumeSessionRequest,
  type ResumeSessionResponse,
  type SessionNotification,
  type SetSessionModeRequest,
  type SetSessionModeResponse,
  type TerminalOutputRequest,
  type TerminalOutputResponse,
  type WaitForTerminalExitRequest,
  type WaitForTerminalExitResponse,
  type WriteTextFileRequest,
  type WriteTextFileResponse,
} from '@agentclientprotocol/sdk';
import type { LaunchSpec } from '@srgnt/contracts';
import { Effect, Stream } from 'effect';
import {
  applyCapabilityOverrides,
  mergeSessionCapabilities,
  negotiateCapabilities,
  type NegotiatedCapabilities,
} from './capabilities.js';
import {
  ConnectionLost,
  fromSdkError,
  InitializeFailed,
  ProtocolError,
  SpawnFailed,
  TurnFailed,
} from './errors.js';
import { SessionUpdateHub, type UpdateWarning } from './stream.js';

// ─── Client-service ports ───
// Interfaces the host provides so the *agent* can call back into the client.
// Electron implementations arrive in Phase 23; tests use in-memory fakes.

/** Presents permission requests to the user and returns their decision. */
export interface PermissionPort {
  requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse>;
}

/**
 * File-system access the agent may use (advertised via `fs` client capabilities).
 *
 * `writeTextFile` is optional so a host can expose a **read-only** file system
 * honestly: the write capability is advertised from the method's presence, not
 * from the port's, so a port without it initializes with
 * `fs: { readTextFile: true, writeTextFile: false }` and the agent never asks.
 * That is what PHASE-23 needs before STEP-23-03's permission engine can gate
 * writes — the alternative (advertise write, then reject every call) would be a
 * capability lie.
 */
export interface FileSystemPort {
  readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse>;
  writeTextFile?(params: WriteTextFileRequest): Promise<WriteTextFileResponse | void>;
}

/** Terminal access the agent may use (advertised via the `terminal` client capability). */
export interface TerminalPort {
  createTerminal(params: CreateTerminalRequest): Promise<CreateTerminalResponse>;
  terminalOutput(params: TerminalOutputRequest): Promise<TerminalOutputResponse>;
  releaseTerminal(params: ReleaseTerminalRequest): Promise<ReleaseTerminalResponse | void>;
  waitForTerminalExit(params: WaitForTerminalExitRequest): Promise<WaitForTerminalExitResponse>;
  killTerminal(params: KillTerminalRequest): Promise<KillTerminalResponse | void>;
}

/** The full set of client services; only `permission` is mandatory. */
export interface ClientPorts {
  permission: PermissionPort;
  fs?: FileSystemPort;
  terminal?: TerminalPort;
}

// ─── Spawner injection ───

/** A live agent transport produced by a spawner. */
export interface SpawnedAgent {
  /** Bidirectional JSON-RPC message stream (usually `ndJsonStream` over stdio). */
  stream: AcpStream;
  /** Tears down the underlying process/transport. Supervisor owns real kill-trees later. */
  kill?: () => void;
}

/** Turns a contracts `LaunchSpec` into a live transport. Injected so tests and the supervisor own process lifecycle. */
export type AgentSpawner = (launch: LaunchSpec) => Promise<SpawnedAgent> | SpawnedAgent;

/**
 * Default pure-Node spawner: child process over stdio wired through
 * `ndJsonStream`. stderr is left to the caller (supervisor captures it later).
 */
export const childProcessSpawner: AgentSpawner = (launch) =>
  new Promise<SpawnedAgent>((resolve, reject) => {
    const child = nodeSpawn(launch.command, [...(launch.args ?? [])], {
      cwd: launch.cwd,
      env: { ...process.env, ...(launch.env ?? {}) },
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    // A missing or non-executable binary surfaces asynchronously as an 'error'
    // event; without a listener Node treats it as an unhandled error and can
    // crash the host process. Reject the spawn (→ SpawnFailed) instead, and
    // keep a persistent listener so a post-spawn error is never unhandled.
    let settled = false;
    child.once('error', (cause) => {
      if (settled) return;
      settled = true;
      reject(cause);
    });
    child.once('spawn', () => {
      if (settled) return;
      settled = true;
      if (child.stdin === null || child.stdout === null) {
        child.kill();
        reject(new Error(`Failed to open stdio pipes for ${launch.command}`));
        return;
      }
      // Swallow late errors post-spawn: the connection surfaces the resulting
      // stream close as ConnectionLost; an unhandled 'error' must never crash.
      child.on('error', () => {});
      const stream = ndJsonStream(
        Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
        Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
      );
      resolve({ stream, kill: () => void child.kill() });
    });
  });

// ─── Connection ───

export interface ConnectOptions {
  /** How the agent process is launched (contracts data, not protocol code). */
  launch: LaunchSpec;
  /** Injected spawner; use `childProcessSpawner` for real processes. */
  spawn: AgentSpawner;
  /** Client services exposed to the agent; capability flags derive from what is present. */
  ports: ClientPorts;
  /** Client identity sent during initialize. */
  clientInfo?: Implementation;
  /** Protocol version to request; defaults to the SDK's PROTOCOL_VERSION. */
  protocolVersion?: number;
  /** Per-definition capability overrides applied on top of negotiation. */
  capabilityOverrides?: Parameters<typeof applyCapabilityOverrides>[1];
}

const buildClientCapabilities = (ports: ClientPorts): ClientCapabilities => ({
  fs: {
    readTextFile: ports.fs !== undefined,
    writeTextFile: ports.fs?.writeTextFile !== undefined,
  },
  terminal: ports.terminal !== undefined,
});

const buildClient = (ports: ClientPorts, hub: SessionUpdateHub): Client => {
  const client: Client = {
    requestPermission: (params) => ports.permission.requestPermission(params),
    sessionUpdate: (params) => {
      hub.dispatch(params);
    },
  };
  const fs = ports.fs;
  if (fs !== undefined) {
    client.readTextFile = (params) => fs.readTextFile(params);
    // Only wired when the port actually implements it, so the client method set
    // matches the advertised capabilities exactly.
    const writeTextFile = fs.writeTextFile;
    if (writeTextFile !== undefined) {
      client.writeTextFile = (params) => writeTextFile.call(fs, params);
    }
  }
  const terminal = ports.terminal;
  if (terminal !== undefined) {
    client.createTerminal = (params) => terminal.createTerminal(params);
    client.terminalOutput = (params) => terminal.terminalOutput(params);
    client.releaseTerminal = (params) => terminal.releaseTerminal(params);
    client.waitForTerminalExit = (params) => terminal.waitForTerminalExit(params);
    client.killTerminal = (params) => terminal.killTerminal(params);
  }
  return client;
};

/**
 * Typed wrapper around the SDK's `ClientSideConnection`: one connected agent
 * process, negotiated capabilities, typed session methods, and a per-session
 * update stream. All failures are tagged errors from `errors.ts`.
 */
export class AcpAgentConnection {
  /** Effective capabilities: negotiation with the definition's overrides applied. */
  readonly capabilities: NegotiatedCapabilities;
  /**
   * What the agent actually advertised, before any override. Same object as
   * {@link capabilities} when the definition declares none. Kept because the
   * capability cache stores both views — an override is a srgnt decision, and
   * a matrix that only remembers the clamped result cannot show what was
   * measured.
   */
  readonly negotiated: NegotiatedCapabilities;

  private constructor(
    private readonly inner: ClientSideConnection,
    private readonly hub: SessionUpdateHub,
    capabilities: NegotiatedCapabilities,
    private readonly spawned: SpawnedAgent,
    negotiated: NegotiatedCapabilities,
  ) {
    this.capabilities = capabilities;
    this.negotiated = negotiated;
    void this.inner.closed.then(() => this.hub.endAll());
  }

  /** Spawns (via the injected spawner), connects, and runs `initialize`. */
  static connect(
    options: ConnectOptions,
  ): Effect.Effect<AcpAgentConnection, SpawnFailed | InitializeFailed> {
    return Effect.gen(function* () {
      const spawned = yield* Effect.tryPromise({
        try: () => Promise.resolve(options.spawn(options.launch)),
        catch: (cause) =>
          new SpawnFailed({
            message: `Failed to spawn ACP agent: ${cause instanceof Error ? cause.message : String(cause)}`,
            command: options.launch.command,
            cause,
          }),
      });
      const hub = new SessionUpdateHub();
      const client = buildClient(options.ports, hub);
      const inner = new ClientSideConnection(() => client, spawned.stream);
      const requestedProtocolVersion = options.protocolVersion ?? PROTOCOL_VERSION;
      const init = yield* Effect.tryPromise({
        try: () =>
          inner.initialize({
            protocolVersion: requestedProtocolVersion,
            clientCapabilities: buildClientCapabilities(options.ports),
            clientInfo: options.clientInfo ?? { name: 'srgnt', version: '0.0.0' },
          }),
        catch: (cause) => {
          // connect() returns no handle on this path, so the caller cannot
          // clean up; tear down the spawned child here to honor the
          // no-orphans lifecycle invariant.
          spawned.kill?.();
          return new InitializeFailed({
            message: `ACP initialize failed: ${cause instanceof Error ? cause.message : String(cause)}`,
            requestedProtocolVersion,
            cause,
          });
        },
      });
      const negotiated = negotiateCapabilities(init);
      const capabilities =
        options.capabilityOverrides !== undefined
          ? applyCapabilityOverrides(negotiated, options.capabilityOverrides)
          : negotiated;
      return new AcpAgentConnection(inner, hub, capabilities, spawned, negotiated);
    });
  }

  /**
   * Both capability views with mid-session observations folded in — what a
   * capability cache or matrix should store after `session/new` reported modes
   * or an `available_commands_update` arrived. A method rather than an exported
   * helper so the Electron main process (CommonJS) can reach the merge through
   * a connection it already holds, without statically importing this ESM package.
   */
  withObserved(observed: { modes?: boolean; slashCommands?: boolean }): {
    negotiated: NegotiatedCapabilities;
    effective: NegotiatedCapabilities;
  } {
    return {
      negotiated: mergeSessionCapabilities(this.negotiated, observed),
      effective: mergeSessionCapabilities(this.capabilities, observed),
    };
  }

  /** `session/new` — registers the returned sessionId with the update hub. */
  newSession(params: NewSessionRequest): Effect.Effect<NewSessionResponse, ProtocolError | ConnectionLost> {
    return this.call('session/new', () => this.inner.newSession(params)).pipe(
      Effect.tap((response) => Effect.sync(() => this.hub.register(response.sessionId))),
    );
  }

  /** `session/load` — replays history through the update stream (capability-gated by callers). */
  load(params: LoadSessionRequest): Effect.Effect<LoadSessionResponse, ProtocolError | ConnectionLost> {
    this.hub.register(params.sessionId);
    return this.call('session/load', () => this.inner.loadSession(params));
  }

  /** `session/resume` — continues without replay (capability-gated by callers). */
  resume(params: ResumeSessionRequest): Effect.Effect<ResumeSessionResponse, ProtocolError | ConnectionLost> {
    this.hub.register(params.sessionId);
    return this.call('session/resume', () => this.inner.resumeSession(params));
  }

  /** `session/set_mode`. */
  setMode(params: SetSessionModeRequest): Effect.Effect<SetSessionModeResponse, ProtocolError | ConnectionLost> {
    return this.call('session/set_mode', () => this.inner.setSessionMode(params));
  }

  /** `session/prompt` — one full prompt turn; resolves with the stop reason. */
  prompt(params: PromptRequest): Effect.Effect<PromptResponse, TurnFailed | ConnectionLost> {
    return Effect.tryPromise({
      try: () => this.inner.prompt(params),
      catch: (cause) => {
        const mapped = fromSdkError('session/prompt', cause, this.inner.signal.aborted);
        if (mapped._tag === 'ConnectionLost') {
          return mapped;
        }
        return new TurnFailed({
          message: mapped.message,
          sessionId: params.sessionId,
          cause,
        });
      },
    });
  }

  /** `session/cancel` notification. */
  cancel(params: CancelNotification): Effect.Effect<void, ProtocolError | ConnectionLost> {
    return this.call('session/cancel', () => this.inner.cancel(params));
  }

  /** Ordered async iterator over one session's `session/update` notifications. */
  updates(sessionId: string): AsyncIterableIterator<SessionNotification> {
    return this.hub.updates(sessionId);
  }

  /**
   * Takes the frames already queued for a session without waiting for more.
   *
   * Called right after {@link load} resolves to lift the replayed history off
   * the channel before a live pump is attached: the replay must NOT reach a
   * persistence tap (the local log is canonical and already holds it), and the
   * iterator alone cannot separate the two — it would park on an empty buffer.
   */
  takeBufferedUpdates(sessionId: string): SessionNotification[] {
    return this.hub.takeBuffered(sessionId);
  }

  /** The same updates as a typed Effect Stream. */
  updateStream(sessionId: string): Stream.Stream<SessionNotification, ConnectionLost> {
    return this.hub.updateStream(sessionId);
  }

  /** Subscribes to non-fatal update-routing warnings (unknown session, late updates). */
  onUpdateWarning(listener: (warning: UpdateWarning) => void): () => void {
    return this.hub.onWarning(listener);
  }

  /** Resolves when the underlying connection closes. */
  get closed(): Promise<void> {
    return this.inner.closed;
  }

  /** True once the underlying connection has closed. */
  get isClosed(): boolean {
    return this.inner.signal.aborted;
  }

  /** Tears down the transport (and process, when the spawner provided a kill). */
  close(): void {
    this.spawned.kill?.();
    this.hub.endAll();
  }

  private call<A>(
    method: string,
    run: () => Promise<A>,
  ): Effect.Effect<A, ProtocolError | ConnectionLost> {
    if (this.inner.signal.aborted) {
      return Effect.fail(
        new ConnectionLost({ message: `ACP connection already closed before calling ${method}` }),
      );
    }
    return Effect.tryPromise({
      try: run,
      catch: (cause) => fromSdkError(method, cause, this.inner.signal.aborted),
    });
  }
}
