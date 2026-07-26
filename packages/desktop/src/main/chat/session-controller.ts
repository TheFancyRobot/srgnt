import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ChatSessionNewResponse,
  ChatSessionPromptResponse,
  ChatSessionUpdateEvent,
  ChatTarget,
  ChatTerminalOutputEvent,
  LaunchSpec,
} from '@srgnt/contracts';
import type { AcpAgentConnection, ClientPorts } from '@srgnt/harness';
import { Effect } from 'effect';
import { createChatClientServices, type ChatClientServices } from './client-services.js';

/**
 * `@srgnt/harness` is ESM-only (`"type": "module"`) and desktop-main compiles to
 * CommonJS, so a static `import` — or a TS `import()` (which tsc downlevels to
 * `require()` under `module: commonjs`) — would `require()` an ESM package and
 * throw `ERR_REQUIRE_ESM` on any Electron/Node build without require(ESM). Load
 * it through a genuine dynamic `import()` hidden from the CommonJS transform by
 * the `Function` indirection, so it resolves the ESM graph natively. Memoized;
 * only ever runs when a chat session is actually opened.
 */
type HarnessModule = typeof import('@srgnt/harness');
let harnessModulePromise: Promise<HarnessModule> | undefined;
function loadHarness(): Promise<HarnessModule> {
  if (harnessModulePromise === undefined) {
    harnessModulePromise = Function('return import("@srgnt/harness")')() as Promise<HarnessModule>;
  }
  return harnessModulePromise;
}

/**
 * Ephemeral chat session controller — the product-facing sibling of
 * `DevSessionController` (STEP-22-05). Same boundary: this file owns the
 * Electron-side lifecycle (IPC-facing methods, update fan-out) while
 * `@srgnt/harness` stays pure Node (Supervisor + wrapper).
 *
 * Ephemeral by design for Phase 23 — sessions live only for the app's lifetime
 * and there is no session list; Phase 24 owns durability. Every session gets its
 * own supervised process so a kill-tree on dispose can never orphan a child.
 *
 * Unlike the dev console, permissions are NOT auto-approved forever: STEP-23-03
 * replaces {@link autoApprovePermission} with the real renderer round-trip. Until
 * then the default-ask policy has no UI to ask through, so the placeholder keeps
 * the mock/Pi turn from deadlocking. See the comment on the port below.
 */

/**
 * TEMPORARY (STEP-23-03 replaces this): auto-selects the first `allow` option.
 * This step ships the streaming surface only — there is no permission UI yet, so
 * a blocking prompt would hang the turn with nothing on screen to resolve it.
 * STEP-23-03 swaps this for a real renderer round-trip honoring default-ask.
 */
const autoApprovePermission: ClientPorts['permission'] = {
  requestPermission: (params) => {
    const option = params.options.find((candidate) => candidate.kind.startsWith('allow')) ?? params.options[0];
    return Promise.resolve(
      option
        ? { outcome: { outcome: 'selected' as const, optionId: option.optionId } }
        : { outcome: { outcome: 'cancelled' as const } },
    );
  },
};

/** Harness identity mirrored to the renderer at session open (trust/capability UI). */
export interface ChatHarnessIdentity {
  readonly id: string;
  readonly name: string;
  readonly quirks: readonly string[];
}

/** A live agent connection, its harness identity, and the kill-tree teardown. */
export interface ChatConnection {
  readonly connection: AcpAgentConnection;
  readonly harness: ChatHarnessIdentity;
  readonly cleanup: () => Promise<void>;
}

/**
 * Opens a connection for a target. Injected so tests can use an in-process mock.
 * The controller builds `ports` (permission + the STEP-23-02 client services) and
 * hands them in, because client services are scoped to the session's cwd and
 * must exist before `initialize` advertises their capabilities.
 */
export type ChatConnectFn = (target: ChatTarget, ports: ClientPorts) => Promise<ChatConnection>;

/**
 * Identity for the built-in deterministic mock. It is not a registry harness
 * (it ships as test substrate, not a shippable agent), so its record lives here
 * rather than in `BUILTIN_HARNESSES`. No quirks: it is a reference ACP agent.
 */
