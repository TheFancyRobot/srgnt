import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createServer, type Server } from 'node:http';

// On Linux, use ANGLE's Vulkan backend when available to avoid eglCreateImage
// EGL_BAD_MATCH crashes with Mesa drivers on Wayland. Falls back to default
// ANGLE/EGL on systems without Vulkan.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');

  const vulkanAvailable =
    existsSync('/usr/lib/libvulkan.so.1') ||
    existsSync('/usr/lib64/libvulkan.so.1') ||
    existsSync('/usr/lib/x86_64-linux-gnu/libvulkan.so.1') ||
    existsSync('/usr/lib/aarch64-linux-gnu/libvulkan.so.1');

  if (vulkanAvailable) {
    app.commandLine.appendSwitch('use-angle', 'vulkan');
  }
}

import {
  ipcChannels,
  parseSync,
  SApprovalResolveRequest,
  SBriefingSaveRequest,
  ConnectorId,
  ConnectorManifest,
  SConnectorId,
  SConnectorManifest,
  SDesktopSettings,
  SIpcApprovalRequest,
  SLaunchApprovalResolveRequest,
  SRunHistoryGetRequest,
  SRunLogSaveRequest,
  SSemanticSearchInitRequest,
  SSemanticSearchEnableForWorkspaceRequest,
  SSemanticSearchIndexWorkspaceRequest,
  SSemanticSearchRebuildAllRequest,
  SSemanticSearchSearchRequest,
  SSemanticSearchStatusRequest,
  STerminalCloseRequest,
  STerminalLaunchWithContextRequest,
  STerminalResizeRequest,
  STerminalSpawnRequest,
  STerminalWriteRequest,
  type DesktopSettings,
  type TerminalLaunchWithContextRequest,
  type UpdateCheckResponse,
} from '@srgnt/contracts';
import {
  BUILTIN_CONNECTOR_MANIFESTS,
} from '@srgnt/connectors';
import { CanonicalStore, createRunLogService, createApprovalService, redactEnv, truncateOutput, DEFAULT_REDACTION_POLICY } from '@srgnt/runtime';
import { taskFixtures, eventFixtures, messageFixtures } from '@srgnt/contracts';
import { createPtySessionManager } from './pty/session-manager.js';
import { createPtyService } from './pty/node-pty-service.js';
import { createCrashReporter } from './crash.js';
import { checkForUpdates } from './updater.js';
import { ensureNotesDir, registerNotesHandlers } from './notes.js';
import { createShellOpenExternalHandler } from './shell-open-external.js';
import {
  createSemanticSearchHost,
  createWorkspaceWatcher,
  createEmptyStatus,
  createStatusFromIndexResult,
  createIndexingStatus,
  createErrorStatus,
  type SemanticSearchStatus,
  type WorkspaceWatcher,
} from './semantic-search/index.js';
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
import { ConnectorPackageHost, nullSpawn } from './connectors/index.js';

const HOST_SDK_VERSION = '1.0.0';

