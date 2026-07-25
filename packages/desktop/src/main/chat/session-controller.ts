import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ChatSessionNewResponse,
  ChatSessionPromptResponse,
  ChatSessionUpdateEvent,
  ChatTarget,
  LaunchSpec,
} from '@srgnt/contracts';
import type { AcpAgentConnection, ClientPorts } from '@srgnt/harness';
import { Effect } from 'effect';

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

/** Opens a connection for a target. Injected so tests can use an in-process mock. */
export type ChatConnectFn = (target: ChatTarget) => Promise<ChatConnection>;

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
 * LaunchSpec for the built mock agent, resolved from the installed
 * `@srgnt/harness` package so it works both in `pnpm dev` and a packaged app.
 * `ELECTRON_RUN_AS_NODE=1` makes Electron's own binary run the bin as plain
 * Node (in a Node/vitest process it is a harmless no-op).
 *
 * The scenario exercises exactly what this step renders: interleaved thought and
 * message chunks with a tool call between two message runs (so the transcript's
 * segment-boundary rule is visible by hand), and GFM-heavy message bodies.
 * STEP-23-05 replaces this fixed script with injectable scenarios.
 */
function mockLaunchSpec(): LaunchSpec {
  if (cachedMockLaunch !== undefined) return cachedMockLaunch;
  const harnessEntry = require.resolve('@srgnt/harness');
  const binPath = join(harnessEntry, '..', 'testing', 'mock-agent', 'bin.js');
  const scenario = {
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
        type: 'emit_chunks',
        channel: 'agent',
        chunks: ['## Plan\n\n', '1. Inspect the file\n2. Summarize it\n\n', 'Starting now.'],
        delayMs: 40,
      },
      { type: 'tool_call', toolCallId: 'demo-1', title: 'Inspect file', kind: 'read', status: 'in_progress' },
      { type: 'tool_call_update', toolCallId: 'demo-1', status: 'completed' },
      {
        type: 'emit_chunks',
        channel: 'agent',
        chunks: ['Done. Here is the summary:\n\n', '| File | Lines |\n| --- | --- |\n| `index.ts` | 42 |\n'],
        delayMs: 40,
      },
    ],
  };
  const scenarioPath = join(mkdtempSync(join(tmpdir(), 'srgnt-chat-mock-')), 'scenario.json');
  writeFileSync(scenarioPath, JSON.stringify(scenario));
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
export const defaultChatConnect: ChatConnectFn = async (target) => {
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
      ports: { permission: autoApprovePermission },
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
}

export interface ChatSessionControllerOptions {
  /** Opens agent connections. Defaults to the real supervisor-backed connector. */
  readonly connect?: ChatConnectFn;
  /** Receives every streamed `session/update`, keyed by the chat handle id. */
  readonly onUpdate: (event: ChatSessionUpdateEvent) => void;
  /** Working directory for `session/new`. Defaults to the OS temp dir. */
  readonly getCwd?: () => string | undefined;
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
    const { connection, harness, cleanup } = await this.connect(target);
    let acpSessionId: string;
    try {
      const cwd = this.options.getCwd?.() ?? tmpdir();
      const result = await Effect.runPromise(connection.newSession({ cwd, mcpServers: [] }));
      acpSessionId = result.sessionId;
    } catch (cause) {
      // The connection is live but unusable — tear the process down here so a
      // failed `session/new` (e.g. Pi missing → SpawnFailed) can never leak a
      // supervised child with no handle to dispose it by.
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
    this.sessions.set(handle, { connection, cleanup, acpSessionId, pump });
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
