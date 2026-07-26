import { contextBridge, ipcRenderer } from 'electron';
import type {
  DesktopSettings,
  DesktopSettingsResponse,
  TerminalLaunchWithContextRequest,
  TerminalLaunchWithContextResponse,
  UpdateCheckResponse,
} from '@srgnt/contracts';

// NOTE: ipcChannels must be inlined here — the preload runs with sandbox: true,
// which restricts require() to Electron built-ins only. Importing runtime values
// from npm packages (like @srgnt/contracts) crashes the preload silently.
// The canonical definition lives in @srgnt/contracts/src/ipc/contracts.ts.
const ipcChannels = {
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
  // Semantic search (inline - preload cannot import from @srgnt/contracts)
  semanticSearchInit: 'semantic-search:init',
  semanticSearchEnableForWorkspace: 'semantic-search:enable-for-workspace',
  semanticSearchIndexWorkspace: 'semantic-search:index-workspace',
  semanticSearchRebuildAll: 'semantic-search:rebuild-all',
  semanticSearchSearch: 'semantic-search:search',
  semanticSearchStatus: 'semantic-search:status',
  // Flag-gated dev console (SRGNT_DEV_CONSOLE=1).
  devConsoleEnabled: 'dev:console:enabled',
  devSessionNew: 'dev:session:new',
  devSessionPrompt: 'dev:session:prompt',
  devSessionCancel: 'dev:session:cancel',
  devSessionDispose: 'dev:session:dispose',
  devSessionUpdate: 'dev:session:update',
  chatSessionNew: 'chat:session:new',
  chatSessionPrompt: 'chat:session:prompt',
  chatSessionCancel: 'chat:session:cancel',
  chatSessionDispose: 'chat:session:dispose',
  chatSessionSetMode: 'chat:session:set-mode',
  chatSessionUpdate: 'chat:session:update',
  chatSessionStatus: 'chat:session:status',
  chatTerminalOutput: 'chat:terminal:output',
  chatPermissionRequest: 'chat:permission:request',
  chatPermissionRespond: 'chat:permission:respond',
  chatPermissionClose: 'chat:permission:close',
} as const;

