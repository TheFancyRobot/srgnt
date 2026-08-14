/// <reference types="@testing-library/jest-dom/vitest" />
/// <reference types="vite/client" />

import type {
  ChatSessionForkResponse,
  ChatSessionNewResponse,
  ChatSessionReconnectResponse,
  DesktopSettings,
  DesktopSettingsResponse,
  HarnessDefinition,
  HarnessListResponse,
  HarnessMutationResponse,
  LaunchContext,
  Project,
  Session as PersistedSession,
  TerminalLaunchWithContextRequest,
  UpdateCheckResponse,
} from '@srgnt/contracts';

export interface SrgntAPI {
  checkForUpdates(): Promise<UpdateCheckResponse>;

  getWorkspaceRoot(): Promise<string>;
  setWorkspaceRoot(root: string): Promise<string>;
  chooseWorkspaceRoot(): Promise<string>;
  createDefaultWorkspaceRoot(): Promise<string>;

  getDesktopSettings(): Promise<DesktopSettingsResponse>;
  saveDesktopSettings(settings: DesktopSettings): Promise<DesktopSettingsResponse>;

  terminalSpawn(options?: { rows?: number; cols?: number }): Promise<{ sessionId: string; pid: number }>;
  terminalWrite(sessionId: string, data: string): Promise<void>;
  terminalResize(sessionId: string, rows: number, cols: number): Promise<void>;
  terminalClose(sessionId: string): Promise<void>;
  terminalList(): Promise<{ sessions: { id: string; pid: number; isActive: boolean; startedAt: string }[] }>;
  onTerminalData(callback: (sessionId: string, data: string) => void): () => void;
  onTerminalExit(callback: (sessionId: string, exitCode: number) => void): () => void;
  terminalLaunchWithContext(request: TerminalLaunchWithContextRequest): Promise<{
    sessionId: string;
    pid: number;
    launchId: string;
    status?: 'approved' | 'denied' | 'approval-pending';
    approvalId?: string;
  }>;
  onLaunchApprovalRequired(callback: (payload: {
    approvalId: string;
    launchContext: LaunchContext;
    command: string;
    riskLevel: string;
  }) => void): () => void;
  resolveLaunchApproval(approvalId: string, approved: boolean): Promise<void>;

  writeDiagnosticCrashLog(): Promise<{ directory: string }>;

  // Notes operations
  notesListDir(dirPath: string): Promise<{ entries: { name: string; path: string; isDirectory: boolean; modifiedAt: string }[] }>;
  notesReadFile(filePath: string): Promise<{ content: string; modifiedAt: string }>;
  notesWriteFile(filePath: string, content: string): Promise<{ path: string; modifiedAt: string }>;
  notesCreateFile(filePath: string, title: string): Promise<{ path: string; createdAt: string }>;
  notesCreateFolder(dirPath: string): Promise<{ path: string }>;
  notesDelete(path: string, isDirectory: boolean): Promise<{ deleted: boolean }>;
  notesRename(oldPath: string, newName: string): Promise<{ newPath: string }>;
  notesSearch(query: string, maxResults?: number): Promise<{ results: { title: string; path: string; snippet: string; score: number }[] }>;
  notesResolveWikilink(wikilink: string, currentFilePath?: string): Promise<{ resolved: boolean; path: string; line?: number }>;
  notesListWorkspaceMarkdown(query?: string, maxResults?: number): Promise<{ files: { title: string; path: string; modifiedAt: string }[] }>;

  // Semantic search
  semanticSearchInit(): Promise<{ initialized: boolean; modelId?: string }>;
  semanticSearchEnableForWorkspace(workspaceRoot: string): Promise<{ enabled: boolean }>;
  semanticSearchIndexWorkspace(workspaceRoot: string, force?: boolean): Promise<{
    indexedChunkCount: number;
    skippedCount: number;
    durationMs: number;
  }>;
  semanticSearchRebuildAll(workspaceRoot: string): Promise<{
    totalChunkCount: number;
    durationMs: number;
  }>;
  semanticSearchSearch(
    workspaceRoot: string,
    query: string,
    maxResults?: number,
    minScore?: number,
  ): Promise<{
    results: Array<{
      score: number;
      title: string;
      workspaceRelativePath: string;
      snippet: string;
    }>;
  }>;
  semanticSearchStatus(workspaceRoot: string): Promise<{
    state: 'uninitialized' | 'initializing' | 'ready' | 'indexing' | 'disabled' | 'error';
    indexedFileCount: number;
    totalChunkCount: number;
    progressPercent: number;
    lastIndexedAt: string | null;
    error: string | null;
  }>;

  // Shell
  openExternal(url: string): Promise<void>;

  // Window controls
  windowMinimize(): Promise<void>;
  windowMaximize(): Promise<void>;
  windowClose(): Promise<void>;
  windowIsMaximized(): Promise<boolean>;
  onWindowMaximizedChange(callback: (isMaximized: boolean) => void): () => void;

  // Flag-gated dev console (SRGNT_DEV_CONSOLE=1)
  devConsoleEnabled(): Promise<boolean>;
  devSessionNew(target: 'mock' | 'pi'): Promise<{ sessionId: string; target: 'mock' | 'pi'; capabilities: Record<string, unknown> }>;
  devSessionPrompt(sessionId: string, text: string): Promise<{ stopReason: string }>;
  devSessionCancel(sessionId: string): Promise<void>;
  devSessionDispose(sessionId: string): Promise<void>;
  onDevSessionUpdate(callback: (event: { sessionId: string; update: unknown }) => void): () => void;

