/// <reference types="@testing-library/jest-dom/vitest" />

import type { TerminalLaunchWithContextRequest, TerminalLaunchWithContextResponse } from '@srgnt/contracts';

export interface SrgntDesktopSettings {
  theme: 'system' | 'light' | 'dark';
  updateChannel: 'stable' | 'beta' | 'nightly';
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
  connectors: {
    jira: boolean;
    outlook: boolean;
    teams: boolean;
  };
  debugMode: boolean;
  maxConcurrentRuns: '1' | '3' | '5';
}

export interface SrgntUpdateCheckResponse {
  status: 'available' | 'not-available' | 'error' | 'skipped';
  channel: 'stable' | 'beta' | 'nightly';
  checkedAt: string;
  message: string;
  version?: string;
}

/**
 * Global type declarations for the renderer process.
 *
 * The preload script exposes `window.srgnt` via contextBridge, but the
 * renderer tsconfig does not include the preload directory. This file
 * mirrors the API surface so renderer code gets full type-safety.
 *
 * If the preload API changes, update this file to match.
 */

export interface SrgntTerminalSpawnOptions {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  rows?: number;
  cols?: number;
}

export interface SrgntAPI {
  // App
  getAppVersion(): Promise<string>;
  getUserDataPath(): Promise<string>;
  checkForUpdates(): Promise<SrgntUpdateCheckResponse>;

  // Workspace
  getWorkspaceRoot(): Promise<string>;
  setWorkspaceRoot(root: string): Promise<string>;
  chooseWorkspaceRoot(): Promise<string>;
  createDefaultWorkspaceRoot(): Promise<string>;

  // Connectors
  listConnectors(): Promise<{
    connectors: {
      id: 'jira' | 'outlook' | 'teams';
      name: string;
      status: 'disconnected' | 'connected' | 'error' | 'refreshing';
      lastSyncAt?: string;
      lastError?: string;
      entityCounts?: Record<string, number>;
    }[];
  }>;
  getConnectorStatus(id: string): Promise<{
    id: string;
    name: string;
    status: 'disconnected' | 'connected' | 'error' | 'refreshing';
    lastSyncAt?: string;
    lastError?: string;
    entityCounts?: Record<string, number>;
  }>;
  connectConnector(id: string): Promise<{
    id: 'jira' | 'outlook' | 'teams';
    name: string;
    status: 'disconnected' | 'connected' | 'error' | 'refreshing';
    lastSyncAt?: string;
    lastError?: string;
    entityCounts?: Record<string, number>;
  }>;
  disconnectConnector(id: string): Promise<{
    id: 'jira' | 'outlook' | 'teams';
    name: string;
    status: 'disconnected' | 'connected' | 'error' | 'refreshing';
    lastSyncAt?: string;
    lastError?: string;
    entityCounts?: Record<string, number>;
  }>;
  getDesktopSettings(): Promise<{ workspaceRoot: string; settings: SrgntDesktopSettings }>;
  saveDesktopSettings(settings: SrgntDesktopSettings): Promise<{ workspaceRoot: string; settings: SrgntDesktopSettings }>;

  // Skills
  listSkills(): Promise<{ skills: { name: string; version: string }[] }>;
  runSkill(
    skillName: string,
    skillVersion: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ runId: string; status: string }>;
  cancelSkill(runId: string): Promise<{ runId: string; status: string }>;

  // Approvals
  requestApproval(request: {
    id: string;
    capability: string;
    reason: string;
    requestedBy: string;
  }): Promise<void>;
  resolveApproval(id: string, approved: boolean): Promise<void>;

  // Terminal
  terminalSpawn(
    options?: SrgntTerminalSpawnOptions,
  ): Promise<{ sessionId: string; pid: number }>;
  terminalWrite(sessionId: string, data: string): Promise<void>;
  terminalResize(sessionId: string, rows: number, cols: number): Promise<void>;
  terminalClose(sessionId: string): Promise<void>;
  terminalList(): Promise<{
    sessions: {
      id: string;
      pid: number;
      isActive: boolean;
      startedAt: string;
    }[];
  }>;
  onTerminalData(
    callback: (sessionId: string, data: string) => void,
  ): () => void;
  onTerminalExit(
    callback: (sessionId: string, exitCode: number) => void,
  ): () => void;
  terminalLaunchWithContext(
    request: TerminalLaunchWithContextRequest,
  ): Promise<TerminalLaunchWithContextResponse>;

  // Entities (fixture-level for Phase 05)
  listEntities(): Promise<{ entities: unknown[] }>;

  // Briefing persistence
  saveBriefing(request: {
    content: string;
    metadata: {
      id: string;
      runId: string;
      generatedAt: string;
      sources: Record<string, string>;
    };
  }): Promise<{ path: string }>;
  listBriefings(): Promise<{
    briefings: { id: string; path: string; generatedAt: string }[];
  }>;
  writeDiagnosticCrashLog(): Promise<{ directory: string }>;
}

declare global {
  interface Window {
    srgnt: SrgntAPI;
  }
}