const api = {
  checkForUpdates: (): Promise<UpdateCheckResponse> => ipcRenderer.invoke(ipcChannels.appCheckForUpdates),

  getWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceGetRoot),
  setWorkspaceRoot: (root: string): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceSetRoot, root),
  chooseWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceChooseRoot),
  createDefaultWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceCreateDefaultRoot),

  getDesktopSettings: (): Promise<DesktopSettingsResponse> => ipcRenderer.invoke(ipcChannels.settingsGet),
  saveDesktopSettings: (settings: DesktopSettings): Promise<DesktopSettingsResponse> => ipcRenderer.invoke(ipcChannels.settingsSave, settings),

  terminalSpawn: (options?: { rows?: number; cols?: number }): Promise<{ sessionId: string; pid: number }> =>
    ipcRenderer.invoke(ipcChannels.terminalSpawn, options || {}),
  terminalWrite: (sessionId: string, data: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.terminalWrite, { sessionId, data }),
  terminalResize: (sessionId: string, rows: number, cols: number): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.terminalResize, { sessionId, rows, cols }),
  terminalClose: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.terminalClose, { sessionId }),
  terminalList: (): Promise<{ sessions: { id: string; pid: number; isActive: boolean; startedAt: string }[] }> =>
    ipcRenderer.invoke(ipcChannels.terminalList),
  terminalLaunchWithContext: (request: TerminalLaunchWithContextRequest): Promise<TerminalLaunchWithContextResponse> =>
    ipcRenderer.invoke(ipcChannels.terminalLaunchWithContext, request),
  onLaunchApprovalRequired: (callback: (payload: { approvalId: string; launchContext: TerminalLaunchWithContextRequest['launchContext']; command: string; riskLevel: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { approvalId: string; launchContext: TerminalLaunchWithContextRequest['launchContext']; command: string; riskLevel: string }) => callback(payload);
    ipcRenderer.on(ipcChannels.launchApprovalRequired, handler);
    return () => ipcRenderer.removeListener(ipcChannels.launchApprovalRequired, handler);
  },
  resolveLaunchApproval: (approvalId: string, approved: boolean): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.launchApprovalResolve, { approvalId, approved }),
  onTerminalData: (callback: (sessionId: string, data: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, data: string) => callback(sessionId, data);
    ipcRenderer.on('terminal:data', handler);
    return () => ipcRenderer.removeListener('terminal:data', handler);
  },
  onTerminalExit: (callback: (sessionId: string, exitCode: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, exitCode: number) => callback(sessionId, exitCode);
    ipcRenderer.on('terminal:exit', handler);
    return () => ipcRenderer.removeListener('terminal:exit', handler);
  },

  writeDiagnosticCrashLog: (): Promise<{ directory: string }> => ipcRenderer.invoke(ipcChannels.crashWriteTestLog),

  // Notes operations
  notesListDir: (dirPath: string): Promise<{ entries: { name: string; path: string; isDirectory: boolean; modifiedAt: string }[] }> =>
    ipcRenderer.invoke(ipcChannels.notesListDir, { dirPath }),
  notesReadFile: (filePath: string): Promise<{ content: string; modifiedAt: string }> =>
    ipcRenderer.invoke(ipcChannels.notesReadFile, { filePath }),
  notesWriteFile: (filePath: string, content: string): Promise<{ path: string; modifiedAt: string }> =>
    ipcRenderer.invoke(ipcChannels.notesWriteFile, { filePath, content }),
  notesCreateFile: (filePath: string, title: string): Promise<{ path: string; createdAt: string }> =>
    ipcRenderer.invoke(ipcChannels.notesCreateFile, { filePath, title }),
  notesCreateFolder: (dirPath: string): Promise<{ path: string }> =>
    ipcRenderer.invoke(ipcChannels.notesCreateFolder, { dirPath }),
  notesDelete: (path: string, isDirectory: boolean): Promise<{ deleted: boolean }> =>
    ipcRenderer.invoke(ipcChannels.notesDelete, { path, isDirectory }),
  notesRename: (oldPath: string, newName: string): Promise<{ newPath: string }> =>
    ipcRenderer.invoke(ipcChannels.notesRename, { oldPath, newName }),
  notesSearch: (query: string, maxResults?: number): Promise<{ results: { title: string; path: string; snippet: string; score: number }[] }> =>
    ipcRenderer.invoke(ipcChannels.notesSearch, { query, maxResults: maxResults ?? 20 }),
  notesResolveWikilink: (wikilink: string, currentFilePath?: string): Promise<{ resolved: boolean; path: string; line?: number }> =>
    ipcRenderer.invoke(ipcChannels.notesResolveWikilink, { wikilink, currentFilePath }),
  notesListWorkspaceMarkdown: (query?: string, maxResults?: number): Promise<{ files: { title: string; path: string; modifiedAt: string }[] }> =>
    ipcRenderer.invoke(ipcChannels.notesListWorkspaceMarkdown, { query: query ?? '', maxResults: maxResults ?? 20 }),

  // Shell
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.shellOpenExternal, { url }),

  // Window controls
  windowMinimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  windowMaximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  windowClose: (): Promise<void> => ipcRenderer.invoke('window:close'),
  windowIsMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window:maximized-changed', handler);
    return () => ipcRenderer.removeListener('window:maximized-changed', handler);
  },

  // Semantic search
  semanticSearchInit: (): Promise<{ initialized: boolean; modelId?: string }> =>
    ipcRenderer.invoke(ipcChannels.semanticSearchInit),
  semanticSearchEnableForWorkspace: (workspaceRoot: string): Promise<{ enabled: boolean }> =>
    ipcRenderer.invoke(ipcChannels.semanticSearchEnableForWorkspace, { workspaceRoot }),
  semanticSearchIndexWorkspace: (workspaceRoot: string, force?: boolean): Promise<{
    indexedChunkCount: number;
    skippedCount: number;
    durationMs: number;
  }> =>
    ipcRenderer.invoke(ipcChannels.semanticSearchIndexWorkspace, { workspaceRoot, force }),
  semanticSearchRebuildAll: (workspaceRoot: string): Promise<{
    totalChunkCount: number;
    durationMs: number;
  }> =>
    ipcRenderer.invoke(ipcChannels.semanticSearchRebuildAll, { workspaceRoot }),
  semanticSearchSearch: (
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
  }> =>
    ipcRenderer.invoke(ipcChannels.semanticSearchSearch, {
      workspaceRoot,
      query,
      maxResults,
      minScore,
    }),
  semanticSearchStatus: (workspaceRoot: string): Promise<{
    state: 'uninitialized' | 'initializing' | 'ready' | 'indexing' | 'disabled' | 'error';
    indexedFileCount: number;
    totalChunkCount: number;
    progressPercent: number;
    lastIndexedAt: string | null;
    error: string | null;
  }> =>
    ipcRenderer.invoke(ipcChannels.semanticSearchStatus, { workspaceRoot }),

  // Flag-gated dev console. `devConsoleEnabled` is always answerable (returns
  // false when the flag is off); the rest only resolve when the flag is on.
  devConsoleEnabled: (): Promise<boolean> => ipcRenderer.invoke(ipcChannels.devConsoleEnabled),
  devSessionNew: (target: 'mock' | 'pi'): Promise<{ sessionId: string; target: 'mock' | 'pi'; capabilities: Record<string, unknown> }> =>
    ipcRenderer.invoke(ipcChannels.devSessionNew, { target }),
  devSessionPrompt: (sessionId: string, text: string): Promise<{ stopReason: string }> =>
    ipcRenderer.invoke(ipcChannels.devSessionPrompt, { sessionId, text }),
  devSessionCancel: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.devSessionCancel, { sessionId }),
  devSessionDispose: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.devSessionDispose, { sessionId }),
  onDevSessionUpdate: (callback: (event: { sessionId: string; update: unknown }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { sessionId: string; update: unknown }) => callback(payload);
    ipcRenderer.on(ipcChannels.devSessionUpdate, handler);
    return () => ipcRenderer.removeListener(ipcChannels.devSessionUpdate, handler);
  },

  // Product chat surface over ephemeral ACP sessions (PHASE-23). Always
  // available — unlike the dev console these are not flag-gated.
  chatSessionNew: (
    target: 'mock' | 'pi',
  ): Promise<{
    sessionId: string;
    target: 'mock' | 'pi';
    harnessId: string;
    harnessName: string;
    quirks: readonly string[];
    capabilities: Record<string, unknown>;
    /** Absent when the agent advertises no session modes → no mode selector. */
    modes?: { currentModeId: string; availableModes: readonly { id: string; name: string }[] };
  }> => ipcRenderer.invoke(ipcChannels.chatSessionNew, { target }),
  chatSessionPrompt: (sessionId: string, text: string): Promise<{ stopReason: string }> =>
    ipcRenderer.invoke(ipcChannels.chatSessionPrompt, { sessionId, text }),
  chatSessionCancel: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.chatSessionCancel, { sessionId }),
  chatSessionDispose: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.chatSessionDispose, { sessionId }),
  /** `session/set_mode`. Rejects when `modeId` is not one the agent advertised. */
  chatSessionSetMode: (
    sessionId: string,
    modeId: string,
  ): Promise<{ ok: true; currentModeId: string }> =>
    ipcRenderer.invoke(ipcChannels.chatSessionSetMode, { sessionId, modeId }),
  onChatSessionUpdate: (callback: (event: { sessionId: string; update: unknown }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { sessionId: string; update: unknown }) => callback(payload);
    ipcRenderer.on(ipcChannels.chatSessionUpdate, handler);
    return () => ipcRenderer.removeListener(ipcChannels.chatSessionUpdate, handler);
  },
  /**
   * Agent *process* lifecycle (STEP-23-04), not ACP frames: this is how a crash
   * reaches the UI at all. `crashed`/`gave-up` carry the stderr tail.
   */
  onChatSessionStatus: (
    callback: (event: {
      sessionId: string;
      status: 'spawning' | 'ready' | 'crashed' | 'gave-up' | 'exited';
      stderrTail?: string;
      exitCode?: number | null;
      message?: string;
    }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: {
        sessionId: string;
        status: 'spawning' | 'ready' | 'crashed' | 'gave-up' | 'exited';
        stderrTail?: string;
        exitCode?: number | null;
        message?: string;
      },
    ) => callback(payload);
    ipcRenderer.on(ipcChannels.chatSessionStatus, handler);
    return () => ipcRenderer.removeListener(ipcChannels.chatSessionStatus, handler);
  },
  /** Output of terminals the agent created through the client `terminal/*` services. */
  onChatTerminalOutput: (
    callback: (event: { sessionId: string; terminalId: string; chunk: string }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; terminalId: string; chunk: string },
    ) => callback(payload);
    ipcRenderer.on(ipcChannels.chatTerminalOutput, handler);
    return () => ipcRenderer.removeListener(ipcChannels.chatTerminalOutput, handler);
  },

  /**
   * Permission round-trip (STEP-23-03). The agent's turn is blocked on the
   * matching `chatPermissionRespond` call, so a listener that drops one of these
   * leaves an agent waiting until the main-process deadline fires.
   */
  onChatPermissionRequest: (
    callback: (event: {
      sessionId: string;
      requestId: string;
      kind: string;
      title: string;
      paths: readonly string[];
      command?: string;
      options: readonly { optionId: string; name: string; kind: string }[];
    }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: {
        sessionId: string;
        requestId: string;
        kind: string;
        title: string;
        paths: readonly string[];
        command?: string;
        options: readonly { optionId: string; name: string; kind: string }[];
      },
    ) => callback(payload);
    ipcRenderer.on(ipcChannels.chatPermissionRequest, handler);
    return () => ipcRenderer.removeListener(ipcChannels.chatPermissionRequest, handler);
  },
  /** Main already resolved this prompt (turn cancel, deadline, dispose): dismiss it. */
  onChatPermissionClose: (
    callback: (event: { sessionId: string; requestId: string; reason: string }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; requestId: string; reason: string },
    ) => callback(payload);
    ipcRenderer.on(ipcChannels.chatPermissionClose, handler);
    return () => ipcRenderer.removeListener(ipcChannels.chatPermissionClose, handler);
  },
  /** Omit `optionId` to cancel — it maps to ACP `cancelled`, never a silent allow. */
  chatPermissionRespond: (sessionId: string, requestId: string, optionId?: string): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.chatPermissionRespond, { sessionId, requestId, optionId }),

  platform: process.platform,
};

contextBridge.exposeInMainWorld('srgnt', api);

declare global {
  interface Window {
    srgnt: typeof api;
  }
}
