import { randomUUID } from 'node:crypto';
import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type {
  ChatPermissionCloseEvent,
  ChatPermissionRequestEvent,
  ChatSessionModes,
  ChatSessionNewResponse,
  ChatSessionPromptResponse,
  ChatSessionSetModeResponse,
  ChatSessionStatusEvent,
  ChatSessionUpdateEvent,
  ChatTarget,
  ChatTerminalOutputEvent,
  LaunchSpec,
  ProjectPermissionPolicy,
  SessionEvent,
  SessionStatus,
} from '@srgnt/contracts';
import { deriveSessionTitle } from '@srgnt/contracts';
import type { AcpAgentConnection, ClientPorts, SupervisorEvent } from '@srgnt/harness';
import { createPermissionEngine, createProjectPolicyHook } from '@srgnt/runtime';
import { Effect } from 'effect';
import { createChatClientServices, type ChatClientServices } from './client-services.js';
import { createChatPermissionHost, type ChatPermissionHost } from './permissions.js';

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
 * Persistent since STEP-24-03: a session that resolved a project writes every
 * prompt, streamed update, permission decision and stop through to its
 * `events.jsonl`, and its lifecycle status to `meta.json`. A session with no
 * project (no workspace root, headless test) stays memory-only, as in Phase 23.
 *
 * Every session gets its own supervised process so a kill-tree on dispose can
 * never orphan a child. ponytail: per-session `Supervisor` kept rather than the
 * one-shared-Supervisor the Execution Brief sketched — this map plus `dispose`/
 * `disposeAll` already IS the registry a shared supervisor would provide, and
 * handles are independent either way. Revisit if STEP-24-05 needs one central
 * `idleTimeoutMs`.
 *
 * Unlike the dev console (which keeps auto-approve — it is a raw dev harness,
 * clearly labeled), chat sessions get the real default-ask permission engine:
 * see `./permissions.ts`. That is also what makes `fs/write_text_file` exist at
 * all, since the client services only expose it when a write authorizer is
 * injected.
 */

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
  /**
   * Subscribes to the supervisor's process lifecycle for this session, so the
   * controller can push a crash surface to the renderer (STEP-23-04). Optional:
   * an in-process test connection has no supervised process at all.
   *
   * Subscription happens *after* `connect` resolved, so the `spawning`/`ready`
   * pair of the initial launch is deliberately not observed — by then the
   * renderer already knows the session opened. What matters here is what comes
   * later: `crashed`, `gave-up`, `exited`.
   */
  readonly onSupervisorEvent?: (listener: (event: SupervisorEvent) => void) => () => void;
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

/**
 * Env var an E2E test sets to make the mock replay *its* scenario instead of the
 * built-in demo. One file path, chosen per test, so scenarios stay test-local
 * and parallel-safe; unset (every real run) means nothing about the app changes.
 */
export const MOCK_SCENARIO_ENV = 'SRGNT_MOCK_SCENARIO';

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
 * It remains the *default*; STEP-23-05 added {@link MOCK_SCENARIO_ENV} so an
 * E2E test can replace it per test without touching this script.
 */
