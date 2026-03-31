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
  connectorList: 'connector:list',
  connectorStatus: 'connector:status',
  connectorConnect: 'connector:connect',
  connectorDisconnect: 'connector:disconnect',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  skillList: 'skill:list',
  skillRun: 'skill:run',
  skillCancel: 'skill:cancel',
  approvalRequest: 'approval:request',
  approvalResolve: 'approval:resolve',
  terminalSpawn: 'terminal:spawn',
  terminalWrite: 'terminal:write',
  terminalResize: 'terminal:resize',
  terminalClose: 'terminal:close',
  terminalList: 'terminal:list',
  terminalLaunchWithContext: 'terminal:launch-with-context',
  launchApprovalRequired: 'launch:approval-required',
  launchApprovalResolve: 'launch:approval-resolve',
  runHistoryList: 'run-history:list',
  runHistoryGet: 'run-history:get',
  runLogSave: 'run-log:save',
  entitiesList: 'entities:list',
  briefingSave: 'briefing:save',
  briefingList: 'briefing:list',
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
} as const;

export interface DesktopConnectorState {
  id: 'jira' | 'outlook' | 'teams';
  name: string;
  status: 'disconnected' | 'connected' | 'error' | 'refreshing';
  lastSyncAt?: string;
  lastError?: string;
  entityCounts?: Record<string, number>;
}

const api = {
  checkForUpdates: (): Promise<UpdateCheckResponse> => ipcRenderer.invoke(ipcChannels.appCheckForUpdates),

  getWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceGetRoot),
  setWorkspaceRoot: (root: string): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceSetRoot, root),
  chooseWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceChooseRoot),
  createDefaultWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceCreateDefaultRoot),

  listConnectors: (): Promise<{ connectors: DesktopConnectorState[] }> => ipcRenderer.invoke(ipcChannels.connectorList),
  connectConnector: (id: string): Promise<DesktopConnectorState> => ipcRenderer.invoke(ipcChannels.connectorConnect, id),
  disconnectConnector: (id: string): Promise<DesktopConnectorState> => ipcRenderer.invoke(ipcChannels.connectorDisconnect, id),

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

  saveBriefing: (request: { content: string; metadata: { id: string; runId: string; generatedAt: string; sources: Record<string, string> } }): Promise<{ path: string }> =>
    ipcRenderer.invoke(ipcChannels.briefingSave, request),
  listBriefings: (): Promise<{ briefings: { id: string; path: string; generatedAt: string }[] }> =>
    ipcRenderer.invoke(ipcChannels.briefingList),

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
  notesResolveWikilink: (wikilink: string): Promise<{ resolved: boolean; path: string; line?: number }> =>
    ipcRenderer.invoke(ipcChannels.notesResolveWikilink, { wikilink }),
  notesListWorkspaceMarkdown: (query?: string, maxResults?: number): Promise<{ files: { title: string; path: string; modifiedAt: string }[] }> =>
    ipcRenderer.invoke(ipcChannels.notesListWorkspaceMarkdown, { query: query ?? '', maxResults: maxResults ?? 20 }),

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

  platform: process.platform,
};

contextBridge.exposeInMainWorld('srgnt', api);

declare global {
  interface Window {
    srgnt: typeof api;
  }
}
