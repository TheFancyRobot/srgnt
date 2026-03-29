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
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(ipcChannels.appGetVersion),
  getUserDataPath: (): Promise<string> => ipcRenderer.invoke(ipcChannels.appGetUserDataPath),
  checkForUpdates: (): Promise<UpdateCheckResponse> => ipcRenderer.invoke(ipcChannels.appCheckForUpdates),

  getWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceGetRoot),
  setWorkspaceRoot: (root: string): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceSetRoot, root),
  chooseWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceChooseRoot),
  createDefaultWorkspaceRoot: (): Promise<string> => ipcRenderer.invoke(ipcChannels.workspaceCreateDefaultRoot),

  listConnectors: (): Promise<{ connectors: DesktopConnectorState[] }> => ipcRenderer.invoke(ipcChannels.connectorList),
  getConnectorStatus: (id: string): Promise<DesktopConnectorState> => ipcRenderer.invoke(ipcChannels.connectorStatus, id),
  connectConnector: (id: string): Promise<DesktopConnectorState> => ipcRenderer.invoke(ipcChannels.connectorConnect, id),
  disconnectConnector: (id: string): Promise<DesktopConnectorState> => ipcRenderer.invoke(ipcChannels.connectorDisconnect, id),

  getDesktopSettings: (): Promise<DesktopSettingsResponse> => ipcRenderer.invoke(ipcChannels.settingsGet),
  saveDesktopSettings: (settings: DesktopSettings): Promise<DesktopSettingsResponse> => ipcRenderer.invoke(ipcChannels.settingsSave, settings),

  listSkills: (): Promise<{ skills: { name: string; version: string }[] }> => ipcRenderer.invoke(ipcChannels.skillList),
  runSkill: (skillName: string, skillVersion: string, parameters?: Record<string, unknown>): Promise<{ runId: string; status: string }> =>
    ipcRenderer.invoke(ipcChannels.skillRun, { skillName, skillVersion, parameters }),
  cancelSkill: (runId: string): Promise<{ runId: string; status: string }> => ipcRenderer.invoke(ipcChannels.skillCancel, runId),

  requestApproval: (request: { id: string; capability: string; reason: string; requestedBy: string }): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.approvalRequest, request),
  resolveApproval: (id: string, approved: boolean): Promise<void> =>
    ipcRenderer.invoke(ipcChannels.approvalResolve, { id, approved }),

  terminalSpawn: (options?: { command?: string; args?: string[]; env?: Record<string, string>; cwd?: string; rows?: number; cols?: number }): Promise<{ sessionId: string; pid: number }> =>
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
  runHistoryList: (): Promise<{ runs: { id: string; launchId: string; command: string; startTime: string; endTime?: string; exitCode?: number; outputSummary: string; redactedFields: string[] }[] }> =>
    ipcRenderer.invoke(ipcChannels.runHistoryList),
  runHistoryGet: (launchId: string): Promise<{ run?: { id: string; launchId: string; command: string; startTime: string; endTime?: string; exitCode?: number; outputSummary: string; redactedFields: string[] } }> =>
    ipcRenderer.invoke(ipcChannels.runHistoryGet, { launchId }),
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

  listEntities: (): Promise<{ entities: unknown[] }> => ipcRenderer.invoke(ipcChannels.entitiesList),

  saveBriefing: (request: { content: string; metadata: { id: string; runId: string; generatedAt: string; sources: Record<string, string> } }): Promise<{ path: string }> =>
    ipcRenderer.invoke(ipcChannels.briefingSave, request),
  listBriefings: (): Promise<{ briefings: { id: string; path: string; generatedAt: string }[] }> =>
    ipcRenderer.invoke(ipcChannels.briefingList),

  writeDiagnosticCrashLog: (): Promise<{ directory: string }> => ipcRenderer.invoke(ipcChannels.crashWriteTestLog),
};

contextBridge.exposeInMainWorld('srgnt', api);

declare global {
  interface Window {
    srgnt: typeof api;
  }
}
