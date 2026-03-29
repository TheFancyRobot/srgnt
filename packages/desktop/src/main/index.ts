import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  ipcChannels,
  parseSync,
  SDesktopSettings,
  SLaunchApprovalResolveRequest,
  STerminalLaunchWithContextRequest,
  type DesktopSettings,
  type TerminalLaunchWithContextRequest,
  type UpdateCheckResponse,
} from '@srgnt/contracts';
import { CanonicalStore, createRunLogService, createApprovalService, redactEnv, truncateOutput, DEFAULT_REDACTION_POLICY } from '@srgnt/runtime';
import { taskFixtures, eventFixtures, messageFixtures } from '@srgnt/contracts';
import { createPtySessionManager } from './pty/session-manager.js';
import { createPtyService } from './pty/node-pty-service.js';
import { createCrashReporter } from './crash.js';
import { checkForUpdates } from './updater.js';
import {
  defaultDesktopSettings,
  ensureWorkspaceLayout,
  mergeDesktopSettings,
  readBootstrapState,
  readDesktopSettings,
  resolveDefaultWorkspaceRoot,
  writeBootstrapState,
  writeDesktopSettings,
} from './settings.js';

type ConnectorId = 'jira' | 'outlook' | 'teams';

interface ConnectorState {
  id: ConnectorId;
  name: string;
  status: 'disconnected' | 'connected' | 'error' | 'refreshing';
  lastSyncAt?: string;
  lastError?: string;
  entityCounts?: Record<string, number>;
}

const connectorDefinitions: Record<ConnectorId, { name: string; entityCounts: Record<string, number> }> = {
  jira: { name: 'Jira', entityCounts: { task: 6, project: 2 } },
  outlook: { name: 'Outlook Calendar', entityCounts: { event: 5, person: 3 } },
  teams: { name: 'Microsoft Teams', entityCounts: { message: 3, mention: 2 } },
};

let mainWindow: BrowserWindow | null = null;
let workspaceRoot = '';
let desktopSettings: DesktopSettings = { ...defaultDesktopSettings };
let lastUpdateCheck: UpdateCheckResponse = {
  status: 'skipped',
  channel: defaultDesktopSettings.updateChannel,
  checkedAt: new Date(0).toISOString(),
  message: 'Update check has not run yet.',
};

const connectorState = new Map<ConnectorId, ConnectorState>();
const approvalRequests = new Map<string, { id: string; capability: string; reason: string; requestedAt: string; requestedBy: string }>();

const canonicalStore = new CanonicalStore();
for (const task of taskFixtures) {
  canonicalStore.addEntity(task);
}
for (const event of eventFixtures) {
  canonicalStore.addEntity(event);
}
for (const message of messageFixtures) {
  canonicalStore.addEntity(message);
}

const sessionManager = createPtySessionManager();
const ptyService = createPtyService({ sessionManager });
const runLogService = createRunLogService();
const approvalService = createApprovalService();
const pendingLaunches = new Map<string, { resolve: (approved: boolean) => void }>();
const crashReporter = createCrashReporter();
crashReporter.start();

process.on('uncaughtException', async (error) => {
  console.error('[crash] Uncaught exception:', error);
  try {
    await crashReporter.writeCrashReport('uncaughtException', error);
  } finally {
    app.exit(1);
  }
});

process.on('unhandledRejection', async (reason) => {
  console.error('[crash] Unhandled rejection:', reason);
  await crashReporter.writeCrashReport('unhandledRejection', reason);
});

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const forceLocalRenderer = process.env.SRGNT_E2E === '1';

