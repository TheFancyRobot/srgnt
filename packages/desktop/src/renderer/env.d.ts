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
  id: 'jira' | 'outlook' | 'teams';
  name: string;
  status: 'disconnected' | 'connected' | 'error' | 'refreshing';
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

  // Window controls
  windowMinimize(): Promise<void>;
  windowMaximize(): Promise<void>;
  windowClose(): Promise<void>;
  windowIsMaximized(): Promise<boolean>;
  onWindowMaximizedChange(callback: (isMaximized: boolean) => void): () => void;

  platform: string;
}

declare global {
  interface Window {
    srgnt: SrgntAPI;
  }
}
