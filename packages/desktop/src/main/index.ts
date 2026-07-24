import { app, BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

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

import { createCrashReporter } from './crash.js';
import { ensureNotesDir, registerNotesHandlers } from './notes.js';
import { createWindowManager } from './services/window.js';
import { createWorkspaceService } from './services/workspace.js';
import { registerSettingsHandlers } from './services/settings.js';
import { createUpdaterService } from './services/updater.js';
import { createTerminalService } from './services/terminal.js';
import { createSemanticSearchService } from './services/semantic-search.js';
import { registerCrashHandlers } from './services/crash.js';
import { registerShellHandlers } from './services/shell.js';
import { registerDevConsoleHandlers } from './dev-console/index.js';
import { registerChatHandlers } from './chat/index.js';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const forceLocalRenderer = process.env.SRGNT_E2E === '1';

if (process.env.SRGNT_USER_DATA_PATH) {
  app.setPath('userData', process.env.SRGNT_USER_DATA_PATH);
}

// ---------------------------------------------------------------------------
// Service composition
// ---------------------------------------------------------------------------

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

const windowManager = createWindowManager({
  preloadPath: path.join(__dirname, '../preload/index.js'),
  rendererHtmlPath: path.join(__dirname, '../renderer/index.html'),
  devServerUrl: 'http://localhost:5173',
  isDev,
  forceLocalRenderer,
  openDevTools: process.env.SRGNT_E2E !== '1',
});

const semanticSearch = createSemanticSearchService({
  getWorkspaceRoot: () => workspace.getRoot(),
});

const workspace = createWorkspaceService({
  getWindow: () => windowManager.getWindow(),
  hooks: {
    beforeRootChanged: (previousRoot, nextRoot) => semanticSearch.handleWorkspaceRootChange(previousRoot, nextRoot),
    prepareWorkspace: (root) => ensureNotesDir(root),
    afterRootChanged: async (root) => {
      crashReporter.setWorkspaceRoot(root);
      registerNotesHandlers(root);
      await semanticSearch.initialize(root);
    },
  },
});

const updater = createUpdaterService({
  getUpdateChannel: () => workspace.getSettings().updateChannel,
});

const terminal = createTerminalService({
  getWindow: () => windowManager.getWindow(),
  getWorkspaceRoot: () => workspace.getRoot(),
  getUserDataPath: () => app.getPath('userData'),
});

// ---------------------------------------------------------------------------
// IPC registration
// ---------------------------------------------------------------------------

updater.registerIpcHandlers();
workspace.registerIpcHandlers();
registerSettingsHandlers(workspace);
terminal.registerIpcHandlers();
semanticSearch.registerIpcHandlers();
registerShellHandlers();
registerCrashHandlers({ crashReporter, getWorkspaceRoot: () => workspace.getRoot() });
windowManager.registerIpcHandlers();

// Flag-gated raw ACP dev console (SRGNT_DEV_CONSOLE=1). With the flag off this
// only registers a `dev:console:enabled` query returning false, so the renderer
// keeps the console invisible and default behavior is unchanged.
const disposeDevConsole = registerDevConsoleHandlers({
  getWindow: () => windowManager.getWindow(),
  getCwd: () => workspace.getRoot() || undefined,
});

// Product chat surface over ephemeral ACP sessions (PHASE-23). Always
// registered, but the harness-backed controller (and any agent process) is only
// constructed once the user actually opens a session.
const disposeChat = registerChatHandlers({
  getWindow: () => windowManager.getWindow(),
  getCwd: () => workspace.getRoot() || undefined,
});

app.on('will-quit', () => {
  void disposeDevConsole();
  // Kill-tree every live chat session so no agent process outlives the app.
  void disposeChat();
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  crashReporter.setCrashDirectory(path.join(app.getPath('userData'), 'crashes'));
  await workspace.initializeFromBootstrap();
  windowManager.createWindow();
  void updater.checkNow();

  // Initialize semantic search after desktop state is ready
  if (workspace.getRoot()) {
    await semanticSearch.initialize(workspace.getRoot());
    console.log('[main] semantic search initialized on startup for', workspace.getRoot());
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