interface ConnectorState {
  id: ConnectorId;
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

interface ConnectorDefinition {
  manifest: ConnectorManifest;
  packageUrl?: string;
  entityCounts?: Record<string, number>;
}

interface RegistryConnectorResponse {
  manifest: ConnectorManifest;
  packagePath?: string;
  packageUrl?: string;
  entityCounts?: Record<string, number>;
}

interface RegistryCatalogResponse {
  connectors: RegistryConnectorResponse[];
}

const DEV_CONNECTOR_REGISTRY_PORT = Number(process.env.SRGNT_CONNECTOR_REGISTRY_PORT ?? 4311);
const DEV_CONNECTOR_REGISTRY_PATH = '/connectors';
const DEFAULT_CONNECTOR_CATALOG_PATH = `${DEV_CONNECTOR_REGISTRY_PATH}/catalog.json`;
const DEV_CONNECTOR_REGISTRY_ROOT = path.resolve(__dirname, '../dev-connectors');
const DEV_CONNECTOR_REGISTRY_HOST = '127.0.0.1';
const DEV_CONNECTOR_REGISTRY_URL = `${`http://${DEV_CONNECTOR_REGISTRY_HOST}`}:${DEV_CONNECTOR_REGISTRY_PORT}`;

const builtinConnectorDefinitions: Record<string, Omit<ConnectorDefinition, 'packageUrl'>> = Object.fromEntries(
  BUILTIN_CONNECTOR_MANIFESTS.map((manifest: ConnectorManifest) => [manifest.id, { manifest }])
);

let connectorDefinitions: Record<string, ConnectorDefinition> = Object.entries(builtinConnectorDefinitions).reduce((next, [id, def]) => {
  next[id] = {
    ...def,
    packageUrl: `${DEV_CONNECTOR_REGISTRY_URL}${DEV_CONNECTOR_REGISTRY_PATH}/packages/${id}.json`,
  };
  return next;
}, {} as Record<string, ConnectorDefinition>);

let devConnectorRegistryServer: Server | null = null;
let connectorRegistryBaseUrl: string | null = null;

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

// Connector package host: owns installed-package registry + isolated loader
// boundary. Runs third-party packages through `nullSpawn` until Step 05 wires
// CLI install commands and the worker script is bundled. Built-in connectors
// are registered through `@srgnt/connectors` and do not use this runtime.
const connectorPackageHost = new ConnectorPackageHost({
  spawnRuntime: nullSpawn,
  hostSdkVersion: HOST_SDK_VERSION,
  persistRegistry: async (snapshot) => {
    desktopSettings = mergeDesktopSettings({
      ...desktopSettings,
      connectors: {
        ...desktopSettings.connectors,
        installedPackages: snapshot,
      },
    });
    if (workspaceRoot) {
      await writeDesktopSettings(workspaceRoot, desktopSettings);
    }
  },
  onRuntimeCrash: (packageId, reason) => {
    console.warn('[main] connector package crash', { packageId, reason });
  },
});
const semanticSearchHost = createSemanticSearchHost();
let semanticSearchEnabled = false;
let semanticSearchWatcher: WorkspaceWatcher | null = null;
let semanticSearchStatus: SemanticSearchStatus = createEmptyStatus();

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
const SAFE_STORAGE_STEM_PATTERN = /[^A-Za-z0-9_-]+/g;

if (process.env.SRGNT_USER_DATA_PATH) {
  app.setPath('userData', process.env.SRGNT_USER_DATA_PATH);
}

function normalizeWorkspaceRootInput(root: string): string {
  const trimmed = root.trim();
  if (!trimmed) {
    throw new Error('Workspace root is required.');
  }
  return trimmed;
}

function sanitizeStorageStem(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(SAFE_STORAGE_STEM_PATTERN, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return sanitized || `${fallback}-${Date.now()}`;
}

async function getConnectorRegistrySourcePath(): Promise<string | null> {
  const candidates = [
    process.env.SRGNT_CONNECTOR_REGISTRY_ROOT,
    DEV_CONNECTOR_REGISTRY_ROOT,
    process.env.SRGNT_DEV_CONNECTORS_PATH,
    path.resolve(process.cwd(), 'packages/desktop/dev-connectors'),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const info = await fs.stat(candidate);
      if (info.isDirectory()) {
        return candidate;
      }
    } catch {
      // continue
    }
  }

  return null;
}

async function startDevConnectorRegistryServer(): Promise<void> {
  if (!isDev || process.env.SRGNT_DISABLE_DEV_CONNECTOR_REGISTRY === '1') {
    return;
  }

  if (devConnectorRegistryServer) {
    return;
  }

  const sourcePath = await getConnectorRegistrySourcePath();
  if (!sourcePath) {
    return;
  }

  const requestCatalog = async (pathname: string, response: import('node:http').ServerResponse): Promise<void> => {
    const normalized = pathname.split('?')[0];

    if (normalized === DEFAULT_CONNECTOR_CATALOG_PATH) {
      const catalogPath = path.join(sourcePath, 'catalog.json');
      const raw = await fs.readFile(catalogPath, 'utf8');
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(200);
      response.end(raw);
      return;
    }

    if (!normalized.startsWith(`${DEV_CONNECTOR_REGISTRY_PATH}/packages/`) || !normalized.endsWith('.json')) {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    const packageFile = normalized.slice(`${DEV_CONNECTOR_REGISTRY_PATH}/packages/`.length);
    if (packageFile.includes('/') || packageFile.includes('..')) {
      response.writeHead(400);
      response.end('invalid package path');
      return;
    }

    const packagePath = path.join(sourcePath, 'packages', packageFile);
    const raw = await fs.readFile(packagePath, 'utf8');
    response.setHeader('Content-Type', 'application/json');
    response.writeHead(200);
    response.end(raw);
  };

  const requestListener = (req: import('node:http').IncomingMessage, response: import('node:http').ServerResponse): void => {
    const target = new URL(req.url ?? '/', DEV_CONNECTOR_REGISTRY_URL);
    void requestCatalog(target.pathname, response).catch(() => {
      response.writeHead(500);
      response.end('connector registry error');
    });
  };

  devConnectorRegistryServer = createServer(requestListener);

  await new Promise<void>((resolve, reject) => {
    devConnectorRegistryServer!.listen(DEV_CONNECTOR_REGISTRY_PORT, DEV_CONNECTOR_REGISTRY_HOST, () => {
      connectorRegistryBaseUrl = DEV_CONNECTOR_REGISTRY_URL;
      console.log('[main] started local connector registry server', connectorRegistryBaseUrl);
      resolve();
    });

    devConnectorRegistryServer!.once('error', (error) => {
      const nextError = error as NodeJS.ErrnoException;
      if (nextError.code === 'EADDRINUSE') {
        console.warn('[main] connector registry port already in use', DEV_CONNECTOR_REGISTRY_PORT);
      } else {
        console.warn('[main] failed to start local connector registry', nextError.message);
      }
      connectorRegistryBaseUrl = null;
      reject(error);
      void devConnectorRegistryServer?.close();
      devConnectorRegistryServer = null;
    });
  }).catch(() => {
    // fallback to static built-in catalog
    devConnectorRegistryServer = null;
  });
}

async function fetchConnectorCatalogFromRemote(url: string): Promise<Record<string, ConnectorDefinition>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch connector catalog from ${url}`);
  }

  const rawPayload = await response.json();
  const parsedPayload = rawPayload as RegistryCatalogResponse;

  const entries = Array.isArray(parsedPayload?.connectors) ? parsedPayload.connectors : [];
  const nextDefinitions: Record<string, ConnectorDefinition> = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const manifest = parseSync(SConnectorManifest, entry.manifest);
    const packageUrl = entry.packageUrl ?? (entry.packagePath ? `${connectorRegistryBaseUrl ?? DEV_CONNECTOR_REGISTRY_URL}${entry.packagePath}` : undefined);

    nextDefinitions[manifest.id] = {
      manifest,
      packageUrl,
      entityCounts: entry.entityCounts,
    };
  }

  return nextDefinitions;
}

function buildConnectorCatalogSource(): string | null {
  if (process.env.SRGNT_CONNECTOR_CATALOG_URL) {
    return process.env.SRGNT_CONNECTOR_CATALOG_URL;
  }

  return isDev ? `${connectorRegistryBaseUrl ?? DEV_CONNECTOR_REGISTRY_URL}${DEFAULT_CONNECTOR_CATALOG_PATH}` : null;
}

async function refreshConnectorDefinitions(): Promise<void> {
  await startDevConnectorRegistryServer();

  const registryUrl = buildConnectorCatalogSource();
  if (!registryUrl) {
    connectorDefinitions = {
      ...Object.fromEntries(
        Object.entries(builtinConnectorDefinitions).map(([id, definition]) => [
          id,
          {
            manifest: definition.manifest,
            entityCounts: definition.entityCounts,
            packageUrl: `${DEV_CONNECTOR_REGISTRY_URL}${DEV_CONNECTOR_REGISTRY_PATH}/packages/${id}.json`,
          },
        ]),
      ),
    };
    return;
  }

  try {
    connectorDefinitions = await fetchConnectorCatalogFromRemote(registryUrl);
    if (Object.keys(connectorDefinitions).length === 0) {
      throw new Error('Empty catalog payload.');
    }
  } catch (error) {
    console.warn('[main] connector catalog fetch failed, using built-in catalog', error);
    connectorDefinitions = {
      ...Object.fromEntries(
        Object.entries(builtinConnectorDefinitions).map(([id, definition]) => [
          id,
          {
            manifest: definition.manifest,
            entityCounts: definition.entityCounts,
            packageUrl: `${DEV_CONNECTOR_REGISTRY_URL}${DEV_CONNECTOR_REGISTRY_PATH}/packages/${id}.json`,
          },
        ]),
      ),
    };
  }
}

async function fetchAndValidateConnectorPackage(connectorId: string, definition: ConnectorDefinition): Promise<void> {
  if (!definition.packageUrl) {
    return;
  }

  const response = await fetch(definition.packageUrl);
  if (!response.ok) {
    throw new Error(`Connector package download failed: ${definition.packageUrl}`);
  }

  const rawPayload = (await response.json()) as { manifest?: unknown };
  const packageManifest = parseSync(SConnectorManifest, rawPayload.manifest ?? rawPayload);

  if (packageManifest.id !== connectorId) {
    throw new Error(`Connector package id mismatch for ${connectorId}`);
  }

  connectorDefinitions[connectorId] = {
    ...definition,
    manifest: packageManifest,
    packageUrl: definition.packageUrl,
  };
}

function getManagedMarkdownPath(directory: 'runs' | 'artifacts', stem: string): string {
  const root = workspaceRoot || app.getPath('userData');
  const fileName = `${sanitizeStorageStem(stem, directory === 'runs' ? 'run' : 'artifact')}.md`;
  return path.join(root, '.command-center', directory, fileName);
}

function hardenWindow(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  window.webContents.on('will-navigate', (event, url) => {
    const currentUrl = window.webContents.getURL();
    if (currentUrl && url !== currentUrl) {
      event.preventDefault();
    }
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  hardenWindow(mainWindow);

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false);
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

  await refreshConnectorDefinitions();

  const bootstrapState = await readBootstrapState(userDataPath);
  if (!bootstrapState.workspaceRoot) {
    syncConnectorStateFromSettings(defaultDesktopSettings);
    await syncConnectorPackageHostFromSettings(defaultDesktopSettings);
    return;
  }

  await setWorkspaceRootInternal(bootstrapState.workspaceRoot);
}

async function setWorkspaceRootInternal(root: string): Promise<string> {
  const resolvedRoot = path.resolve(root);
  const previousWorkspaceRoot = workspaceRoot;
  workspaceRoot = resolvedRoot;

  // Stop semantic search watcher if running
  if (semanticSearchWatcher) {
    console.log('[main] stopping semantic search watcher');
    semanticSearchWatcher.stop();
    semanticSearchWatcher = null;
  }

  // Tear down semantic search if workspace root changes
  if (previousWorkspaceRoot !== '' && previousWorkspaceRoot !== resolvedRoot) {
    console.log('[main] workspace root changed, tearing down semantic search');
    await semanticSearchHost.teardown();
    semanticSearchEnabled = false;
  }

  await ensureWorkspaceLayout(resolvedRoot);
  await ensureNotesDir(resolvedRoot);
  await writeBootstrapState(app.getPath('userData'), { workspaceRoot: resolvedRoot });

  desktopSettings = mergeDesktopSettings(await readDesktopSettings(resolvedRoot));
  await writeDesktopSettings(resolvedRoot, desktopSettings);

  crashReporter.setWorkspaceRoot(resolvedRoot);
  syncConnectorStateFromSettings(desktopSettings);
  await syncConnectorPackageHostFromSettings(desktopSettings);
  registerNotesHandlers(workspaceRoot);

  // Initialize semantic search for the new workspace
  try {
    await semanticSearchHost.initialize(resolvedRoot);
  } catch (err) {
    console.error('[main] failed to initialize semantic search:', err);
  }

  return resolvedRoot;
}

async function persistDesktopSettings(nextSettings: DesktopSettings): Promise<void> {
  desktopSettings = mergeDesktopSettings(nextSettings);
  if (workspaceRoot) {
    await writeDesktopSettings(workspaceRoot, desktopSettings);
  }
  syncConnectorStateFromSettings(desktopSettings);
  await syncConnectorPackageHostFromSettings(desktopSettings);
}

function connectorDefinition(id: string): ConnectorDefinition | undefined {
  return connectorDefinitions[id];
}

function createUnknownConnectorManifest(id: string): ConnectorManifest {
  return {
    id,
    name: `Connector ${id}`,
    version: '0.1.0',
    description: `External connector package: ${id}`,
    provider: 'external',
    authType: 'none',
    config: {
      authType: 'none',
      timeout: 30000,
      retryAttempts: 3,
    },
    capabilities: [],
    entityTypes: [],
    freshnessThresholdMs: 300000,
    metadata: {},
  };
}

function createConnectorManifest(id: string): ConnectorManifest {
  return connectorDefinitions[id]?.manifest ?? createUnknownConnectorManifest(id);
}

function getInstalledStateFromSettings(settings: DesktopSettings, id: ConnectorId): boolean {
  return settings.connectors?.installedConnectorIds?.includes(id) ?? false;
}

function syncConnectorStateFromSettings(settings: DesktopSettings): void {
  const installedConnectorIds = new Set(settings.connectors?.installedConnectorIds ?? []);
  const manifestIds = new Set<string>([...Object.keys(connectorDefinitions), ...installedConnectorIds]);

  const nextState = new Map<ConnectorId, ConnectorState>();

  for (const id of manifestIds) {
    const definition = connectorDefinitions[id];
    const isInstalled = installedConnectorIds.has(id);
    const current = connectorState.get(id);
    const status =
      current?.status === 'connected' || current?.status === 'refreshing'
        ? current.status
        : current?.status === 'connecting' || current?.status === 'error'
          ? current.status
          : 'disconnected';

    if (isInstalled) {
      nextState.set(id, createInstalledConnectorState(id, definition, status));
      continue;
    }

    if (definition) {
      nextState.set(id, createAvailableConnectorState(id, definition));
    }
  }

  connectorState.clear();
  for (const [id, state] of nextState.entries()) {
    connectorState.set(id, state);
  }
}

async function syncConnectorPackageHostFromSettings(settings: DesktopSettings): Promise<void> {
  const durablePackages = settings.connectors?.installedPackages?.packages ?? [];
  // Clear any previously seeded packages so workspace switches do not carry
  // stale runtime state from an earlier workspace.
  for (const existing of connectorPackageHost.listPackages()) {
    await connectorPackageHost.uninstall(existing.packageId);
  }
  for (const pkg of durablePackages) {
    await connectorPackageHost.registerInstalledPackage(pkg);
  }
  await connectorPackageHost.applyRestartRecovery();
}

function createAvailableConnectorState(id: string, definition?: ConnectorDefinition): ConnectorState {
  const manifest = createConnectorManifest(id);
  return {
    ...manifest,
    id,
    installed: false,
    available: Boolean(definition),
    status: 'disconnected',
    entityCounts: definition?.entityCounts,
  };
}

function createInstalledConnectorState(
  id: string,
  definition?: ConnectorDefinition,
  status: ConnectorState['status'] = 'disconnected',
): ConnectorState {
  const manifest = createConnectorManifest(id);
  const state: ConnectorState = {
    ...manifest,
    id,
    installed: true,
    available: true,
    status,
    entityCounts: definition?.entityCounts,
  };

  if (status === 'connected' || status === 'refreshing') {
    return {
      ...state,
      lastSyncAt: new Date().toISOString(),
    };
  }

  return state;
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

  // Initialize semantic search after desktop state is ready
  if (workspaceRoot) {
    try {
      await semanticSearchHost.initialize(workspaceRoot);
      console.log('[main] semantic search initialized on startup for', workspaceRoot);
    } catch (err) {
      console.error('[main] failed to initialize semantic search on startup:', err);
    }
  }

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

ipcMain.handle(ipcChannels.workspaceSetRoot, async (_event, root: string) => setWorkspaceRootInternal(normalizeWorkspaceRootInput(root)));

ipcMain.handle(ipcChannels.workspaceChooseRoot, async () => chooseWorkspaceRoot());

ipcMain.handle(ipcChannels.workspaceCreateDefaultRoot, async () => createDefaultWorkspaceRoot());

ipcMain.handle(ipcChannels.connectorList, () => ({
  connectors: Array.from(connectorState.values()),
}));

function normalizeConnectorId(id: string): ConnectorId {
  return parseSync(SConnectorId, id);
}

function getConnectorOrFallbackState(connectorId: ConnectorId): ConnectorState {
  return (
    connectorState.get(connectorId) ??
    createAvailableConnectorState(connectorId, connectorDefinition(connectorId))
  );
}

ipcMain.handle(ipcChannels.connectorStatus, (_event, id: string) => {
  const connectorId = normalizeConnectorId(id);
  return getConnectorOrFallbackState(connectorId);
});

ipcMain.handle(ipcChannels.connectorInstall, async (_event, id: string) => {
  const connectorId = normalizeConnectorId(id);
  const definition = connectorDefinition(connectorId);

  if (!definition) {
    throw new Error(`Connector ${connectorId} is not available in catalog`);
  }

  try {
    await fetchAndValidateConnectorPackage(connectorId, definition);
  } catch (error) {
    console.warn('[main] failed to validate connector package before install', error);
  }

  const current = desktopSettings.connectors.installedConnectorIds;
  const next = current.includes(connectorId) ? current : [...current, connectorId];

  await persistDesktopSettings({
    ...desktopSettings,
    connectors: {
      ...desktopSettings.connectors,
      installedConnectorIds: next,
    },
  });

  return createInstalledConnectorState(connectorId, definition, 'disconnected');
});

ipcMain.handle(ipcChannels.connectorUninstall, async (_event, id: string) => {
  const connectorId = normalizeConnectorId(id);

  // Idempotent: if not installed, just return available-not-installed state
  if (!getInstalledStateFromSettings(desktopSettings, connectorId)) {
    return createAvailableConnectorState(connectorId, connectorDefinition(connectorId));
  }

  const next = desktopSettings.connectors.installedConnectorIds.filter((installedId) => installedId !== connectorId);

  await persistDesktopSettings({
    ...desktopSettings,
    connectors: {
      ...desktopSettings.connectors,
      installedConnectorIds: next,
    },
  });

  // connectorState is updated by syncConnectorStateFromSettings inside persistDesktopSettings
  return createAvailableConnectorState(connectorId, connectorDefinition(connectorId));
});

ipcMain.handle(ipcChannels.connectorConnect, async (_event, id: string) => {
  const connectorId = normalizeConnectorId(id);
  if (!getInstalledStateFromSettings(desktopSettings, connectorId)) {
    throw new Error(`Connector ${connectorId} is not installed`);
  }

  const definition = connectorDefinition(connectorId);
  if (!definition) {
    throw new Error(`Connector package metadata for ${connectorId} is unavailable`);
  }

  connectorState.set(
    connectorId,
    createInstalledConnectorState(connectorId, definition, 'connected'),
  );

  return connectorState.get(connectorId);
});

ipcMain.handle(ipcChannels.connectorDisconnect, async (_event, id: string) => {
  const connectorId = normalizeConnectorId(id);
  const definition = connectorDefinition(connectorId);

  const nextState = getInstalledStateFromSettings(desktopSettings, connectorId)
    ? createInstalledConnectorState(connectorId, definition, 'disconnected')
    : createAvailableConnectorState(connectorId, definition);

  connectorState.set(connectorId, nextState);

  return connectorState.get(connectorId);
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

ipcMain.handle(ipcChannels.approvalRequest, (_event, rawRequest) => {
  const request = parseSync(SIpcApprovalRequest, {
    ...(rawRequest ?? {}),
    requestedAt: new Date().toISOString(),
  });
  approvalRequests.set(request.id, {
    ...request,
  });
});

ipcMain.handle(ipcChannels.approvalResolve, (_event, rawPayload) => {
  const payload = parseSync(SApprovalResolveRequest, rawPayload);
  approvalRequests.delete(payload.id);
});

ipcMain.handle(ipcChannels.terminalSpawn, async (_event, rawOptions) => {
  const options = parseSync(STerminalSpawnRequest, rawOptions ?? {});
  const { session } = await ptyService.spawn({
    args: [],
    env: {},
    rows: options.rows,
    cols: options.cols,
  });
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

ipcMain.handle(ipcChannels.terminalWrite, (_event, rawPayload) => {
  const payload = parseSync(STerminalWriteRequest, rawPayload);
  ptyService.write(payload.sessionId, payload.data);
});

ipcMain.handle(ipcChannels.terminalResize, (_event, rawPayload) => {
  const payload = parseSync(STerminalResizeRequest, rawPayload);
  ptyService.resize(payload.sessionId, payload.rows, payload.cols);
});

ipcMain.handle(ipcChannels.terminalClose, (_event, rawPayload) => {
  const payload = parseSync(STerminalCloseRequest, rawPayload);
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
  const resolvedCommand = launchContext.command
    || (process.platform === 'win32' ? 'powershell.exe' : process.env['SHELL'] || 'bash');

  if (requiresApproval) {
    const template = {
      id: `terminal-direct-${Date.now()}`,
      name: 'Terminal Command',
      description: `Direct terminal command: ${resolvedCommand}`,
      command: resolvedCommand,
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
      command: resolvedCommand,
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
  const filePath = getManagedMarkdownPath('runs', logId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, markdown, 'utf-8');
}

async function launchApproved(
  launchContext: TerminalLaunchWithContextRequest['launchContext'],
  rows: number,
  cols: number
): Promise<{ sessionId: string; pid: number; launchId: string; status: 'approved' }> {
  const resolvedCommand = launchContext.command
    || (process.platform === 'win32' ? 'powershell.exe' : process.env['SHELL'] || 'bash');
  const log = runLogService.startRun(launchContext.launchId, launchContext, resolvedCommand);
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

ipcMain.handle(ipcChannels.runHistoryGet, (_event, rawRequest) => {
  const request = parseSync(SRunHistoryGetRequest, rawRequest);
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

ipcMain.handle(ipcChannels.runLogSave, async (_event, rawRequest) => {
  const request = parseSync(SRunLogSaveRequest, rawRequest);
  const filePath = getManagedMarkdownPath('runs', request.runId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, request.content, 'utf-8');
  return { path: filePath };
});

ipcMain.handle(ipcChannels.briefingSave, async (_event, rawRequest) => {
  const request = parseSync(SBriefingSaveRequest, rawRequest);
  const filePath = getManagedMarkdownPath('artifacts', request.metadata.id);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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

ipcMain.handle(
  ipcChannels.shellOpenExternal,
  createShellOpenExternalHandler(shell.openExternal),
);

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  const win = mainWindow;
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
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

// ---------------------------------------------------------------------------
// Semantic Search IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle(ipcChannels.semanticSearchInit, async (_event, rawRequest) => {
  parseSync(SSemanticSearchInitRequest, rawRequest ?? {});
  try {
    await semanticSearchHost.initialize(workspaceRoot);
    return {
      initialized: true,
    };
  } catch {
    return {
      initialized: false,
    };
  }
});

ipcMain.handle(ipcChannels.semanticSearchEnableForWorkspace, async (_event, rawRequest) => {
  const request = parseSync(SSemanticSearchEnableForWorkspaceRequest, rawRequest ?? {});
  try {
    await semanticSearchHost.enableForWorkspace(request.workspaceRoot);

    // Start watching workspace for file changes
    if (!semanticSearchWatcher) {
      const indexRoot = path.join(request.workspaceRoot, '.srgnt-semantic-search');
      semanticSearchWatcher = createWorkspaceWatcher({
        workspaceRoot: request.workspaceRoot,
        indexRoot,
        debounceMs: 500,
        onFileChange: (relativePath, _event) => {
          console.log('[main] semantic search: file changed, triggering reindex:', relativePath);
          // Trigger incremental reindex for the changed file
          semanticSearchHost.indexWorkspace(request.workspaceRoot, false).catch((err) => {
            console.error('[main] semantic search: reindex failed:', err);
          });
        },
      });
      semanticSearchWatcher.start();
    }

    semanticSearchEnabled = true;

    // Trigger first-time full indexing
    console.log('[main] semantic search: first enable, triggering full index');
    const result = await semanticSearchHost.indexWorkspace(request.workspaceRoot, false);
    semanticSearchStatus = createStatusFromIndexResult(
      semanticSearchHost.getStatus(),
      request.workspaceRoot,
      result,
      semanticSearchStatus,
    );

    return { enabled: true };
  } catch (err) {
    console.error('[main] semantic search enable failed:', err);
    return { enabled: false };
  }
});

ipcMain.handle(ipcChannels.semanticSearchIndexWorkspace, async (_event, rawRequest) => {
  const request = parseSync(SSemanticSearchIndexWorkspaceRequest, rawRequest ?? {});

  // Update status to indexing with progress
  semanticSearchStatus = createIndexingStatus(
    request.workspaceRoot,
    50, // mid-progress since we don't have real progress tracking yet
    semanticSearchStatus,
  );

  try {
    const result = await semanticSearchHost.indexWorkspace(request.workspaceRoot, request.force);
    semanticSearchStatus = createStatusFromIndexResult(
      semanticSearchHost.getStatus(),
      request.workspaceRoot,
      result,
      semanticSearchStatus,
    );
    return result;
  } catch (err) {
    semanticSearchStatus = createErrorStatus(
      request.workspaceRoot,
      err instanceof Error ? err.message : 'Indexing failed',
      semanticSearchStatus,
    );
    throw err;
  }
});

ipcMain.handle(ipcChannels.semanticSearchRebuildAll, async (_event, rawRequest) => {
  const request = parseSync(SSemanticSearchRebuildAllRequest, rawRequest ?? {});

  // Update status to indexing
  semanticSearchStatus = createIndexingStatus(request.workspaceRoot, 50, semanticSearchStatus);

  try {
    const result = await semanticSearchHost.rebuildAll(request.workspaceRoot);
    semanticSearchStatus = {
      ...semanticSearchStatus,
      state: semanticSearchHost.getStatus(),
      indexedFileCount: result.totalChunkCount,
      totalChunkCount: result.totalChunkCount,
      progressPercent: 100,
      lastIndexedAt: new Date().toISOString(),
    };
    return result;
  } catch (err) {
    semanticSearchStatus = createErrorStatus(
      request.workspaceRoot,
      err instanceof Error ? err.message : 'Rebuild failed',
      semanticSearchStatus,
    );
    throw err;
  }
});

ipcMain.handle(ipcChannels.semanticSearchSearch, async (_event, rawRequest) => {
  const request = parseSync(SSemanticSearchSearchRequest, rawRequest ?? {});
  const results = await semanticSearchHost.search(
    request.query,
    request.workspaceRoot,
    request.maxResults,
    request.minScore,
  );
  return { results };
});

ipcMain.handle(ipcChannels.semanticSearchStatus, async (_event, rawRequest) => {
  const request = parseSync(SSemanticSearchStatusRequest, rawRequest ?? {});
  void request;

  // Get current state from host
  const hostState = semanticSearchHost.getStatus();

  // Return current status with available information
  return {
    state: semanticSearchEnabled ? hostState : 'disabled',
    indexedFileCount: semanticSearchStatus.indexedFileCount,
    totalChunkCount: semanticSearchStatus.totalChunkCount,
    progressPercent: semanticSearchStatus.progressPercent,
    lastIndexedAt: semanticSearchStatus.lastIndexedAt,
    error: semanticSearchStatus.error,
  };
});
