import { Schema } from "effect";
import { PositiveInt } from '../shared-schemas.js';
import { SLaunchContext } from '../entities/launch.js';

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
  // Main→renderer push channel for streamed session/update frames.
  chatSessionUpdate: 'chat:session:update',
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
  target: SChatTarget,
});
export type ChatSessionNewRequest = Schema.Schema.Type<typeof SChatSessionNewRequest>;

export const SChatSessionNewResponse = Schema.Struct({
  /** Opaque chat-local handle (NOT the ACP session id). */
  sessionId: Schema.String,
  target: SChatTarget,
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