export const MOCK_HARNESS_IDENTITY: ChatHarnessIdentity = {
  id: 'mock',
  name: 'Mock Agent',
  quirks: [],
};

let cachedMockLaunch: LaunchSpec | undefined;

/**
 * The scripted turn the built-in mock agent replays for a manual `pnpm dev`
 * check. It exercises exactly what the chat surface renders: interleaved thought
 * and message chunks with tool calls between two message runs (so the
 * transcript's segment-boundary rule is visible by hand), GFM-heavy message
 * bodies, and — since STEP-23-02 — a plan, a diff-bearing tool call, and a
 * client-created terminal, so one run covers every card variant.
 *
 * Exported so a test can validate it against the mock's own scenario schema: a
 * typo here would otherwise only surface as a dead mock agent at runtime.
 * STEP-23-05 replaces this fixed script with injectable scenarios.
 */
export const MOCK_DEMO_SCENARIO = {
  name: 'chat-demo',
  sessionId: 'mock-chat-session',
  stopReason: 'end_turn',
  directives: [
    {
      type: 'emit_chunks',
      channel: 'thought',
      chunks: ['Reading the request. ', 'Checking which files matter here.'],
      delayMs: 40,
    },
    {
      type: 'plan',
      entries: [
        { content: 'Inspect the file', priority: 'high', status: 'in_progress' },
        { content: 'Apply the edit', priority: 'medium', status: 'pending' },
        { content: 'Run the check', priority: 'low', status: 'pending' },
      ],
    },
    {
      type: 'emit_chunks',
      channel: 'agent',
      chunks: ['## Plan\n\n', '1. Inspect the file\n2. Summarize it\n\n', 'Starting now.'],
      delayMs: 40,
    },
    {
      type: 'tool_call',
      toolCallId: 'demo-1',
      title: 'Inspect file',
      kind: 'read',
      status: 'in_progress',
      content: [{ type: 'content', content: { type: 'text', text: 'export const answer = 41;\n' } }],
    },
    {
      type: 'tool_call_update',
      toolCallId: 'demo-1',
      status: 'completed',
      rawOutput: { bytes: 26 },
    },
    {
      type: 'tool_call',
      toolCallId: 'demo-2',
      title: 'Edit answer.ts',
      kind: 'edit',
      status: 'in_progress',
      content: [
        {
          type: 'diff',
          path: 'answer.ts',
          oldText: 'export const answer = 41;\n',
          newText: 'export const answer = 42;\n',
        },
      ],
    },
    { type: 'tool_call_update', toolCallId: 'demo-2', status: 'completed' },
    // Exercises the client terminal service end to end: the mock calls
    // `terminal/create`, our TerminalPort runs it, and the card embeds it.
    // `chat-term-1` is the id the port assigns to a session's first terminal,
    // which is why the card can reference it before the process starts.
    {
      type: 'tool_call',
      toolCallId: 'demo-3',
      title: 'Run checks',
      kind: 'execute',
      status: 'in_progress',
      content: [{ type: 'terminal', terminalId: 'chat-term-1' }],
    },
    { type: 'use_terminal', command: 'echo', args: ['checks passed'] },
    { type: 'tool_call_update', toolCallId: 'demo-3', status: 'completed' },
    {
      type: 'plan',
      entries: [
        { content: 'Inspect the file', priority: 'high', status: 'completed' },
        { content: 'Apply the edit', priority: 'medium', status: 'completed' },
        { content: 'Run the check', priority: 'low', status: 'completed' },
      ],
    },
    {
      type: 'emit_chunks',
      channel: 'agent',
      chunks: ['Done. Here is the summary:\n\n', '| File | Lines |\n| --- | --- |\n| `index.ts` | 42 |\n'],
      delayMs: 40,
    },
  ],
} as const;

/**
 * LaunchSpec for the built mock agent, resolved from the installed
 * `@srgnt/harness` package so it works both in `pnpm dev` and a packaged app.
 * `ELECTRON_RUN_AS_NODE=1` makes Electron's own binary run the bin as plain
 * Node (in a Node/vitest process it is a harmless no-op).
 */
