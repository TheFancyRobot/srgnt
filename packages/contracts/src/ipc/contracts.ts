import { Schema } from "effect";
import { PositiveInt } from '../shared-schemas.js';
import { SLaunchContext } from '../entities/launch.js';
import { SAuthMethod, SHarnessDefinition, SHarnessQuirk } from '../harness.js';
import { SProject, SProjectPermissionPolicy } from '../project.js';
import { SSession, SSessionEvent } from '../session.js';

export const ipcChannels = {
  appGetVersion: 'app:get-version',
  appGetUserDataPath: 'app:get-user-data-path',
  appCheckForUpdates: 'app:check-for-updates',
  workspaceGetRoot: 'workspace:get-root',
  workspaceSetRoot: 'workspace:set-root',
  workspaceChooseRoot: 'workspace:choose-root',
  workspaceCreateDefaultRoot: 'workspace:create-default-root',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  terminalSpawn: 'terminal:spawn',
  terminalWrite: 'terminal:write',
  terminalResize: 'terminal:resize',
  terminalClose: 'terminal:close',
  terminalList: 'terminal:list',
  terminalLaunchWithContext: 'terminal:launch-with-context',
  launchApprovalRequired: 'launch:approval-required',
  launchApprovalResolve: 'launch:approval-resolve',
  crashWriteTestLog: 'crash:write-test-log',
  notesListDir: 'notes:list-dir',
  notesReadFile: 'notes:read-file',
  notesWriteFile: 'notes:write-file',
  notesCreateFile: 'notes:create-file',
  notesCreateFolder: 'notes:create-folder',
  notesDelete: 'notes:delete',
  notesRename: 'notes:rename',
  notesSearch: 'notes:search',
  notesResolveWikilink: 'notes:resolve-wikilink',
  notesListWorkspaceMarkdown: 'notes:list-workspace-markdown',
  shellOpenExternal: 'shell:open-external',
  semanticSearchInit: 'semantic-search:init',
  semanticSearchEnableForWorkspace: 'semantic-search:enable-for-workspace',
  semanticSearchIndexWorkspace: 'semantic-search:index-workspace',
  semanticSearchRebuildAll: 'semantic-search:rebuild-all',
  semanticSearchSearch: 'semantic-search:search',
  semanticSearchStatus: 'semantic-search:status',
  // Flag-gated (SRGNT_DEV_CONSOLE=1) raw ACP dev console. Ephemeral, dev-only;
  // the operational channels below are only registered when the flag is set,
  // while `devConsoleEnabled` is always registered so the renderer can gate its
  // own visibility. See packages/desktop/src/main/dev-console.
  devConsoleEnabled: 'dev:console:enabled',
  devSessionNew: 'dev:session:new',
  devSessionPrompt: 'dev:session:prompt',
  devSessionCancel: 'dev:session:cancel',
  devSessionDispose: 'dev:session:dispose',
  // Main→renderer push channel for streamed session/update frames.
  devSessionUpdate: 'dev:session:update',
  // Product chat surface over ephemeral ACP sessions (PHASE-23). Unlike the
  // dev console these are always registered — this is the shipped product path.
  // See packages/desktop/src/main/chat.
  chatSessionNew: 'chat:session:new',
  chatSessionPrompt: 'chat:session:prompt',
  chatSessionCancel: 'chat:session:cancel',
  chatSessionDispose: 'chat:session:dispose',
  // Session modes (STEP-23-04). For Pi this is the thinking-level control; for
  // any agent it is `session/set_mode`. Agents that advertise no modes get no
  // selector at all — the surface is capability-driven, never hardcoded.
  chatSessionSetMode: 'chat:session:set-mode',
  // Persisted sessions (PHASE-24, STEP-24-03). `list` reads `meta.json` only —
  // no event log is touched, so a project with 50 sessions costs 50 tiny reads
  // and spawns nothing. `open` returns the persisted event stream so a session
  // renders instantly from disk, still without spawning an agent.
  chatSessionList: 'chat:session:list',
  chatSessionOpen: 'chat:session:open',
  // Honest resume (STEP-24-04). `reconnect` is the LAZY half of "UI-open ≠
  // process-running": reopening still spawns nothing, and only the first prompt
  // on a reopened session asks main to put an agent behind it — transparently
  // via `session/resume`/`session/load` when the harness genuinely supports it,
  // read-only + fork when it does not. `fork` is the one and only continue path
  // for a read-only session; it never re-primes context behind the user's back.
  chatSessionReconnect: 'chat:session:reconnect',
  chatSessionFork: 'chat:session:fork',
  // Main→renderer push channel for streamed session/update frames.
  chatSessionUpdate: 'chat:session:update',
  // Main→renderer push channel for agent *process* lifecycle (STEP-23-04). This
  // is the crash surface: supervisor events, not ACP frames.
  chatSessionStatus: 'chat:session:status',
  // Main→renderer push channel for output of terminals the *agent* created via
  // the client `terminal/*` services, so a tool card can embed them live.
  chatTerminalOutput: 'chat:terminal:output',
  // Permission round-trip (STEP-23-03). `request` is pushed main→renderer when
  // the engine resolves to `ask`; `respond` carries the user's choice back;
  // `close` is pushed when main resolved the request WITHOUT the renderer (turn
  // cancel, deadline expiry, session dispose) so the prompt cannot linger.
  chatPermissionRequest: 'chat:permission:request',
  chatPermissionRespond: 'chat:permission:respond',
  chatPermissionClose: 'chat:permission:close',
  // Projects (PHASE-24, STEP-24-02). "Project = directory": the user never
  // creates one explicitly, `project:ensure` materializes it for a directory and
  // is idempotent, so the switcher's "add" affordance and the session-creation
  // path are the same call. Deletion is deliberately absent (merge only).
  projectList: 'project:list',
  projectEnsure: 'project:ensure',
  projectRename: 'project:rename',
  projectMerge: 'project:merge',
  projectSetDefaults: 'project:set-defaults',
  // Harness configuration (PHASE-25, STEP-25-02). `list` is the read side —
  // merged registry + per-definition detection + the `harnesses.json` load
  // result. `save-override`/`reset-override` are the ONLY writers the product
  // has: they canonicalize against the base definition, refuse to run against a
  // `harnesses.json` they could not read, and never store a secret literal.
  harnessList: 'harness:list',
  harnessSaveOverride: 'harness:save-override',
  harnessResetOverride: 'harness:reset-override',
  // Last-negotiated capabilities (PHASE-25, STEP-25-03). A channel of its own,
  // NOT an extension of `harness:list`: list answers "what is configured, and
  // does it detect?" and refreshes on save/probe, while this answers "what did
  // we measure?" and refreshes when a session connects. One shape, read-only.
  harnessCapabilities: 'harness:capabilities',
} as const;