if (process.env.SRGNT_USER_DATA_PATH) {
  app.setPath('userData', process.env.SRGNT_USER_DATA_PATH);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev && !forceLocalRenderer) {
    mainWindow.loadURL('http://localhost:5173');
    if (process.env.SRGNT_E2E !== '1') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeDesktopState(): Promise<void> {
  const userDataPath = app.getPath('userData');
  crashReporter.setCrashDirectory(path.join(userDataPath, 'crashes'));

  const bootstrapState = await readBootstrapState(userDataPath);
  if (!bootstrapState.workspaceRoot) {
    syncConnectorStateFromSettings(defaultDesktopSettings);
    return;
  }

  await setWorkspaceRootInternal(bootstrapState.workspaceRoot);
}

async function setWorkspaceRootInternal(root: string): Promise<string> {
  const resolvedRoot = path.resolve(root);
  workspaceRoot = resolvedRoot;

  await ensureWorkspaceLayout(resolvedRoot);
  await writeBootstrapState(app.getPath('userData'), { workspaceRoot: resolvedRoot });

  desktopSettings = mergeDesktopSettings(await readDesktopSettings(resolvedRoot));
  await writeDesktopSettings(resolvedRoot, desktopSettings);

  crashReporter.setWorkspaceRoot(resolvedRoot);
  syncConnectorStateFromSettings(desktopSettings);
  return resolvedRoot;
}

async function persistDesktopSettings(nextSettings: DesktopSettings): Promise<void> {
  desktopSettings = mergeDesktopSettings(nextSettings);
  if (workspaceRoot) {
    await writeDesktopSettings(workspaceRoot, desktopSettings);
  }
  syncConnectorStateFromSettings(desktopSettings);
}

function syncConnectorStateFromSettings(settings: DesktopSettings): void {
  for (const [id, definition] of Object.entries(connectorDefinitions) as Array<[ConnectorId, (typeof connectorDefinitions)[ConnectorId]]>) {
    const isConnected = settings.connectors[id];
    connectorState.set(id, isConnected ? createConnectedConnector(id, definition.name) : createDisconnectedConnector(id, definition.name));
  }
}

function createDisconnectedConnector(id: ConnectorId, name: string): ConnectorState {
  return { id, name, status: 'disconnected' };
}

function createConnectedConnector(id: ConnectorId, name: string): ConnectorState {
  return {
    id,
    name,
    status: 'connected',
    lastSyncAt: new Date().toISOString(),
    entityCounts: connectorDefinitions[id].entityCounts,
  };
}

async function chooseWorkspaceRoot(): Promise<string> {
  const defaultPath = workspaceRoot || resolveDefaultWorkspaceRoot(app.getPath('home'));
  const result = await dialog.showOpenDialog({
    title: 'Choose srgnt workspace',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return workspaceRoot;
  }

  return setWorkspaceRootInternal(result.filePaths[0]);
}

async function createDefaultWorkspaceRoot(): Promise<string> {
  const defaultRoot = resolveDefaultWorkspaceRoot(app.getPath('home'));
  return setWorkspaceRootInternal(defaultRoot);
}

async function recordUpdateCheck(): Promise<UpdateCheckResponse> {
  lastUpdateCheck = await checkForUpdates(desktopSettings.updateChannel);
  return lastUpdateCheck;
}

app.whenReady().then(async () => {
  await initializeDesktopState();
  createWindow();
  void recordUpdateCheck();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle(ipcChannels.appGetVersion, () => app.getVersion());

ipcMain.handle(ipcChannels.appGetUserDataPath, () => app.getPath('userData'));

ipcMain.handle(ipcChannels.appCheckForUpdates, async () => recordUpdateCheck());

ipcMain.handle(ipcChannels.workspaceGetRoot, () => workspaceRoot);

ipcMain.handle(ipcChannels.workspaceSetRoot, async (_event, root: string) => setWorkspaceRootInternal(root));

ipcMain.handle(ipcChannels.workspaceChooseRoot, async () => chooseWorkspaceRoot());

ipcMain.handle(ipcChannels.workspaceCreateDefaultRoot, async () => createDefaultWorkspaceRoot());

ipcMain.handle(ipcChannels.connectorList, () => ({
  connectors: Array.from(connectorState.values()),
}));

ipcMain.handle(ipcChannels.connectorStatus, (_event, id: ConnectorId) => {
  const connector = connectorState.get(id);
  if (!connector) {
    throw new Error(`Unknown connector: ${id}`);
  }
  return connector;
});

ipcMain.handle(ipcChannels.connectorConnect, async (_event, id: ConnectorId) => {
  const definition = connectorDefinitions[id];
  if (!definition) {
    throw new Error(`Unknown connector: ${id}`);
  }

  connectorState.set(id, createConnectedConnector(id, definition.name));
  await persistDesktopSettings({
    ...desktopSettings,
    connectors: {
      ...desktopSettings.connectors,
      [id]: true,
    },
  });

  return connectorState.get(id);
});

ipcMain.handle(ipcChannels.connectorDisconnect, async (_event, id: ConnectorId) => {
  const definition = connectorDefinitions[id];
  if (!definition) {
    throw new Error(`Unknown connector: ${id}`);
  }

  connectorState.set(id, createDisconnectedConnector(id, definition.name));
  await persistDesktopSettings({
    ...desktopSettings,
    connectors: {
      ...desktopSettings.connectors,
      [id]: false,
    },
  });

  return connectorState.get(id);
});

ipcMain.handle(ipcChannels.settingsGet, () => ({
  workspaceRoot,
  settings: desktopSettings,
}));

ipcMain.handle(ipcChannels.settingsSave, async (_event, payload: DesktopSettings) => {
  const parsedSettings = parseSync(SDesktopSettings, payload);
  await persistDesktopSettings(parsedSettings);
  return {
    workspaceRoot,
    settings: desktopSettings,
  };
});

ipcMain.handle(ipcChannels.skillList, () => ({ skills: [] }));

ipcMain.handle(ipcChannels.skillRun, (_event, _request: { skillName: string; skillVersion: string; parameters?: Record<string, unknown> }) => ({
  runId: `run-${Date.now()}`,
  status: 'pending',
}));

ipcMain.handle(ipcChannels.skillCancel, (_event, runId: string) => ({
  runId,
  status: 'cancelled',
}));

ipcMain.handle(ipcChannels.approvalRequest, (_event, request: { id: string; capability: string; reason: string; requestedBy: string }) => {
  approvalRequests.set(request.id, {
    ...request,
    requestedAt: new Date().toISOString(),
  });
});

ipcMain.handle(ipcChannels.approvalResolve, (_event, payload: { id: string; approved: boolean }) => {
  approvalRequests.delete(payload.id);
});

ipcMain.handle(ipcChannels.terminalSpawn, async (_event, options) => {
  const { session } = await ptyService.spawn(options || {});
  ptyService.onData(session.id, (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', session.id, data);
    }
  });
  ptyService.onExit(session.id, (exitCode) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', session.id, exitCode);
    }
  });
  return { sessionId: session.id, pid: session.process.pid };
});

ipcMain.handle(ipcChannels.terminalWrite, (_event, payload: { sessionId: string; data: string }) => {
  ptyService.write(payload.sessionId, payload.data);
});

ipcMain.handle(ipcChannels.terminalResize, (_event, payload: { sessionId: string; rows: number; cols: number }) => {
  ptyService.resize(payload.sessionId, payload.rows, payload.cols);
});

ipcMain.handle(ipcChannels.terminalClose, (_event, payload: { sessionId: string }) => {
  ptyService.kill(payload.sessionId);
});

ipcMain.handle(ipcChannels.terminalList, () => ({
  sessions: ptyService.list().map((session) => ({
    id: session.id,
    pid: session.process.pid,
    isActive: session.isActive,
    startedAt: session.startedAt.toISOString(),
  })),
}));

ipcMain.handle(ipcChannels.terminalLaunchWithContext, async (_event, rawPayload) => {
  const payload = parseSync(STerminalLaunchWithContextRequest, rawPayload);
  const { launchContext, rows = 24, cols = 80 } = payload;

  const intent = launchContext.intent ?? 'artifactAffecting';
  const requiresApproval = intent === 'artifactAffecting';

  if (requiresApproval) {
    const template = {
      id: `terminal-direct-${Date.now()}`,
      name: 'Terminal Command',
      description: `Direct terminal command: ${launchContext.command || 'bash'}`,
      command: launchContext.command || 'bash',
      args: [],
      intent: 'artifactAffecting' as const,
      requiredCapabilities: [],
    };

    const approval = approvalService.requestApproval(launchContext, template);

    if (!mainWindow || mainWindow.isDestroyed()) {
      return {
        sessionId: '',
        pid: 0,
        launchId: launchContext.launchId,
        status: 'approval-pending',
        approvalId: approval.id,
      };
    }

    mainWindow.webContents.send(ipcChannels.launchApprovalRequired, {
      approvalId: approval.id,
      launchContext,
      command: launchContext.command || 'bash',
      riskLevel: 'high',
      requiresApproval: true,
    });

    return new Promise<{
      sessionId: string;
      pid: number;
      launchId: string;
      status: 'approved' | 'denied';
    }>((resolve) => {
      pendingLaunches.set(approval.id, {
        resolve: (approved: boolean) => {
          pendingLaunches.delete(approval.id);
          if (!approved) {
            resolve({ sessionId: '', pid: 0, launchId: launchContext.launchId, status: 'denied' });
            return;
          }
          launchApproved(launchContext, rows, cols).then((result) => resolve(result));
        },
      });

      setTimeout(() => {
        if (pendingLaunches.has(approval.id)) {
          pendingLaunches.delete(approval.id);
          approvalService.deny(approval.id);
          resolve({ sessionId: '', pid: 0, launchId: launchContext.launchId, status: 'denied' });
        }
      }, 5 * 60 * 1000);
    });
  }

  return launchApproved(launchContext, rows, cols);
});

async function writeRunLogToDisk(logId: string, markdown: string) {
  const runsDir = path.join(workspaceRoot || app.getPath('userData'), '.command-center', 'runs');
  await fs.mkdir(runsDir, { recursive: true });
  const filePath = path.join(runsDir, `${logId}.md`);
  await fs.writeFile(filePath, markdown, 'utf-8');
}

async function launchApproved(
  launchContext: TerminalLaunchWithContextRequest['launchContext'],
  rows: number,
  cols: number
): Promise<{ sessionId: string; pid: number; launchId: string; status: 'approved' }> {
  const log = runLogService.startRun(launchContext.launchId, launchContext, launchContext.command || 'bash');
  await writeRunLogToDisk(log.id, runLogService.toMarkdown(log));

  const { session } = await ptyService.spawn({
    command: launchContext.command,
    args: [],
    cwd: launchContext.workingDirectory,
    env: launchContext.env || {},
    rows,
    cols,
  });

  ptyService.onData(session.id, (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', session.id, data);
    }
  });

  ptyService.onExit(session.id, async (exitCode) => {
    const output = '';
    const completedLog = runLogService.completeRun(launchContext.launchId, exitCode, output);
    if (completedLog) {
      const redactedOutput = redactEnv(runLogService.getRun(launchContext.launchId)?.context.env || {}, DEFAULT_REDACTION_POLICY);
      completedLog.outputSummary = truncateOutput(output, 500);
      completedLog.redactedFields = redactedOutput.redactedFields;
      await writeRunLogToDisk(completedLog.id, runLogService.toMarkdown(completedLog));
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', session.id, exitCode);
    }
  });

  return { sessionId: session.id, pid: session.process.pid, launchId: launchContext.launchId, status: 'approved' };
}

