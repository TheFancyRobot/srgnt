import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  DevConsoleTarget,
  DevSessionNewResponse,
  DevSessionPromptResponse,
  DevSessionUpdateEvent,
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
 * only ever runs on the flag-on path (a session is being opened).
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
 * Ephemeral dev-console session controller — the FIRST place desktop-main drives
 * an ACP session through `@srgnt/harness` (STEP-22-05). It keeps the boundary
 * clean: this file owns the Electron-side lifecycle (IPC-facing methods, update
 * fan-out) while `@srgnt/harness` stays pure Node (Supervisor + wrapper). No
 * persistence — sessions live only for the console's lifetime (Phase 24 owns
 * durability).
 *
 * The console targets the deterministic mock agent by default (no spend) and
 * real Pi via the pinned `pi-acp` adapter on demand. Every session gets its own
 * supervised process so a kill-tree on dispose can never orphan a child.
 */

/** Auto-approve permissions: this is a raw dev harness, not the product UI. */
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

/** A live agent connection plus the teardown that kill-trees its process. */
export interface DevConnection {
  readonly connection: AcpAgentConnection;
  readonly cleanup: () => Promise<void>;
}

/** Opens a connection for a target. Injected so tests can use an in-process mock. */
export type DevConnectFn = (target: DevConsoleTarget) => Promise<DevConnection>;

let cachedMockLaunch: LaunchSpec | undefined;

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
  const scenario = {
    name: 'dev-console-demo',
    sessionId: 'mock-dev-session',
    stopReason: 'end_turn',
    directives: [
      { type: 'emit_chunks', channel: 'thought', chunks: ['Planning a response to the prompt.'], delayMs: 40 },
      { type: 'emit_chunks', channel: 'agent', chunks: ['Hello ', 'from ', 'the mock ACP agent.'], delayMs: 40 },
      { type: 'tool_call', toolCallId: 'demo-1', title: 'Inspect file', kind: 'read', status: 'in_progress' },
      { type: 'tool_call_update', toolCallId: 'demo-1', status: 'completed' },
      { type: 'emit_chunks', channel: 'agent', chunks: [' Done.'], delayMs: 40 },
    ],
  };
  const scenarioPath = join(mkdtempSync(join(tmpdir(), 'srgnt-dev-mock-')), 'scenario.json');
  writeFileSync(scenarioPath, JSON.stringify(scenario));
  cachedMockLaunch = {
    command: process.execPath,
    args: [binPath, '--scenario', scenarioPath],
    env: { ELECTRON_RUN_AS_NODE: '1' },
  };
  return cachedMockLaunch;
}

/**
 * Default connector: one fresh {@link Supervisor} per session so its single
 * handle is kill-tree'd on dispose. Mock and Pi share this exact path — the mock
 * is a real spawned process, so the console exercises supervisor + wrapper for
 * both, just deterministically for the mock.
 */
export const defaultDevConnect: DevConnectFn = async (target) => {
  const { AcpAgentConnection, Supervisor, piDefinition } = await loadHarness();
  const launch = target === 'pi' ? piDefinition.launch : mockLaunchSpec();
  const capabilityOverrides = target === 'pi' ? piDefinition.capabilityOverrides : undefined;
  const supervisor = new Supervisor();
  const handleId = `dev-console-${target}`;
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

export interface DevSessionControllerOptions {
  /** Opens agent connections. Defaults to the real supervisor-backed connector. */
  readonly connect?: DevConnectFn;
  /** Receives every streamed `session/update`, keyed by the console handle id. */
  readonly onUpdate: (event: DevSessionUpdateEvent) => void;
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
 * Drives ephemeral raw ACP sessions for the dev console. Handles are opaque
 * console-local ids (not ACP session ids) so repeated mock sessions — which
 * return a fixed ACP session id — never collide.
 */
export class DevSessionController {
  private readonly sessions = new Map<string, SessionState>();
  private readonly connect: DevConnectFn;
  private counter = 0;

  constructor(private readonly options: DevSessionControllerOptions) {
    this.connect = options.connect ?? defaultDevConnect;
  }

  /** initialize → session/new; starts streaming updates. Returns a console handle. */
  async newSession(target: DevConsoleTarget): Promise<DevSessionNewResponse> {
    const handle = `dev-${target}-${++this.counter}`;
    const { connection, cleanup } = await this.connect(target);
    let acpSessionId: string;
    try {
      const cwd = this.options.getCwd?.() ?? tmpdir();
      const result = await Effect.runPromise(connection.newSession({ cwd, mcpServers: [] }));
      acpSessionId = result.sessionId;
    } catch (cause) {
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
      capabilities: connection.capabilities as unknown as Record<string, unknown>,
    };
  }

  /** One prompt turn; resolves with the stop reason. Throws on turn failure. */
  async prompt(handle: string, text: string): Promise<DevSessionPromptResponse> {
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
    // renderer doesn't show a cancelled turn as cancelled when it wasn't (mirrors prompt()).
    if (outcome._tag === 'Left') throw toError(outcome.left);
  }

  /** Kill-trees the session's process and forgets it. Idempotent. */
  async dispose(handle: string): Promise<void> {
    const state = this.sessions.get(handle);
    if (state === undefined) return;
    this.sessions.delete(handle);
    await state.cleanup();
  }

  /** Disposes every live session (app quit / flag teardown). Leak-free. */
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
    if (state === undefined) throw new Error(`No dev-console session '${handle}'`);
    return state;
  }
}