type IpcChannelValue = (typeof ipcChannels)[keyof typeof ipcChannels];
export const ipcChannelValues = Object.values(ipcChannels) as [IpcChannelValue, ...IpcChannelValue[]];

const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export const SIpcChannel = Schema.Literal(
  ...ipcChannelValues
);
export type IpcChannel = Schema.Schema.Type<typeof SIpcChannel>;

export const SIpcRequest = Schema.Struct({
  channel: SIpcChannel,
  payload: Schema.optional(Schema.Unknown),
  requestId: Schema.String,
});
export type IpcRequest = Schema.Schema.Type<typeof SIpcRequest>;

export const SIpcResponse = Schema.Struct({
  requestId: Schema.String,
  success: Schema.Boolean,
  data: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.String),
});
export type IpcResponse = Schema.Schema.Type<typeof SIpcResponse>;

export const SAppVersionResponse = Schema.Struct({
  version: Schema.String,
});
export type AppVersionResponse = Schema.Schema.Type<typeof SAppVersionResponse>;

export const SUserDataPathResponse = Schema.Struct({
  path: Schema.String,
});
export type UserDataPathResponse = Schema.Schema.Type<typeof SUserDataPathResponse>;

export const SDesktopTheme = Schema.Literal('system', 'light', 'dark');
export type DesktopTheme = Schema.Schema.Type<typeof SDesktopTheme>;

export const SUpdateChannel = Schema.Literal('stable', 'beta', 'nightly');
export type UpdateChannel = Schema.Schema.Type<typeof SUpdateChannel>;

export const SLayoutPreferences = Schema.Struct({
  sidebarWidth: Schema.Number,
  sidebarCollapsed: Schema.Boolean,
});
export type LayoutPreferences = Schema.Schema.Type<typeof SLayoutPreferences>;

export const SDesktopSettings = Schema.Struct({
  theme: SDesktopTheme,
  updateChannel: SUpdateChannel,
  telemetryEnabled: Schema.Boolean,
  crashReportsEnabled: Schema.Boolean,
  debugMode: Schema.Boolean,
  maxConcurrentRuns: Schema.Literal('1', '3', '5'),
  layout: Schema.optionalWith(SLayoutPreferences, {
    default: () => ({ sidebarWidth: 240, sidebarCollapsed: false }),
  }),
});
export type DesktopSettings = Schema.Schema.Type<typeof SDesktopSettings>;

export const SDesktopSettingsResponse = Schema.Struct({
  workspaceRoot: Schema.String,
  settings: SDesktopSettings,
});
export type DesktopSettingsResponse = Schema.Schema.Type<typeof SDesktopSettingsResponse>;

export const SUpdateCheckResponse = Schema.Struct({
  status: Schema.Literal('available', 'not-available', 'error', 'skipped'),
  channel: SUpdateChannel,
  checkedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
  message: Schema.String,
  version: Schema.optional(Schema.String),
});
export type UpdateCheckResponse = Schema.Schema.Type<typeof SUpdateCheckResponse>;

export const STerminalSpawnRequest = Schema.Struct({
  rows: Schema.optionalWith(PositiveInt, { default: () => 24 }),
  cols: Schema.optionalWith(PositiveInt, { default: () => 80 }),
});
export type TerminalSpawnRequest = Schema.Schema.Type<typeof STerminalSpawnRequest>;

export const STerminalSpawnResponse = Schema.Struct({
  sessionId: Schema.String,
  pid: Schema.Number,
});
export type TerminalSpawnResponse = Schema.Schema.Type<typeof STerminalSpawnResponse>;

export const STerminalWriteRequest = Schema.Struct({
  sessionId: Schema.String,
  data: Schema.String,
});
export type TerminalWriteRequest = Schema.Schema.Type<typeof STerminalWriteRequest>;

export const STerminalResizeRequest = Schema.Struct({
  sessionId: Schema.String,
  rows: Schema.Number.pipe(Schema.int(), Schema.positive()),
  cols: Schema.Number.pipe(Schema.int(), Schema.positive()),
});
export type TerminalResizeRequest = Schema.Schema.Type<typeof STerminalResizeRequest>;

export const STerminalCloseRequest = Schema.Struct({
  sessionId: Schema.String,
});
export type TerminalCloseRequest = Schema.Schema.Type<typeof STerminalCloseRequest>;

export const STerminalListEntry = Schema.Struct({
  id: Schema.String,
  pid: Schema.Number,
  isActive: Schema.Boolean,
  startedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});

export const STerminalListResponse = Schema.Struct({
  sessions: Schema.Array(STerminalListEntry),
});
export type TerminalListResponse = Schema.Schema.Type<typeof STerminalListResponse>;

export const STerminalLaunchWithContextRequest = Schema.Struct({
  launchContext: SLaunchContext,
  rows: Schema.optionalWith(PositiveInt, { default: () => 24 }),
  cols: Schema.optionalWith(PositiveInt, { default: () => 80 }),
});
export type TerminalLaunchWithContextRequest = Schema.Schema.Type<typeof STerminalLaunchWithContextRequest>;

export const STerminalLaunchWithContextResponse = Schema.Struct({
  sessionId: Schema.String,
  pid: Schema.Number,
  launchId: Schema.String,
});
export type TerminalLaunchWithContextResponse = Schema.Schema.Type<typeof STerminalLaunchWithContextResponse>;

export const SLaunchApprovalPayload = Schema.Struct({
  approvalId: Schema.String,
  launchContext: SLaunchContext,
  command: Schema.String,
  riskLevel: Schema.Literal('low', 'medium', 'high'),
  requiresApproval: Schema.Boolean,
});
export type LaunchApprovalPayload = Schema.Schema.Type<typeof SLaunchApprovalPayload>;