ipcMain.handle(ipcChannels.launchApprovalResolve, (_event, rawPayload) => {
  const payload = parseSync(SLaunchApprovalResolveRequest, rawPayload);
  const pending = pendingLaunches.get(payload.approvalId);
  if (pending) {
    if (payload.approved) {
      approvalService.approve(payload.approvalId);
    } else {
      approvalService.deny(payload.approvalId);
    }
    pending.resolve(payload.approved);
  }
  return { resolved: !!pending };
});

ipcMain.handle(ipcChannels.entitiesList, () => ({
  entities: canonicalStore.listEntities(),
}));

ipcMain.handle(ipcChannels.runHistoryList, () => {
  const runs = runLogService.listRuns();
  return {
    runs: runs.map((r) => ({
      id: r.id,
      launchId: r.launchId,
      command: r.command,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime?.toISOString(),
      exitCode: r.exitCode,
      outputSummary: r.outputSummary,
      redactedFields: r.redactedFields,
    })),
  };
});

ipcMain.handle(ipcChannels.runHistoryGet, (_event, request: { launchId: string }) => {
  const run = runLogService.getRun(request.launchId);
  if (!run) return { run: undefined };
  return {
    run: {
      id: run.id,
      launchId: run.launchId,
      command: run.command,
      startTime: run.startTime.toISOString(),
      endTime: run.endTime?.toISOString(),
      exitCode: run.exitCode,
      outputSummary: run.outputSummary,
      redactedFields: run.redactedFields,
    },
  };
});