function mockLaunchSpec(): LaunchSpec {
  if (cachedMockLaunch !== undefined) return cachedMockLaunch;
  const harnessEntry = require.resolve('@srgnt/harness');
  const binPath = join(harnessEntry, '..', 'testing', 'mock-agent', 'bin.js');
  const scenarioPath = join(mkdtempSync(join(tmpdir(), 'srgnt-chat-mock-')), 'scenario.json');
  writeFileSync(scenarioPath, JSON.stringify(MOCK_DEMO_SCENARIO));
  cachedMockLaunch = {
    command: process.execPath,
    args: [binPath, '--scenario', scenarioPath],
    env: { ELECTRON_RUN_AS_NODE: '1' },
  };
  return cachedMockLaunch;
}

/**
 * Default connector: one fresh `Supervisor` per session so its single handle is
 * kill-tree'd on dispose. Mock and Pi share this exact path — the mock is a real
 * spawned process, so both targets exercise supervisor + wrapper, just
 * deterministically for the mock.
 */
export const defaultChatConnect: ChatConnectFn = async (target, ports) => {
  const { AcpAgentConnection, Supervisor, piDefinition } = await loadHarness();
  const definition = target === 'pi' ? piDefinition : undefined;
  const launch = definition?.launch ?? mockLaunchSpec();
  const capabilityOverrides = definition?.capabilityOverrides;
  const harness: ChatHarnessIdentity =
    definition !== undefined
      ? { id: definition.id, name: definition.name, quirks: definition.quirks }
      : MOCK_HARNESS_IDENTITY;
  const supervisor = new Supervisor();
  const handleId = `chat-${target}`;
  supervisor.register(handleId, launch);
  const connection = await Effect.runPromise(
    AcpAgentConnection.connect({
      launch,
      spawn: supervisor.spawnerFor(handleId),
      ports,
      ...(capabilityOverrides !== undefined ? { capabilityOverrides } : {}),
    }),
  );
  return {
    connection,
    harness,
    cleanup: async () => {
      connection.close();
      await supervisor.dispose(handleId);
    },
  };
};

interface SessionState {
  readonly connection: AcpAgentConnection;
  readonly cleanup: () => Promise<void>;
  readonly acpSessionId: string;
  readonly pump: Promise<void>;
  readonly services: ChatClientServices;
}

export interface ChatSessionControllerOptions {
  /** Opens agent connections. Defaults to the real supervisor-backed connector. */
  readonly connect?: ChatConnectFn;
  /** Receives every streamed `session/update`, keyed by the chat handle id. */
  readonly onUpdate: (event: ChatSessionUpdateEvent) => void;
  /** Receives output chunks from client-created terminals, keyed by chat handle. */
  readonly onTerminalOutput?: (event: ChatTerminalOutputEvent) => void;
  /** Working directory for `session/new`. Defaults to the OS temp dir. */
  readonly getCwd?: () => string | undefined;
  /** Builds the client services for a session. Injected in tests. */
  readonly createClientServices?: typeof createChatClientServices;
}

function toError(cause: unknown): Error {
  if (cause instanceof Error) return cause;
  if (cause !== null && typeof cause === 'object' && 'message' in cause) {
    return new Error(String((cause as { message: unknown }).message));
  }
  return new Error(String(cause));
}

/**
 * Drives ephemeral ACP sessions for the chat surface. Handles are opaque
 * chat-local ids (not ACP session ids) so repeated mock sessions — which return
 * a fixed ACP session id — never collide, and so the renderer can filter pushed
 * frames on a handle it owns.
 */
export class ChatSessionController {
  private readonly sessions = new Map<string, SessionState>();
  private readonly connect: ChatConnectFn;
  private counter = 0;

  constructor(private readonly options: ChatSessionControllerOptions) {
    this.connect = options.connect ?? defaultChatConnect;
  }