export const SLaunchApprovalResolveRequest = Schema.Struct({
  approvalId: Schema.String,
  approved: Schema.Boolean,
});
export type LaunchApprovalResolveRequest = Schema.Schema.Type<typeof SLaunchApprovalResolveRequest>;

export const SRedactionPolicy = Schema.Struct({
  maxOutputLength: PositiveInt,
  redactPatterns: Schema.Array(Schema.String),
  sensitiveEnvKeys: Schema.Array(Schema.String),
});
export type RedactionPolicySchema = Schema.Schema.Type<typeof SRedactionPolicy>;

// Notes IPC types

export const SNotesListDirRequest = Schema.Struct({
  dirPath: Schema.String,
});
export type NotesListDirRequest = Schema.Schema.Type<typeof SNotesListDirRequest>;

export const SNotesFileEntry = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  isDirectory: Schema.Boolean,
  modifiedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});

export const SNotesListDirResponse = Schema.Struct({
  entries: Schema.Array(SNotesFileEntry),
});
export type NotesListDirResponse = Schema.Schema.Type<typeof SNotesListDirResponse>;

export const SNotesReadFileRequest = Schema.Struct({
  filePath: Schema.String,
});
export type NotesReadFileRequest = Schema.Schema.Type<typeof SNotesReadFileRequest>;

export const SNotesReadFileResponse = Schema.Struct({
  content: Schema.String,
  modifiedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});
export type NotesReadFileResponse = Schema.Schema.Type<typeof SNotesReadFileResponse>;

export const SNotesWriteFileRequest = Schema.Struct({
  filePath: Schema.String,
  content: Schema.String,
});
export type NotesWriteFileRequest = Schema.Schema.Type<typeof SNotesWriteFileRequest>;

export const SNotesWriteFileResponse = Schema.Struct({
  path: Schema.String,
  modifiedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});
export type NotesWriteFileResponse = Schema.Schema.Type<typeof SNotesWriteFileResponse>;

export const SNotesCreateFileRequest = Schema.Struct({
  filePath: Schema.String,
  title: Schema.String,
});
export type NotesCreateFileRequest = Schema.Schema.Type<typeof SNotesCreateFileRequest>;

export const SNotesCreateFileResponse = Schema.Struct({
  path: Schema.String,
  createdAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});
export type NotesCreateFileResponse = Schema.Schema.Type<typeof SNotesCreateFileResponse>;

export const SNotesCreateFolderRequest = Schema.Struct({
  dirPath: Schema.String,
});
export type NotesCreateFolderRequest = Schema.Schema.Type<typeof SNotesCreateFolderRequest>;

export const SNotesCreateFolderResponse = Schema.Struct({
  path: Schema.String,
});
export type NotesCreateFolderResponse = Schema.Schema.Type<typeof SNotesCreateFolderResponse>;

export const SNotesDeleteRequest = Schema.Struct({
  path: Schema.String,
  isDirectory: Schema.Boolean,
});
export type NotesDeleteRequest = Schema.Schema.Type<typeof SNotesDeleteRequest>;

export const SNotesDeleteResponse = Schema.Struct({
  deleted: Schema.Boolean,
});
export type NotesDeleteResponse = Schema.Schema.Type<typeof SNotesDeleteResponse>;

export const SNotesRenameRequest = Schema.Struct({
  oldPath: Schema.String,
  newName: Schema.String,
});
export type NotesRenameRequest = Schema.Schema.Type<typeof SNotesRenameRequest>;

export const SNotesRenameResponse = Schema.Struct({
  newPath: Schema.String,
});
export type NotesRenameResponse = Schema.Schema.Type<typeof SNotesRenameResponse>;

export const SNotesSearchRequest = Schema.Struct({
  query: Schema.String,
  maxResults: Schema.optionalWith(Schema.Number, { default: () => 20 }),
});
export type NotesSearchRequest = Schema.Schema.Type<typeof SNotesSearchRequest>;

export const SNotesSearchResultEntry = Schema.Struct({
  title: Schema.String,
  path: Schema.String,
  snippet: Schema.String,
  score: Schema.Number,
});

export const SNotesSearchResponse = Schema.Struct({
  results: Schema.Array(SNotesSearchResultEntry),
});
export type NotesSearchResponse = Schema.Schema.Type<typeof SNotesSearchResponse>;

export const SNotesResolveWikilinkRequest = Schema.Struct({
  wikilink: Schema.String,
  currentFilePath: Schema.optional(Schema.String),
});
export type NotesResolveWikilinkRequest = Schema.Schema.Type<typeof SNotesResolveWikilinkRequest>;

export const SNotesResolveWikilinkResponse = Schema.Struct({
  resolved: Schema.Boolean,
  path: Schema.String,
  line: Schema.optional(Schema.Number),
});
export type NotesResolveWikilinkResponse = Schema.Schema.Type<typeof SNotesResolveWikilinkResponse>;

export const SNotesListWorkspaceMarkdownRequest = Schema.Struct({
  query: Schema.optional(Schema.String),
  maxResults: Schema.optionalWith(Schema.Number, { default: () => 20 }),
});
export type NotesListWorkspaceMarkdownRequest = Schema.Schema.Type<typeof SNotesListWorkspaceMarkdownRequest>;

export const SNotesWorkspaceMarkdownEntry = Schema.Struct({
  title: Schema.String,
  path: Schema.String,
  modifiedAt: Schema.String.pipe(Schema.pattern(datetimePattern)),
});

export const SNotesListWorkspaceMarkdownResponse = Schema.Struct({
  files: Schema.Array(SNotesWorkspaceMarkdownEntry),
});
export type NotesListWorkspaceMarkdownResponse = Schema.Schema.Type<typeof SNotesListWorkspaceMarkdownResponse>;

const openExternalUrlPattern = /^(https?:\/\/.+|mailto:[^\s]+)$/i;

export const SOpenExternalRequest = Schema.Struct({
  url: Schema.String.pipe(Schema.pattern(openExternalUrlPattern)),
});
export type OpenExternalRequest = Schema.Schema.Type<typeof SOpenExternalRequest>;

