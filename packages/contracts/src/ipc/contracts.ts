import { Schema } from "effect";
import { PositiveInt } from '../shared-schemas.js';
import { SLaunchContext } from '../entities/launch.js';
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

/** Which harness the chat surface drives: the deterministic mock, or real Pi. */
export const SChatTarget = Schema.Literal('mock', 'pi');
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