export const MOCK_DEMO_SCENARIO = {
  name: 'chat-demo',
  sessionId: 'mock-chat-session',
  stopReason: 'end_turn',
  // Advertised session modes, so the composer's mode selector (STEP-23-04) is
  // reachable by hand. These mirror Pi's thinking levels — the spike measured
  // that Pi exposes exactly this as ACP session modes.
  initialize: { modes: ['off', 'low', 'medium', 'high', 'xhigh'] },
  directives: [
    // Advertised first so the slash menu has something in it before the user
    // types. Pi advertises mid-session, which this also exercises: the menu is
    // populated by a `session/update`, never by hardcoded UI.
    {
      type: 'advertise_commands',
      commands: [
        { name: 'review', description: 'Review the working tree' },
        { name: 'test', description: 'Run the test suite' },
        { name: 'explain', description: 'Explain the current file' },
      ],
    },
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
    // Blocks the turn on a real `session/request_permission` so a manual
    // `pnpm dev` run exercises the prompt by hand. Pi cannot: it self-approves
    // and sends this zero times (DEC-0018 probe 1), so the mock is the ONLY way
    // to see this path outside a test.
    {
      type: 'request_permission',
      toolCallId: 'demo-2',
      title: 'Edit answer.ts',
      options: [
        { optionId: 'allow-once', name: 'Allow once', kind: 'allow_once' },
        { optionId: 'allow-always', name: 'Always allow this file', kind: 'allow_always' },
        { optionId: 'reject-once', name: 'Refuse', kind: 'reject_once' },
      ],
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

let cachedDefaultScenarioPath: string | undefined;

/** Writes {@link MOCK_DEMO_SCENARIO} once per process and reuses the path. */
function defaultScenarioPath(): string {
  if (cachedDefaultScenarioPath === undefined) {
    cachedDefaultScenarioPath = join(mkdtempSync(join(tmpdir(), 'srgnt-chat-mock-')), 'scenario.json');
    writeFileSync(cachedDefaultScenarioPath, JSON.stringify(MOCK_DEMO_SCENARIO));
  }
  return cachedDefaultScenarioPath;
}

/**
 * Resolves which scenario file the mock replays. The override is checked for
 * existence *here* rather than left to the spawned bin: a missing file would
 * otherwise surface as a mock process that exits 2 during `connect`, i.e. a
 * restart storm and an opaque "agent died" instead of a readable session error.
 *
 * Exported for unit tests — the whole injection seam is this one decision.
 */
export function resolveMockScenarioPath(
  override: string | undefined = process.env[MOCK_SCENARIO_ENV],
): string {
  if (override === undefined || override === '') return defaultScenarioPath();
  // `statSync`, not `existsSync`: a directory or an unreadable path exists but
  // still makes the spawned bin exit 2, which is the opaque restart storm this
  // check exists to prevent.
  let stat;
  try {
    stat = statSync(override);
  } catch (cause) {
    throw new Error(
      `${MOCK_SCENARIO_ENV} points at an unreadable path: ${override} (${cause instanceof Error ? cause.message : String(cause)})`,
    );
  }
  if (!stat.isFile()) {
    throw new Error(`${MOCK_SCENARIO_ENV} must point at a file, not a directory: ${override}`);
  }
  return override;
}

/**
 * LaunchSpec for the built mock agent, resolved from the installed
 * `@srgnt/harness` package so it works both in `pnpm dev` and a packaged app.
 * `ELECTRON_RUN_AS_NODE=1` makes Electron's own binary run the bin as plain
 * Node (in a Node/vitest process it is a harmless no-op).
 *
 * `--assertions` lands next to the scenario so an E2E driver can read the mock's
 * own `expect_*` failures back out of the spawned process; for the built-in demo
 * that is a throwaway file in a temp dir nobody looks at.
 */
function mockLaunchSpec(): LaunchSpec {
  const harnessEntry = require.resolve('@srgnt/harness');
  const binPath = join(harnessEntry, '..', 'testing', 'mock-agent', 'bin.js');
  const scenarioPath = resolveMockScenarioPath();
  return {
    command: process.execPath,
    args: [
      binPath,
      '--scenario',
      scenarioPath,
      '--assertions',
      join(dirname(scenarioPath), 'mock-assertions.json'),
    ],
    env: { ELECTRON_RUN_AS_NODE: '1' },
  };
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
    onSupervisorEvent: (listener) =>
      // The supervisor is per-session (one handle), so no id filtering is needed.
      supervisor.onEvent(listener),
    cleanup: async () => {
      connection.close();
      await supervisor.dispose(handleId);
    },
  };
};

/**
 * The slice of `SessionStore` this controller writes through (STEP-24-03). A
 * structural type, not the class: the controller must stay constructible in a
 * unit test with a two-method fake, and it has no business calling `merge` or
 * `listSessions`.
 */
export interface ChatSessionPersistence {
  createSession(meta: {
    id: string;
    projectId: string;
    harnessId: string;
    status: SessionStatus;
    acpSessionId?: string;
    title?: string;
    createdAt: string;
  }): Promise<unknown>;
  appendEvent(
    ref: { projectId: string; sessionId: string },
    kind: string,
    payload?: unknown,
    protocolVersion?: number,
  ): Promise<unknown>;
  updateMeta(
    ref: { projectId: string; sessionId: string },
    patch: { status?: SessionStatus; title?: string },
  ): Promise<unknown>;
  closeSession(ref: { projectId: string; sessionId: string }): Promise<void>;
}

interface SessionState {
  readonly connection: AcpAgentConnection;
  readonly cleanup: () => Promise<void>;
  readonly acpSessionId: string;
  readonly pump: Promise<void>;
  readonly services: ChatClientServices;
  readonly permissions: ChatPermissionHost;
  /**
   * In-memory audit stream — the sink used ONLY when the session has no project
   * to persist under (no workspace root yet, or a headless test). A persisted
   * session writes to `events.jsonl` instead; the two are never both filled, so
   * there is exactly one audit truth per session.
   */
  readonly events: SessionEvent[];
  /** Writes one envelope to whichever sink this session has. */
  readonly append: (kind: string, payload: Record<string, unknown>) => void;
  /** Where the session persists, or `undefined` when it is memory-only. */
  readonly persistRef: { projectId: string; sessionId: string } | undefined;
  readonly harnessId: string;
  /** Serializes `meta.json` read-modify-writes for this session. */
  metaChain: Promise<void>;
  /** Set once the first prompt titled the session; a later prompt never retitles. */
  titled: boolean;
  /**
   * Mode ids the agent advertised at `session/new`. Empty when it advertised
   * none, which also means "reject every set-mode" — an agent with no modes has
   * no mode to switch to.
   */
  readonly modeIds: ReadonlySet<string>;
  /** Unsubscribes the supervisor listener on dispose. */
  readonly unsubscribeStatus: () => void;
}

/**
 * The project a session is being opened under (STEP-24-02). Resolved by the IPC
 * layer, which owns the `ProjectStore` — the controller stays a pure ACP driver
 * and never touches project storage itself.
 */
export interface ChatSessionProject {
  readonly projectId?: string;
  /** The project's `rootDir`; becomes the session cwd and the path-guard root. */
  readonly cwd?: string;
  /** Per-project standing permission answers, or absent for pure default-ask. */
  readonly permissionPolicy?: ProjectPermissionPolicy;
}

export interface ChatSessionControllerOptions {
  /** Opens agent connections. Defaults to the real supervisor-backed connector. */
  readonly connect?: ChatConnectFn;
  /** Receives every streamed `session/update`, keyed by the chat handle id. */
  readonly onUpdate: (event: ChatSessionUpdateEvent) => void;
  /** Receives output chunks from client-created terminals, keyed by chat handle. */
  readonly onTerminalOutput?: (event: ChatTerminalOutputEvent) => void;
  /** Receives agent *process* lifecycle transitions (the crash surface). */
  readonly onStatus?: (event: ChatSessionStatusEvent) => void;
  /**
   * Pushes a permission prompt to the renderer. MUST return `false` when there
   * is no live window — an undeliverable prompt is answered `cancelled` rather
   * than left blocking the agent. Absent entirely (tests, headless): same thing.
   */
  readonly onPermissionRequest?: (event: ChatPermissionRequestEvent) => boolean;
  /** Tells the renderer to dismiss a prompt the main process already resolved. */
  readonly onPermissionClose?: (event: ChatPermissionCloseEvent) => void;
  /** Working directory for `session/new`. Defaults to the OS temp dir. */
  readonly getCwd?: () => string | undefined;
  /** Builds the client services for a session. Injected in tests. */
  readonly createClientServices?: typeof createChatClientServices;
  /** Permission prompt deadline. Injected in tests. */
  readonly permissionDeadlineMs?: number;
  /**
   * The disk sink for session events and metadata (STEP-24-03). Read per call
   * rather than held, because the store is rebuilt whenever the workspace root
   * changes — a captured one would keep writing into the workspace the user
   * left. Returning `undefined` (no root yet, headless test) makes sessions
   * memory-only, exactly as in Phase 23.
   */
  readonly getStore?: () => ChatSessionPersistence | undefined;
}

/**
 * Maps one `SupervisorEvent` onto the renderer-facing status push
 * (STEP-23-04). Exported for direct unit testing — the crash surface is the
 * hardest path to reproduce by hand, so its mapping must be provable without a
 * dying process.
 *
 * `reaped` is not in the union we push: it means *we* killed the process (End
 * session / idle reap), which the renderer already knows about and must never
 * see as a failure banner.
 *
 * `gave-up` carries no `ExitInfo` of its own — it always follows the `crashed`
 * event that exhausted the restart budget — so the caller threads the last
 * crash's stderr tail through `lastStderrTail`.
 */
export function supervisorEventToStatus(
  sessionId: string,
  event: SupervisorEvent,
  lastStderrTail: string,
): ChatSessionStatusEvent | null {
  switch (event.kind) {
    case 'spawning':
      return { sessionId, status: 'spawning' };
    case 'ready':
      return { sessionId, status: 'ready' };
    case 'crashed':
      return {
        sessionId,
        status: 'crashed',
        stderrTail: event.info.stderrTail,
        exitCode: event.info.code,
        message:
          event.info.signal !== null
            ? `Agent process died on ${event.info.signal}`
            : `Agent process exited with code ${String(event.info.code)}`,
      };
    case 'gave-up':
      return {
        sessionId,
        status: 'gave-up',
        ...(lastStderrTail !== '' ? { stderrTail: lastStderrTail } : {}),
        message: `Agent kept crashing and was not restarted (${event.restarts} attempts)`,
      };
    case 'exited':
      // Only a *clean* self-exit reaches here: the supervisor routes reaped and
      // crashed exits to their own events.
      return {
        sessionId,
        status: 'exited',
        exitCode: event.info.code,
        message: 'Agent process exited',
      };
    default:
      return null;
  }
}

/**
 * Reads the `modes` block off a `session/new` response, tolerantly (ARCH-0009):
 * an agent that advertises nothing, or advertises something malformed, yields
 * `undefined` — which the renderer reads as "no mode selector at all" rather
 * than as an empty broken dropdown.
 */
/** Exported for tests: the agent controls this payload, so it is parsed defensively. */
export function readModes(response: unknown): ChatSessionModes | undefined {
  const modes = (response as { modes?: unknown })?.modes;
  if (typeof modes !== 'object' || modes === null) return undefined;
  const { currentModeId, availableModes } = modes as {
    currentModeId?: unknown;
    availableModes?: unknown;
  };
  if (typeof currentModeId !== 'string' || !Array.isArray(availableModes)) return undefined;
  const parsed = availableModes.flatMap((mode) => {
    const { id, name } = (mode ?? {}) as { id?: unknown; name?: unknown };
    if (typeof id !== 'string' || id === '') return [];
    return [{ id, name: typeof name === 'string' && name !== '' ? name : id }];
  });
  if (parsed.length === 0) return undefined;
  // An agent that names a current mode outside its own list would leave the
  // renderer's controlled <select> with no matching option, rendering blank.
  // Fall back to the first advertised mode rather than showing nothing.
  const current = parsed.some((mode) => mode.id === currentModeId) ? currentModeId : parsed[0]!.id;
  return { currentModeId: current, availableModes: parsed };
}

function toError(cause: unknown): Error {
  if (cause instanceof Error) return cause;
  if (cause !== null && typeof cause === 'object' && 'message' in cause) {
    return new Error(String((cause as { message: unknown }).message));
  }
  return new Error(String(cause));
}

/**
 * Drives ACP sessions for the chat surface, several at a time. Handles are
 * srgnt session ids (UUIDs, not ACP session ids) so repeated mock sessions —
 * which return one fixed ACP session id — never collide, so the renderer can
 * route pushed frames by a handle it owns, and so the id can name the session's
 * directory on disk.
 */
export class ChatSessionController {
  private readonly sessions = new Map<string, SessionState>();
  private readonly connect: ChatConnectFn;

  constructor(private readonly options: ChatSessionControllerOptions) {
    this.connect = options.connect ?? defaultChatConnect;
  }

  /** initialize → session/new; starts streaming updates. Returns a chat handle. */
  async newSession(target: ChatTarget, project: ChatSessionProject = {}): Promise<ChatSessionNewResponse> {
    // A UUID, not a counter: the handle is now also the on-disk directory name
    // and survives restarts, so it has to be unique across processes, not just
    // within one. (The mock returns a fixed ACP session id for every session —
    // that id can never be the srgnt id.)
    const handle = randomUUID();
    // The cwd must be known *before* connecting: client services are confined to
    // it, and their presence is what `initialize` advertises as capabilities.
    //
    // The project's `rootDir` wins when the caller resolved one (STEP-24-02) —
    // that is what makes switching projects change where the agent can reach.
    // With no workspace and no project, the fallback is a fresh scratch directory
    // rather than `tmpdir()` itself: the cwd IS the containment boundary for
    // `fs/*` and `terminal/*`, and the shared system temp holds every other
    // process's temp files, including short-lived credential and token files.
    const cwd =
      project.cwd ?? this.options.getCwd?.() ?? mkdtempSync(join(tmpdir(), 'srgnt-chat-session-'));

    // One audit stream per session. A session that resolved a project persists
    // to `projects/<id>/sessions/<handle>/events.jsonl` — the sink swap Phase 23
    // planned for; one with no project (no workspace root, headless test) falls
    // back to the in-memory array. `protocolVersion` is read lazily: the stream
    // exists before `connect` (client services need it) but nothing appends to
    // it until the connection is up.
    const store = this.options.getStore?.();
    const persistRef =
      store !== undefined && project.projectId !== undefined
        ? { projectId: project.projectId, sessionId: handle }
        : undefined;
    const events: SessionEvent[] = [];
    let protocolVersion = 0;
    const append = (kind: string, payload: Record<string, unknown>): void => {
      if (persistRef === undefined) {
        events.push({ seq: events.length, ts: new Date().toISOString(), protocolVersion, kind, payload });
        return;
      }
      // Fire-and-forget: the store already serializes appends per session (one
      // chain per events.jsonl), so ordering holds without awaiting here — and
      // awaiting would put a disk write in the path of every streamed chunk.
      void store!
        .appendEvent(persistRef, kind, payload, protocolVersion)
        .catch((error: unknown) => {
          console.error(`[chat] could not persist ${kind} for session ${handle}:`, error);
        });
    };

    const permissions = createChatPermissionHost({
      sessionId: handle,
      // The project's stored policy fills the engine's project-policy hook, which
      // STEP-23-03 shipped as a permanent fall-through. With no policy the engine
      // is built exactly as before: default-ask, nothing pre-answered.
      ...(project.permissionPolicy !== undefined
        ? { engine: createPermissionEngine({ projectPolicy: createProjectPolicyHook(project.permissionPolicy) }) }
        : {}),
      onRequest: (event) => this.options.onPermissionRequest?.(event) ?? false,
      onClose: (requestId, reason) =>
        this.options.onPermissionClose?.({ sessionId: handle, requestId, reason }),
      onAudit: append,
      ...(this.options.permissionDeadlineMs !== undefined
        ? { deadlineMs: this.options.permissionDeadlineMs }
        : {}),
    });

    const services = (this.options.createClientServices ?? createChatClientServices)({
      sessionRoot: cwd,
      onTerminalOutput: (terminalId, chunk) =>
        this.options.onTerminalOutput?.({ sessionId: handle, terminalId, chunk }),
      onAudit: (event) => append(event.kind, event.payload),
      // This single option is what makes `fs/write_text_file` exist: the harness
      // advertises the write capability from the method's presence, and the
      // method only appears when there is something to authorize the write.
      authorizeWrite: (path) => permissions.authorizeWrite(path),
    });
    let connected;
    try {
      connected = await this.connect(target, {
        permission: permissions.port,
        fs: services.fs,
        terminal: services.terminal,
      });
    } catch (cause) {
      // `connect` can fail before any process exists (a bad scenario override
      // throws while building the LaunchSpec). The services already own a temp
      // cwd and can own terminals, so they have to be released here — the
      // session/new path below does the same for a failure one step later.
      services.disposeAll();
      throw toError(cause);
    }
    const { connection, harness, cleanup, onSupervisorEvent } = connected;
    protocolVersion = Number(connection.capabilities.protocolVersion ?? 0);
    // `gave-up` reports only a restart count, so the tail of the crash that
    // exhausted the budget is remembered here and threaded into it.
    let lastStderrTail = '';
    const unsubscribeStatus =
      onSupervisorEvent?.((event) => {
        if (event.kind === 'crashed') lastStderrTail = event.info.stderrTail;
        const status = supervisorEventToStatus(handle, event, lastStderrTail);
        if (status === null) return;
        append('client/agent_status', { ...status });
        // The persisted vocabulary is `SSessionStatus`, which has no process
        // states: a dead agent is an `error` session, a clean self-exit leaves
        // the session `idle` (reopenable), and spawning/ready are transport
        // detail the list must never show as a lifecycle state.
        if (status.status === 'crashed' || status.status === 'gave-up') {
          this.persistMeta(handle, { status: 'error' });
        }
        this.options.onStatus?.(status);
        // A dead agent cannot answer anything it is still blocked on. Releasing
        // here (rather than waiting for dispose) is what keeps a crash from
        // leaving a permission prompt on screen with nobody listening.
        if (status.status !== 'spawning' && status.status !== 'ready') {
          permissions.cancelAll('cancelled');
        }
      }) ?? (() => {});
    let acpSessionId: string;
    let modes: ChatSessionModes | undefined;
    try {
      const result = await Effect.runPromise(connection.newSession({ cwd, mcpServers: [] }));
      acpSessionId = result.sessionId;
      modes = readModes(result);
    } catch (cause) {
      unsubscribeStatus();
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
          // Persisted verbatim, then pushed. Reopening the session replays these
          // payloads through the renderer's transcript reducer — the same
          // reducer the live push feeds — so disk and live render identically.
          append('acp/session_update', update as Record<string, unknown>);
          this.options.onUpdate({ sessionId: handle, update });
        }
      } catch {
        /* the iterator ends when the connection closes; not an error here */
      }
    })();
    this.sessions.set(handle, {
      connection,
      cleanup,
      acpSessionId,
      pump,
      services,
      permissions,
      events,
      append,
      persistRef,
      harnessId: harness.id,
      metaChain: Promise.resolve(),
      titled: false,
      modeIds: new Set(modes?.availableModes.map((mode) => mode.id) ?? []),
      unsubscribeStatus,
    });
    if (persistRef !== undefined) {
      // Written only now that the identity is settled: before `session/new`
      // there is no `acpSessionId` and a failed connect would have left a
      // listable session that never existed. `idle` is the honest opening
      // status — connected, no turn in flight.
      this.chainMeta(handle, async (persistence) => {
        await persistence.createSession({
          id: handle,
          projectId: persistRef.projectId,
          harnessId: harness.id,
          status: 'idle',
          acpSessionId,
          createdAt: new Date().toISOString(),
        });
      });
    }
    append('client/session_created', {
      target,
      harnessId: harness.id,
      cwd,
      ...(project.projectId !== undefined ? { projectId: project.projectId } : {}),
    });
    return {
      sessionId: handle,
      target,
      ...(project.projectId !== undefined ? { projectId: project.projectId } : {}),
      harnessId: harness.id,
      harnessName: harness.name,
      quirks: [...harness.quirks],
      capabilities: connection.capabilities as unknown as Record<string, unknown>,
      ...(modes !== undefined ? { modes } : {}),
    };
  }

  /**
   * `session/set_mode`. An unknown `modeId` is rejected *here*, before any ACP
   * call: agents differ wildly in how they handle a bogus mode (Pi's adapter
   * would happily take one), and a silent no-op would leave the selector showing
   * a mode the agent is not in.
   */
  async setMode(handle: string, modeId: string): Promise<ChatSessionSetModeResponse> {
    const state = this.require(handle);
    if (!state.modeIds.has(modeId)) {
      throw new Error(`Unknown session mode '${modeId}'`);
    }
    const outcome = await Effect.runPromise(
      Effect.either(state.connection.setMode({ sessionId: state.acpSessionId, modeId })),
    );
    if (outcome._tag === 'Left') throw toError(outcome.left);
    return { ok: true, currentModeId: modeId };
  }

  /** One prompt turn; resolves with the stop reason. Throws on turn failure. */
  async prompt(handle: string, text: string): Promise<ChatSessionPromptResponse> {
    const state = this.require(handle);
    state.append('client/prompt', { text });
    // The FIRST prompt names the session, and only the first: `titled` is set
    // before the derivation can fail so a second prompt never retitles even if
    // the first one had no visible text to title from.
    const title = state.titled ? undefined : deriveSessionTitle(text);
    state.titled = true;
    this.persistMeta(handle, { status: 'active', ...(title !== undefined ? { title } : {}) });
    const outcome = await Effect.runPromise(
      Effect.either(
        state.connection.prompt({
          sessionId: state.acpSessionId,
          prompt: [{ type: 'text', text }],
        }),
      ),
    );
    if (outcome._tag === 'Left') {
      const error = toError(outcome.left);
      state.append('client/stop', { stopReason: 'error', message: error.message });
      this.persistMeta(handle, { status: 'error' });
      throw error;
    }
    state.append('client/stop', { stopReason: outcome.right.stopReason });
    this.persistMeta(handle, { status: 'idle' });
    return { stopReason: outcome.right.stopReason };
  }

  /** `session/cancel` — recovers a hung turn without tearing the session down. */
  async cancel(handle: string): Promise<void> {
    const state = this.require(handle);
    const outcome = await Effect.runPromise(
      Effect.either(state.connection.cancel({ sessionId: state.acpSessionId })),
    );
    // A cancelled turn takes its pending permission prompts with it: per the ACP
    // spec the client answers outstanding requests `cancelled`. Done even when
    // the cancel notification itself failed — leaving the agent blocked on a
    // prompt the user can no longer see is strictly worse.
    state.permissions.cancelAll('cancelled');
    // Surface transport/JSON-RPC failures instead of silently succeeding, so the
    // renderer doesn't show a cancelled turn as cancelled when it wasn't.
    if (outcome._tag === 'Left') throw toError(outcome.left);
  }

  /** Routes a renderer permission answer. Unknown ids are ignored, never thrown. */
  respondToPermission(handle: string, requestId: string, optionId: string | undefined): void {
    // Not `require`: a response racing session disposal is normal, not an error.
    this.sessions.get(handle)?.permissions.respond(requestId, optionId);
  }

  /**
   * The session's audit stream, for sessions with no project to persist under.
   * A persisted session writes to `events.jsonl` and returns `[]` here — read
   * it back through the store (`chat:session:open`), which is the one truth.
   */
  sessionEvents(handle: string): readonly SessionEvent[] {
    return this.sessions.get(handle)?.events ?? [];
  }

  /** The project a live session belongs to, or `undefined` if it has none. */
  projectOf(handle: string): string | undefined {
    return this.sessions.get(handle)?.persistRef?.projectId;
  }

  /** Kill-trees the session's process and forgets it. Idempotent. */
  async dispose(handle: string): Promise<void> {
    const state = this.sessions.get(handle);
    if (state === undefined) return;
    // Closing the record before the map entry is dropped: `chainMeta` resolves
    // its ref through the live session, so a `closed` write queued after the
    // delete would find nothing to write to.
    state.append('client/session_closed', {});
    this.persistMeta(handle, { status: 'closed' });
    const persistRef = state.persistRef;
    const metaChain = state.metaChain;
    const store = this.options.getStore?.();
    this.sessions.delete(handle);
    // Before the kill-tree: the reap would otherwise be reported as a status
    // transition for a session the renderer has already forgotten.
    state.unsubscribeStatus();
    // Release anything the agent is still blocked on before killing it, and drop
    // the session's remembered `*_always` answers — memory is per-session and
    // must die with it.
    state.permissions.cancelAll('disposed');
    // Client terminals are children of *this* process, not of the agent, so the
    // supervisor's kill-tree cannot reach them: kill them explicitly first.
    state.services.disposeAll();
    await state.cleanup();
    if (persistRef !== undefined) {
      // Last, and only after `cleanup` ended the pump: closing the log while
      // updates were still streaming would refuse the tail of the session.
      await metaChain.catch(() => {});
      await store?.closeSession(persistRef).catch((error: unknown) => {
        console.error(`[chat] could not close the event log for session ${handle}:`, error);
      });
    }
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

  /**
   * Runs one `meta.json` mutation on the session's own chain.
   *
   * `updateMeta` is a read-modify-write, so two overlapping calls (a supervisor
   * crash landing while a turn's `idle` write is in flight) could each read the
   * pre-state and the later write would drop the earlier one's field. One chain
   * per session serializes them; different sessions still write in parallel.
   */
  private chainMeta(
    handle: string,
    write: (persistence: ChatSessionPersistence, ref: { projectId: string; sessionId: string }) => Promise<void>,
  ): void {
    const state = this.sessions.get(handle);
    const store = this.options.getStore?.();
    if (state?.persistRef === undefined || store === undefined) return;
    const ref = state.persistRef;
    state.metaChain = state.metaChain.then(
      () =>
        write(store, ref).catch((error: unknown) => {
          console.error(`[chat] could not persist session meta for ${handle}:`, error);
        }),
      () => {},
    );
  }

  /** Persists a status (and, on the first prompt, the derived title). */
  private persistMeta(handle: string, patch: { status?: SessionStatus; title?: string }): void {
    this.chainMeta(handle, async (persistence, ref) => {
      await persistence.updateMeta(ref, patch);
    });
  }

  /** Waits for every in-flight metadata write. Tests and quit only. */
  async flushMeta(): Promise<void> {
    await Promise.all([...this.sessions.values()].map((state) => state.metaChain));
  }
}