// Semantic Search IPC types

export const SSemanticSearchInitRequest = Schema.Struct({});
export type SemanticSearchInitRequest = Schema.Schema.Type<typeof SSemanticSearchInitRequest>;

export const SSemanticSearchInitResponse = Schema.Struct({
  initialized: Schema.Boolean,
  modelId: Schema.optional(Schema.String),
});
export type SemanticSearchInitResponse = Schema.Schema.Type<typeof SSemanticSearchInitResponse>;

export const SSemanticSearchEnableForWorkspaceRequest = Schema.Struct({
  workspaceRoot: Schema.String,
});
export type SemanticSearchEnableForWorkspaceRequest = Schema.Schema.Type<typeof SSemanticSearchEnableForWorkspaceRequest>;

export const SSemanticSearchEnableForWorkspaceResponse = Schema.Struct({
  enabled: Schema.Boolean,
});
export type SemanticSearchEnableForWorkspaceResponse = Schema.Schema.Type<typeof SSemanticSearchEnableForWorkspaceResponse>;

export const SSemanticSearchIndexWorkspaceRequest = Schema.Struct({
  workspaceRoot: Schema.String,
  force: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});
export type SemanticSearchIndexWorkspaceRequest = Schema.Schema.Type<typeof SSemanticSearchIndexWorkspaceRequest>;

export const SSemanticSearchIndexWorkspaceResponse = Schema.Struct({
  indexedChunkCount: Schema.Number,
  skippedCount: Schema.Number,
  durationMs: Schema.Number,
});
export type SemanticSearchIndexWorkspaceResponse = Schema.Schema.Type<typeof SSemanticSearchIndexWorkspaceResponse>;

export const SSemanticSearchRebuildAllRequest = Schema.Struct({
  workspaceRoot: Schema.String,
});
export type SemanticSearchRebuildAllRequest = Schema.Schema.Type<typeof SSemanticSearchRebuildAllRequest>;

export const SSemanticSearchRebuildAllResponse = Schema.Struct({
  totalChunkCount: Schema.Number,
  durationMs: Schema.Number,
});
export type SemanticSearchRebuildAllResponse = Schema.Schema.Type<typeof SSemanticSearchRebuildAllResponse>;

export const SSemanticSearchSearchRequest = Schema.Struct({
  workspaceRoot: Schema.String,
  query: Schema.String,
  maxResults: Schema.optionalWith(Schema.Number, { default: () => 10 }),
  minScore: Schema.optionalWith(Schema.Number, { default: () => 0.5 }),
});
export type SemanticSearchSearchRequest = Schema.Schema.Type<typeof SSemanticSearchSearchRequest>;

export const SSemanticSearchSearchResultEntry = Schema.Struct({
  score: Schema.Number,
  title: Schema.String,
  workspaceRelativePath: Schema.String,
  snippet: Schema.String,
});

export const SSemanticSearchSearchResponse = Schema.Struct({
  results: Schema.Array(SSemanticSearchSearchResultEntry),
});
export type SemanticSearchSearchResponse = Schema.Schema.Type<typeof SSemanticSearchSearchResponse>;

export const SSemanticSearchStatusRequest = Schema.Struct({
  workspaceRoot: Schema.String,
});
export type SemanticSearchStatusRequest = Schema.Schema.Type<typeof SSemanticSearchStatusRequest>;

export const SSemanticSearchStatusResponse = Schema.Struct({
  state: Schema.Literal('uninitialized', 'initializing', 'ready', 'indexing', 'disabled', 'error'),
  chunkCount: Schema.optionalWith(Schema.Number, { default: () => 0 }),
  modelId: Schema.optional(Schema.String),
  lastIndexedAt: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
});
export type SemanticSearchStatusResponse = Schema.Schema.Type<typeof SSemanticSearchStatusResponse>;

// Dev console IPC types (flag-gated, SRGNT_DEV_CONSOLE=1). Deliberately thin —
// this is a developer harness for driving raw ACP sessions, not a product
// contract. Capabilities/updates cross the wire as opaque JSON because their
// authoritative shapes live in @srgnt/harness (which desktop-main owns), not in
// contracts.

/** Which harness the dev console drives: the deterministic mock, or real Pi. */
export const SDevConsoleTarget = Schema.Literal('mock', 'pi');
export type DevConsoleTarget = Schema.Schema.Type<typeof SDevConsoleTarget>;

export const SDevSessionNewRequest = Schema.Struct({
  target: SDevConsoleTarget,
});
export type DevSessionNewRequest = Schema.Schema.Type<typeof SDevSessionNewRequest>;

export const SDevSessionNewResponse = Schema.Struct({
  sessionId: Schema.String,
  target: SDevConsoleTarget,
  /** Negotiated ACP capabilities (opaque; shape owned by @srgnt/harness). */
  capabilities: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});
export type DevSessionNewResponse = Schema.Schema.Type<typeof SDevSessionNewResponse>;

export const SDevSessionPromptRequest = Schema.Struct({
  sessionId: Schema.String,
  text: Schema.String,
});
export type DevSessionPromptRequest = Schema.Schema.Type<typeof SDevSessionPromptRequest>;

export const SDevSessionPromptResponse = Schema.Struct({
  stopReason: Schema.String,
});
export type DevSessionPromptResponse = Schema.Schema.Type<typeof SDevSessionPromptResponse>;

export const SDevSessionRef = Schema.Struct({
  sessionId: Schema.String,
});
export type DevSessionRef = Schema.Schema.Type<typeof SDevSessionRef>;

/** One streamed frame pushed main→renderer over `dev:session:update`. */
export const SDevSessionUpdateEvent = Schema.Struct({
  sessionId: Schema.String,
  /** ACP `session/update` notification payload, opaque to the renderer. */
  update: Schema.Unknown,
});
export type DevSessionUpdateEvent = Schema.Schema.Type<typeof SDevSessionUpdateEvent>;

// Chat IPC types (PHASE-23). The product-facing sibling of the dev-console
// block above: same ephemeral raw-ACP shape, but always registered and carrying
// the harness identity the renderer needs for trust/capability UI. Capabilities
// and `session/update` payloads still cross the wire as opaque JSON — their
// authoritative shapes live in @srgnt/harness, which desktop-main owns.

