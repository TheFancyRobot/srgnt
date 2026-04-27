/// <reference types="@testing-library/jest-dom/vitest" />
/// <reference types="vite/client" />

import type {
  DesktopSettings,
  DesktopSettingsResponse,
  LaunchContext,
  TerminalLaunchWithContextRequest,
  UpdateCheckResponse,
} from '@srgnt/contracts';

export interface ConnectorState {
  id: string;
  name: string;
  description: string;
  provider: string;
  version: string;
  installed: boolean;
  available: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'refreshing';
  lastSyncAt?: string;
  lastError?: string;
  entityCounts?: Record<string, number>;
}

export interface SrgntAPI {
  checkForUpdates(): Promise<UpdateCheckResponse>;

  getWorkspaceRoot(): Promise<string>;
  setWorkspaceRoot(root: string): Promise<string>;
  chooseWorkspaceRoot(): Promise<string>;
  createDefaultWorkspaceRoot(): Promise<string>;

  listConnectors(): Promise<{ connectors: ConnectorState[] }>;
  installConnector(id: string): Promise<ConnectorState>;
  uninstallConnector(id: string): Promise<ConnectorState>;
  connectConnector(id: string): Promise<ConnectorState>;
  disconnectConnector(id: string): Promise<ConnectorState>;
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

  saveBriefing(request: { content: string; metadata: { id: string; runId: string; generatedAt: string; sources: Record<string, string> } }): Promise<{ path: string }>;
  listBriefings(): Promise<{ briefings: { id: string; path: string; generatedAt: string }[] }>;
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

  platform: string;

  // Jira connector settings and credentials (DEC-0017)
  getJiraSettings(): Promise<{ settings: unknown } | null>;
  saveJiraSettings(settings: unknown): Promise<{ settings: unknown }>;
  setJiraToken(token: string): Promise<void>;
  getJiraTokenStatus(): Promise<{ connectorId: string; exists: boolean; backend: 'keychain' | 'encrypted-local' | 'unavailable'; preferredBackend: 'keychain' | 'encrypted-local'; keychainAvailable: boolean; encryptedLocalAvailable: boolean }>;
  deleteJiraToken(): Promise<void>;
}

declare global {
  interface Window {
    srgnt: SrgntAPI;
  }
}