  /** initialize → session/new; starts streaming updates. Returns a chat handle. */
  async newSession(target: ChatTarget): Promise<ChatSessionNewResponse> {
    const handle = `chat-${target}-${++this.counter}`;
    // The cwd must be known *before* connecting: client services are confined to
    // it, and their presence is what `initialize` advertises as capabilities.
    //
    // With no workspace, the fallback is a fresh scratch directory rather than
    // `tmpdir()` itself — the cwd IS the containment boundary for `fs/*` and
    // `terminal/*`, and the shared system temp holds every other process's
    // temp files, including short-lived credential and token files.
    const cwd = this.options.getCwd?.() ?? mkdtempSync(join(tmpdir(), 'srgnt-chat-session-'));
    const services = (this.options.createClientServices ?? createChatClientServices)({
      sessionRoot: cwd,
      onTerminalOutput: (terminalId, chunk) =>
        this.options.onTerminalOutput?.({ sessionId: handle, terminalId, chunk }),
      // No `authorizeWrite`: `fs/write_text_file` is deliberately absent until
      // STEP-23-03's permission engine can gate it, and the harness advertises
      // the write capability off when the method is missing.
    });
    const { connection, harness, cleanup } = await this.connect(target, {
      permission: autoApprovePermission,
      fs: services.fs,
      terminal: services.terminal,
    });
    let acpSessionId: string;
    try {
      const result = await Effect.runPromise(connection.newSession({ cwd, mcpServers: [] }));
      acpSessionId = result.sessionId;
    } catch (cause) {
      // The connection is live but unusable — tear the process down here so a
      // failed `session/new` (e.g. Pi missing → SpawnFailed) can never leak a
      // supervised child with no handle to dispose it by.
      services.disposeAll();
      await cleanup();
      throw toError(cause);
    }
    const pump = (async () => {
      try {
        for await (const update of connection.updates(acpSessionId)) {
          this.options.onUpdate({ sessionId: handle, update });
        }
      } catch {
        /* the iterator ends when the connection closes; not an error here */
      }
    })();
    this.sessions.set(handle, { connection, cleanup, acpSessionId, pump, services });
    return {
      sessionId: handle,
      target,
      harnessId: harness.id,
      harnessName: harness.name,
      quirks: [...harness.quirks],
      capabilities: connection.capabilities as unknown as Record<string, unknown>,
    };
  }

  /** One prompt turn; resolves with the stop reason. Throws on turn failure. */
  async prompt(handle: string, text: string): Promise<ChatSessionPromptResponse> {
    const state = this.require(handle);
    const outcome = await Effect.runPromise(
      Effect.either(
        state.connection.prompt({
          sessionId: state.acpSessionId,
          prompt: [{ type: 'text', text }],
        }),
      ),
    );
    if (outcome._tag === 'Left') throw toError(outcome.left);
    return { stopReason: outcome.right.stopReason };
  }

  /** `session/cancel` — recovers a hung turn without tearing the session down. */
  async cancel(handle: string): Promise<void> {
    const state = this.require(handle);
    const outcome = await Effect.runPromise(
      Effect.either(state.connection.cancel({ sessionId: state.acpSessionId })),
    );
    // Surface transport/JSON-RPC failures instead of silently succeeding, so the
    // renderer doesn't show a cancelled turn as cancelled when it wasn't.
    if (outcome._tag === 'Left') throw toError(outcome.left);
  }

  /** Kill-trees the session's process and forgets it. Idempotent. */
  async dispose(handle: string): Promise<void> {
    const state = this.sessions.get(handle);
    if (state === undefined) return;
    this.sessions.delete(handle);
    // Client terminals are children of *this* process, not of the agent, so the
    // supervisor's kill-tree cannot reach them: kill them explicitly first.
    state.services.disposeAll();
    await state.cleanup();
  }

  /** Disposes every live session (app quit). Leak-free. */
  async disposeAll(): Promise<void> {
    const handles = [...this.sessions.keys()];
    await Promise.all(handles.map((handle) => this.dispose(handle)));
  }

  has(handle: string): boolean {
    return this.sessions.has(handle);
  }

  get sessionCount(): number {
    return this.sessions.size;
  }

  private require(handle: string): SessionState {
    const state = this.sessions.get(handle);
    if (state === undefined) throw new Error(`No chat session '${handle}'`);
    return state;
  }
}