/**
 * Which harness the chat surface drives: the reserved `mock` id, or any harness
 * id the registry resolves (STEP-25-02).
 *
 * Not a literal union any more: `harnesses.json` can name anything, so the set
 * of valid targets is registry data, not a schema constant. Validity is decided
 * where the registry lives (main), which is also the only place that can tell a
 * *dangling* id from a merely unknown-to-this-schema one.
 */
export const SChatTarget = Schema.String;
export type ChatTarget = Schema.Schema.Type<typeof SChatTarget>;

export const SChatSessionNewRequest = Schema.Struct({
  /**
   * Absent means "use the project's `defaultHarnessId`" (STEP-24-02), falling
   * back to `mock` when the project names none or names one this surface cannot
   * drive. An explicit choice always wins over the stored default.
   */
  target: Schema.optional(SChatTarget),
  /**
   * Which project the session belongs to. Absent means "derive it from the
   * workspace cwd" — the auto-create path that materializes a project the first
   * time a directory is used.
   */
  projectId: Schema.optional(Schema.String),
  /**
   * Authenticate with this method id before `session/new` (STEP-25-03). Set only
   * by the auth panel's `rpc-authenticate` affordance. It rides on session
   * creation rather than on a channel of its own because an auth failure tears
   * the connection down: there is no live agent left to authenticate against, so
   * the retry has to be a fresh connect that runs `authenticate` first.
   */
  authMethodId: Schema.optional(Schema.String),
});
export type ChatSessionNewRequest = Schema.Schema.Type<typeof SChatSessionNewRequest>;

/** One session mode the agent advertises (Pi: a thinking level, `off`…`xhigh`). */
export const SChatSessionMode = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
export type ChatSessionMode = Schema.Schema.Type<typeof SChatSessionMode>;

/** The agent's advertised mode set plus the mode it starts in. */
export const SChatSessionModes = Schema.Struct({
  currentModeId: Schema.String,
  availableModes: Schema.Array(SChatSessionMode),
});
export type ChatSessionModes = Schema.Schema.Type<typeof SChatSessionModes>;

export const SChatSessionNewResponse = Schema.Struct({
  /** Opaque chat-local handle (NOT the ACP session id). */
  sessionId: Schema.String,
  target: SChatTarget,
  /** The project the session was created under (STEP-24-02). */
  projectId: Schema.optional(Schema.String),
  /** Harness identity, mirrored from the `HarnessDefinition` that was launched. */
  harnessId: Schema.String,
  harnessName: Schema.String,
  /**
   * Declared harness quirks (e.g. `adapter-mediated`). STEP-23-03's trust badge
   * and later capability-driven UI read these, so they must reach the renderer
   * at session open rather than being re-derived there.
   */
  quirks: Schema.Array(Schema.String),
  /** Negotiated ACP capabilities (opaque; shape owned by @srgnt/harness). */
  capabilities: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  /**
   * Session modes as advertised in the `session/new` response, or absent when
   * the agent advertises none. Absent means "no mode selector" — the renderer
   * must not invent one (STEP-23-04).
   */
  modes: Schema.optional(SChatSessionModes),
});
export type ChatSessionNewResponse = Schema.Schema.Type<typeof SChatSessionNewResponse>;

/**
 * The agent answered `session/new` with the ACP auth-required error (JSON-RPC
 * `-32000`, verified against `@agentclientprotocol/sdk` 1.2.1). Returned INSTEAD
 * of a session, as data rather than a thrown string: a raw JSON-RPC error is the
 * first thing a new opencode user would otherwise hit, and the guidance out of
 * it (which methods exist, what they cost the user) is exactly what an Error
 * message cannot carry.
 *
 * Only `chat:session:new` answers with this. Fork and reconnect keep returning
 * {@link SChatSessionNewResponse} — an auth wall there is a plain failure, and
 * widening those shapes for a case neither can act on buys nothing.
 */
export const SChatAuthRequired = Schema.Struct({
  authRequired: Schema.Literal(true),
  harnessId: Schema.String,
  harnessName: Schema.String,
  docsUrl: Schema.optional(Schema.String),
  /** Normalized at the seam, so the panel never sees raw SDK shapes. */
  authMethods: Schema.Array(SAuthMethod),
  /** The agent's own error text, shown verbatim under the guidance. */
  detail: Schema.String,
});
export type ChatAuthRequired = Schema.Schema.Type<typeof SChatAuthRequired>;

/** What `chat:session:new` resolves with: an open session, or the auth wall. */
export const SChatSessionNewResult = Schema.Union(SChatSessionNewResponse, SChatAuthRequired);
export type ChatSessionNewResult = Schema.Schema.Type<typeof SChatSessionNewResult>;

export const SChatSessionPromptRequest = Schema.Struct({
  sessionId: Schema.String,
  text: Schema.String,
});
export type ChatSessionPromptRequest = Schema.Schema.Type<typeof SChatSessionPromptRequest>;

export const SChatSessionPromptResponse = Schema.Struct({
  stopReason: Schema.String,
});
export type ChatSessionPromptResponse = Schema.Schema.Type<typeof SChatSessionPromptResponse>;

export const SChatSessionRef = Schema.Struct({
  sessionId: Schema.String,
});
export type ChatSessionRef = Schema.Schema.Type<typeof SChatSessionRef>;

/** One streamed frame pushed main→renderer over `chat:session:update`. */
export const SChatSessionUpdateEvent = Schema.Struct({
  /** The chat-local handle the frame belongs to; the renderer filters on it. */
  sessionId: Schema.String,
  /** ACP `session/update` notification payload, opaque to the renderer. */
  update: Schema.Unknown,
});
export type ChatSessionUpdateEvent = Schema.Schema.Type<typeof SChatSessionUpdateEvent>;

// Persisted session list / open (STEP-24-03). Both are pure disk reads: neither
// spawns an agent, which is what keeps "UI-open ≠ process-running" true.

export const SChatSessionListRequest = Schema.Struct({
  /** Sessions are always listed per project — the list is grouped by project. */
  projectId: Schema.String,
});
export type ChatSessionListRequest = Schema.Schema.Type<typeof SChatSessionListRequest>;