  // Product chat surface over ephemeral ACP sessions (PHASE-23)
  chatSessionNew(
    /**
     * `mock`, or any configured harness id. Absent falls back to the project's
     * `defaultHarnessId`, then to `mock` (STEP-25-02).
     */
    target?: string,
    /** Absent derives (and auto-creates) the project from the workspace cwd. */
    projectId?: string,
  ): Promise<ChatSessionNewResponse>;
  chatSessionPrompt(sessionId: string, text: string): Promise<{ stopReason: string }>;
  chatSessionCancel(sessionId: string): Promise<void>;
  chatSessionDispose(sessionId: string): Promise<void>;
  /** Optional: an older preload has no mode bridge, so the selector just hides. */
  chatSessionSetMode?(sessionId: string, modeId: string): Promise<{ ok: true; currentModeId: string }>;
  /**
   * Persisted sessions (PHASE-24, STEP-24-03). Optional for the same reason the
   * project bridge is: an older preload must degrade to "no session list", not
   * crash the panel. Both are pure disk reads and spawn no agent.
   */
  chatSessionList?(projectId: string): Promise<{
    sessions: readonly PersistedSession[];
    skipped: readonly { sessionId: string; reason: string }[];
  }>;
  chatSessionOpen?(
    projectId: string,
    sessionId: string,
  ): Promise<{
    session: PersistedSession;
    events: readonly { seq: number; ts: string; protocolVersion: number; kind: string; payload?: unknown }[];
    /** The log ended mid-record: the last turn never completed. */
    truncatedTail: boolean;
    /** Whether main still holds a live agent connection for this session. */
    live: boolean;
  }>;
  /**
   * Reconnect-on-first-prompt for a reopened session (STEP-24-04). Optional for
   * the same reason the list is: an older preload must degrade to "read-only,
   * fork unavailable", not crash the panel.
   */
  chatSessionReconnect?(projectId: string, sessionId: string): Promise<ChatSessionReconnectResponse>;
  /** Continue a read-only session in a new linked one. Idempotent per key. */
  chatSessionFork?(
    projectId: string,
    sourceSessionId: string,
    idempotencyKey: string,
    includeHandoff?: boolean,
  ): Promise<ChatSessionForkResponse>;
  onChatSessionUpdate(callback: (event: { sessionId: string; update: unknown }) => void): () => void;
  /** Agent process lifecycle (STEP-23-04): the crash surface. */
  onChatSessionStatus?(
    callback: (event: {
      sessionId: string;
      status: 'spawning' | 'ready' | 'crashed' | 'gave-up' | 'exited';
      stderrTail?: string;
      exitCode?: number | null;
      message?: string;
    }) => void,
  ): () => void;
  onChatTerminalOutput(
    callback: (event: { sessionId: string; terminalId: string; chunk: string }) => void,
  ): () => void;
  // Permission round-trip (STEP-23-03). Optional because the provider mounts in
  // renders backed by an older preload, where a missing bridge must degrade to
  // "no prompts" rather than crashing the panel.
  onChatPermissionRequest?(
    callback: (event: {
      sessionId: string;
      requestId: string;
      kind: string;
      title: string;
      paths: readonly string[];
      command?: string;
      options: readonly { optionId: string; name: string; kind: string }[];
    }) => void,
  ): () => void;
  onChatPermissionClose?(
    callback: (event: { sessionId: string; requestId: string; reason: string }) => void,
  ): () => void;
  chatPermissionRespond(sessionId: string, requestId: string, optionId?: string): Promise<void>;

  // Projects (PHASE-24, STEP-24-02). Optional because the provider mounts in
  // renders backed by an older preload, where a missing bridge must degrade to
  // "no projects" rather than crashing the panel.
  projectList?(): Promise<{
    projects: readonly Project[];
    skipped: readonly { projectId: string; reason: string }[];
  }>;
  /** Idempotent; derives the id from the directory. The only way a project is created. */
  projectEnsure?(rootDir: string): Promise<Project>;
  projectRename?(projectId: string, name: string): Promise<Project>;
  /** Irreversible: source sessions move under the target and the source is removed. */
  projectMerge?(sourceProjectId: string, targetProjectId: string): Promise<Project>;
  projectSetDefaults?(
    projectId: string,
    defaults: {
      defaultHarnessId?: string | null;
      permissionPolicy?: Record<string, 'allow' | 'reject' | 'ask'> | null;
    },
  ): Promise<Project>;

  /**
   * Harness configuration (PHASE-25, STEP-25-02). Optional for the same reason
   * the project bridge is: an older preload must degrade to "no harness
   * section", not crash Settings.
   */
  harnessList?(refresh?: boolean): Promise<HarnessListResponse>;
  /**
   * Takes a COMPLETE definition — the registry replaces a shadowed built-in
   * wholesale, so a partial record would delete the fields it omits. Main
   * canonicalizes everything outside `launch.*`/`detectCommand` from the base.
   */
  harnessSaveOverride?(
    harnessId: string,
    definition: HarnessDefinition,
  ): Promise<HarnessMutationResponse>;
  /** Removes the workspace entry: a built-in returns to its shipped definition. */
  harnessResetOverride?(harnessId: string): Promise<HarnessMutationResponse>;

  platform: string;
}

declare global {
  interface Window {
    srgnt: SrgntAPI;
  }
}