ipcMain.handle(ipcChannels.runLogSave, async (_event, request: { content: string; runId: string; launchId: string }) => {
  const runsDir = path.join(workspaceRoot || app.getPath('userData'), '.command-center', 'runs');
  await fs.mkdir(runsDir, { recursive: true });
  const filename = `${request.runId}.md`;
  const filePath = path.join(runsDir, filename);
  await fs.writeFile(filePath, request.content, 'utf-8');
  return { path: filePath };
});

ipcMain.handle(ipcChannels.briefingSave, async (_event, request: { content: string; metadata: { id: string; runId: string; generatedAt: string; sources: Record<string, string> } }) => {
  const artifactsDir = path.join(workspaceRoot || app.getPath('userData'), '.command-center', 'artifacts');
  await fs.mkdir(artifactsDir, { recursive: true });
  const filename = `${request.metadata.id}.md`;
  const filePath = path.join(artifactsDir, filename);
  await fs.writeFile(filePath, request.content, 'utf-8');
  return { path: filePath };
});

ipcMain.handle(ipcChannels.briefingList, async () => {
  const artifactsDir = path.join(workspaceRoot || app.getPath('userData'), '.command-center', 'artifacts');
  try {
    const files = await fs.readdir(artifactsDir);
    const markdownFiles = files.filter((entry) => entry.endsWith('.md'));
    const briefings = await Promise.all(
      markdownFiles.map(async (filename) => {
        const filePath = path.join(artifactsDir, filename);
        const stat = await fs.stat(filePath);
        const id = filename.replace('.md', '');
        return {
          id,
          path: filePath,
          generatedAt: stat.mtime.toISOString(),
        };
      }),
    );
    return { briefings };
  } catch {
    return { briefings: [] };
  }
});

ipcMain.handle(ipcChannels.crashWriteTestLog, async () => {
  const sampleError = new Error(
    `Diagnostic crash at ${workspaceRoot || '/tmp/srgnt-workspace'} token=top-secret user@example.com`,
  );
  await crashReporter.writeCrashReport('diagnostic', sampleError, {
    workflow: 'release-qa',
    workspaceRoot,
  });
  return {
    directory: path.join(app.getPath('userData'), 'crashes'),
  };
});