export const SChatSessionListResponse = Schema.Struct({
  /**
   * `meta.json` records, newest-updated first. This is the full `Session` entity
   * rather than a trimmed row shape: the list needs title, status, harnessId and
   * `updatedAt` already, and a second near-identical schema would only be one
   * more thing to keep in sync.
   */
  sessions: Schema.Array(SSession),
  /** Session directories whose meta could not be read. Reported, never fatal. */
  skipped: Schema.Array(Schema.Struct({ sessionId: Schema.String, reason: Schema.String })),
});
export type ChatSessionListResponse = Schema.Schema.Type<typeof SChatSessionListResponse>;

export const SChatSessionOpenRequest = Schema.Struct({
  projectId: Schema.String,
  sessionId: Schema.String,
});
export type ChatSessionOpenRequest = Schema.Schema.Type<typeof SChatSessionOpenRequest>;

export const SChatSessionOpenResponse = Schema.Struct({
  session: SSession,
  /**
   * The persisted event stream in `seq` order. The renderer replays the
   * `acp/session_update` payloads through the SAME transcript reducer the live
   * feed uses — one reducer, two feeds, no second render path.
   */
  events: Schema.Array(SSessionEvent),
  /**
   * The log did not end on a record boundary — the shape of a crash mid-append.
   * The session is reported `interrupted` when this is true.
   */
  truncatedTail: Schema.Boolean,
  /** True when this session still has a live agent connection in main. */
  live: Schema.Boolean,
});
export type ChatSessionOpenResponse = Schema.Schema.Type<typeof SChatSessionOpenResponse>;

// Honest resume + fork (STEP-24-04).

export const SChatSessionReconnectRequest = Schema.Struct({
  projectId: Schema.String,
  sessionId: Schema.String,
});
export type ChatSessionReconnectRequest = Schema.Schema.Type<typeof SChatSessionReconnectRequest>;

/**
 * What a reconnect attempt actually did. `resumed`/`loaded` are BOTH "the
 * session continues transparently" but stay distinct so a test (and a support
 * log) can tell which ACP path the cascade took, which is the whole point of a
 * capability-driven branch.
 *
 * - `resumed`   — `session/resume`, no replay.
 * - `loaded`    — `session/load`, replay consumed and reconciled.
 * - `read_only` — no transparent-continue path survives; fork is the only way on.
 * - `retryable` — a transient failure (spawn, transport). The session is
 *   unchanged and the NEXT prompt re-attempts; this is deliberately NOT
 *   `read_only`, because degrading on a flaky spawn would strand a session that
 *   the harness can still resume.
 */
export const SChatSessionReconnectOutcome = Schema.Literal(
  'resumed',
  'loaded',
  'read_only',
  'retryable',
);
export type ChatSessionReconnectOutcome = Schema.Schema.Type<typeof SChatSessionReconnectOutcome>;

export const SChatSessionReconnectResponse = Schema.Struct({
  outcome: SChatSessionReconnectOutcome,
  /** Human-readable why, for the read-only banner or the retry error. */
  reason: Schema.optional(Schema.String),
  /**
   * The session identity block, exactly as `chat:session:new` returns it, so a
   * reconnected session regains its harness badge, capabilities and — for a Pi
   * `session/load` — its advertised modes (the thinking-level selector).
   */
  session: Schema.optional(SChatSessionNewResponse),
  /**
   * The `session/load` replay diverged from the persisted log. The local log
   * stays canonical and the render is unchanged; this only drives a subtle
   * "history may differ on the agent side" notice.
   */
  historyDiverged: Schema.optional(Schema.Boolean),
});
export type ChatSessionReconnectResponse = Schema.Schema.Type<typeof SChatSessionReconnectResponse>;

/**
 * Error marker for a reused fork `idempotencyKey` that arrived with DIFFERENT
 * parameters. A distinct failure on purpose: answering it with the first
 * request's child would hand back a fork of the wrong session, and forking
 * again would break the guarantee the key exists to provide.
 */
export const FORK_KEY_CONFLICT = 'fork_key_conflict';

export const SChatSessionForkRequest = Schema.Struct({
  projectId: Schema.String,
  /** The session being continued. It may still be live; forking never touches it. */
  sourceSessionId: Schema.String,
  /**
   * Seed the new session's composer with the deterministic handoff summary.
   * Part of the request fingerprint: it changes what the fork *is*.
   */
  includeHandoff: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  /**
   * Client-generated, REQUIRED. A double-click, or a retry after a crash
   * mid-fork, must resolve to the same child rather than creating a second one.
   */
  idempotencyKey: Schema.String,
});
export type ChatSessionForkRequest = Schema.Schema.Type<typeof SChatSessionForkRequest>;

export const SChatSessionForkResponse = Schema.Struct({
  /** The new live session, in the same shape `chat:session:new` returns. */
  session: SChatSessionNewResponse,
  parentSessionId: Schema.String,
  /**
   * Deterministic, LLM-free handoff text for the composer. Pre-filled and
   * editable, NEVER auto-sent: the user sees exactly what context the new
   * session gets. Empty when `includeHandoff` was false or the source had no
   * turns to quote.
   */
  handoffText: Schema.String,
  /** True when an earlier call with the same key already created this child. */
  reused: Schema.Boolean,
});
export type ChatSessionForkResponse = Schema.Schema.Type<typeof SChatSessionForkResponse>;

/** Renderer→main: switch the session's mode. */
export const SChatSessionSetModeRequest = Schema.Struct({
  sessionId: Schema.String,
  modeId: Schema.String,
});
export type ChatSessionSetModeRequest = Schema.Schema.Type<typeof SChatSessionSetModeRequest>;

/**
 * Main→renderer answer to a set-mode call. `currentModeId` is echoed so the
 * selector settles on what the agent actually accepted rather than on what the
 * user clicked.
 */
export const SChatSessionSetModeResponse = Schema.Struct({
  ok: Schema.Literal(true),
  currentModeId: Schema.String,
});
export type ChatSessionSetModeResponse = Schema.Schema.Type<typeof SChatSessionSetModeResponse>;

/**
 * Agent *process* lifecycle, mirroring `SupervisorEvent` minus the
 * reducer-internal `reaped`. This is the crash surface: `crashed`/`gave-up`
 * carry the stderr tail so the user sees why, not just that.
 */
export const SChatSessionStatus = Schema.Literal('spawning', 'ready', 'crashed', 'gave-up', 'exited');
export type ChatSessionStatusValue = Schema.Schema.Type<typeof SChatSessionStatus>;

export const SChatSessionStatusEvent = Schema.Struct({
  /** The chat-local handle; the renderer filters on it (stale handles dropped). */
  sessionId: Schema.String,
  status: SChatSessionStatus,
  /** Last captured stderr lines. Only populated for `crashed`/`gave-up`. */
  stderrTail: Schema.optional(Schema.String),
  /** Exit code, or `null` when a signal ended the process. */
  exitCode: Schema.optional(Schema.NullOr(Schema.Number)),
  /** Human-readable detail (e.g. "gave up after 3 restarts"). */
  message: Schema.optional(Schema.String),
});
export type ChatSessionStatusEvent = Schema.Schema.Type<typeof SChatSessionStatusEvent>;

/**
 * One chunk of output from a client-created terminal, pushed main→renderer over
 * `chat:terminal:output`. Chunks are raw pty bytes (ANSI included) and are
 * append-only per `terminalId`, so a late-mounting embed can be caught up by
 * replaying everything received so far.
 */
export const SChatTerminalOutputEvent = Schema.Struct({
  /** The chat-local handle the terminal belongs to; the renderer filters on it. */
  sessionId: Schema.String,
  /** Client-assigned terminal id, as returned from `terminal/create`. */
  terminalId: Schema.String,
  chunk: Schema.String,
});
export type ChatTerminalOutputEvent = Schema.Schema.Type<typeof SChatTerminalOutputEvent>;

// Permission round-trip (STEP-23-03). Default-ask is an ARCH-0009 invariant, so
// these carry the *decision surface* the user must see before answering: what
// kind of tool, what it is about to touch, and every option the agent offered.

/** One option the agent offered. `kind` is an open string: unknown kinds render as plain buttons. */
export const SChatPermissionOption = Schema.Struct({
  optionId: Schema.String,
  name: Schema.String,
  /** ACP hint (`allow_once` | `allow_always` | `reject_once` | `reject_always`), or anything else. */
  kind: Schema.String,
});
export type ChatPermissionOption = Schema.Schema.Type<typeof SChatPermissionOption>;

/** Main→renderer: the agent is blocked on this until `chat:permission:respond` arrives. */
export const SChatPermissionRequestEvent = Schema.Struct({
  /** The chat-local handle; the renderer filters on it. */
  sessionId: Schema.String,
  /** Client-assigned id the response routes by. Unique per session. */
  requestId: Schema.String,
  /** ACP `ToolKind`, or whatever the agent sent. */
  kind: Schema.String,
  title: Schema.String,
  /** Paths the tool call declared it would touch, canonicalized where possible. */
  paths: Schema.Array(Schema.String),
  /** The command line for `execute` calls, when the agent disclosed one. */
  command: Schema.optional(Schema.String),
  options: Schema.Array(SChatPermissionOption),
});
export type ChatPermissionRequestEvent = Schema.Schema.Type<typeof SChatPermissionRequestEvent>;

/**
 * Renderer→main: the user's answer. An absent `optionId` is a cancel, which maps
 * to ACP's `cancelled` outcome — never to a silent allow.
 */
export const SChatPermissionResponse = Schema.Struct({
  sessionId: Schema.String,
  requestId: Schema.String,
  optionId: Schema.optional(Schema.String),
});
export type ChatPermissionResponse = Schema.Schema.Type<typeof SChatPermissionResponse>;

/** Why a pending prompt was resolved without the user answering it. */
export const SChatPermissionCloseReason = Schema.Literal('cancelled', 'expired', 'disposed');
export type ChatPermissionCloseReason = Schema.Schema.Type<typeof SChatPermissionCloseReason>;

/** Main→renderer: this prompt is already answered (by main); dismiss it. */
export const SChatPermissionCloseEvent = Schema.Struct({
  sessionId: Schema.String,
  requestId: Schema.String,
  reason: SChatPermissionCloseReason,
});
export type ChatPermissionCloseEvent = Schema.Schema.Type<typeof SChatPermissionCloseEvent>;

// Project IPC types (PHASE-24, STEP-24-02). The renderer never invents a project
// id: every mutation names an existing one, and creation goes through
// `project:ensure` with a directory, which is what makes "project = directory"
// the only way a project comes into being.

export const SProjectEnsureRequest = Schema.Struct({
  /** Any directory path; the store resolves it and derives the id from that. */
  rootDir: Schema.String,
});
export type ProjectEnsureRequest = Schema.Schema.Type<typeof SProjectEnsureRequest>;

export const SProjectRef = Schema.Struct({
  projectId: Schema.String,
});
export type ProjectRef = Schema.Schema.Type<typeof SProjectRef>;

export const SProjectRenameRequest = Schema.Struct({
  projectId: Schema.String,
  name: Schema.String,
});
export type ProjectRenameRequest = Schema.Schema.Type<typeof SProjectRenameRequest>;

/** Irreversible: source sessions move under the target and the source is removed. */
export const SProjectMergeRequest = Schema.Struct({
  sourceProjectId: Schema.String,
  targetProjectId: Schema.String,
});
export type ProjectMergeRequest = Schema.Schema.Type<typeof SProjectMergeRequest>;

export const SProjectSetDefaultsRequest = Schema.Struct({
  projectId: Schema.String,
  /** Absent leaves the stored value alone; `null` clears it. */
  defaultHarnessId: Schema.optional(Schema.NullOr(Schema.String)),
  permissionPolicy: Schema.optional(Schema.NullOr(SProjectPermissionPolicy)),
});
export type ProjectSetDefaultsRequest = Schema.Schema.Type<typeof SProjectSetDefaultsRequest>;

export const SProjectListResponse = Schema.Struct({
  projects: Schema.Array(SProject),
  /** Project directories that could not be read — reported, never fatal. */
  skipped: Schema.Array(Schema.Struct({ projectId: Schema.String, reason: Schema.String })),
});
export type ProjectListResponse = Schema.Schema.Type<typeof SProjectListResponse>;

// Harness configuration IPC (PHASE-25, STEP-25-02). The wire mirror of
// `DetectionResult` in @srgnt/harness — the states are onboarding-facing copy,
// so they cross the boundary as data the renderer can switch on rather than a
// pre-rendered string.

export const SHarnessDetection = Schema.Union(
  Schema.Struct({ status: Schema.Literal('ok'), command: Schema.String, version: Schema.String }),
  Schema.Struct({
    status: Schema.Literal('probe-failed'),
    command: Schema.String,
    reason: Schema.Literal('timeout', 'nonzero-exit', 'no-version-output', 'spawn-error'),
    detail: Schema.optional(Schema.String),
  }),
  Schema.Struct({ status: Schema.Literal('not-installed'), command: Schema.String }),
);
export type HarnessDetection = Schema.Schema.Type<typeof SHarnessDetection>;

/**
 * Whether `harnesses.json` itself could be read, as a field of its own.
 * "Invalid file" and "valid file with no custom entries" both render built-ins,
 * so the difference must be stated rather than inferred from an empty list.
 */
export const SHarnessWorkspaceLoad = Schema.Union(
  Schema.Struct({ ok: Schema.Literal(true) }),
  Schema.Struct({ ok: Schema.Literal(false), error: Schema.String }),
);
export type HarnessWorkspaceLoad = Schema.Schema.Type<typeof SHarnessWorkspaceLoad>;

export const SHarnessListEntry = Schema.Struct({
  /** The effective (post-shadow) definition, with `${env:…}` references left unresolved. */
  definition: SHarnessDefinition,
  /** A workspace entry shadows this id. For a built-in that means "overridden". */
  overridden: Schema.Boolean,
  detection: SHarnessDetection,
});
export type HarnessListEntry = Schema.Schema.Type<typeof SHarnessListEntry>;

export const SHarnessListRequest = Schema.Struct({
  /** Re-probe instead of answering from this run's detection cache. */
  refresh: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});
export type HarnessListRequest = Schema.Schema.Type<typeof SHarnessListRequest>;

export const SHarnessListResponse = Schema.Struct({
  workspaceLoad: SHarnessWorkspaceLoad,
  harnesses: Schema.Array(SHarnessListEntry),
});
export type HarnessListResponse = Schema.Schema.Type<typeof SHarnessListResponse>;

/**
 * A save carries a COMPLETE definition, never a patch: the registry replaces a
 * shadowed built-in wholesale, so a record missing `quirks` or
 * `capabilityOverrides` is a deletion of them, not "unchanged".
 *
 * Completeness is not integrity — the service still canonicalizes every field
 * outside its allowlist (`launch.*`, `detectCommand`) from the base definition,
 * so a tampered-but-complete payload cannot rewrite `quirks`, `source`, or a
 * capability clamp.
 */
export const SHarnessSaveOverrideRequest = Schema.Struct({
  harnessId: Schema.String,
  definition: SHarnessDefinition,
});
export type HarnessSaveOverrideRequest = Schema.Schema.Type<typeof SHarnessSaveOverrideRequest>;

export const SHarnessRef = Schema.Struct({ harnessId: Schema.String });
export type HarnessRef = Schema.Schema.Type<typeof SHarnessRef>;

/**
 * Mutations answer with a typed failure instead of throwing so the renderer can
 * render the message next to the field the user was editing (an unreadable
 * `harnesses.json`, a rejected secret literal, an id mismatch).
 */
export const SHarnessMutationResponse = Schema.Union(
  Schema.Struct({ ok: Schema.Literal(true) }),
  Schema.Struct({ ok: Schema.Literal(false), error: Schema.String }),
);
export type HarnessMutationResponse = Schema.Schema.Type<typeof SHarnessMutationResponse>;

// Capability matrix IPC (PHASE-25, STEP-25-03). The one capability channel; see
// `ipcChannels.harnessCapabilities` for why it is not part of `harness:list`.

/**
 * Whether a row describes the current definition.
 *
 * `stale` is decided by fingerprint, not by age: the definition changed under
 * the same id, so the measurement describes a harness that no longer exists.
 * Precomputed in main so every renderer agrees on staleness.
 */
export const SHarnessCapabilityState = Schema.Literal('measured', 'stale', 'not-yet-measured');
export type HarnessCapabilityState = Schema.Schema.Type<typeof SHarnessCapabilityState>;

/**
 * Where a capability's value came from. `session` fields (`modes`,
 * `slashCommands`) are not knowable at `initialize` and default to `false`, so a
 * matrix that read them as a plain "no" would under-report every agent that has
 * them — opencode advertises 93 slash commands and none of them exist at
 * initialize time.
 */
export const SCapabilityProvenance = Schema.Literal('initialize', 'session');
export type CapabilityProvenance = Schema.Schema.Type<typeof SCapabilityProvenance>;

export const SHarnessCapabilityRow = Schema.Struct({
  harnessId: Schema.String,
  /** The definition's display name. Rows are labelled from data, never from the id. */
  name: Schema.String,
  docsUrl: Schema.optional(Schema.String),
  /** Declared quirks — what drives the behavioral columns (and the trust badge). */
  quirks: Schema.Array(SHarnessQuirk),
  state: SHarnessCapabilityState,
  /** STEP-25-01 cache fields, passed through unchanged (opaque; shape owned by @srgnt/harness). */
  negotiated: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  effective: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  /** Per capability key; absent keys are "we do not model this field". */
  provenance: Schema.Record({ key: Schema.String, value: SCapabilityProvenance }),
  /** Normalized from the measured negotiation, so cached and live rows agree. */
  authMethods: Schema.Array(SAuthMethod),
  agentVersion: Schema.optional(Schema.String),
  capturedAt: Schema.optional(Schema.String),
  definitionFingerprint: Schema.optional(Schema.String),
});
export type HarnessCapabilityRow = Schema.Schema.Type<typeof SHarnessCapabilityRow>;

export const SHarnessCapabilitiesResponse = Schema.Struct({
  entries: Schema.Array(SHarnessCapabilityRow),
});
export type HarnessCapabilitiesResponse = Schema.Schema.Type<typeof SHarnessCapabilitiesResponse>;
