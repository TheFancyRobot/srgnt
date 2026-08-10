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
import { createProjectsService } from './services/projects.js';
import { createSessionsService } from './services/sessions.js';
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

// Project entities (PHASE-24). Re-rooted through the workspace hooks below, and
// its `setWorkspaceRoot` is also where a merge interrupted by a crash is rolled
// forward — before anything reads a session list.
const projects = createProjectsService({
  getWorkspaceRoot: () => workspace.getRoot(),
});

// Session persistence (PHASE-24, STEP-24-03). Re-rooted with the workspace for
// the same reason projects are: an event log opened under the previous root
// holds its file descriptor and advisory lock against a workspace nobody is in.
const sessions = createSessionsService({
  getWorkspaceRoot: () => workspace.getRoot(),
});

// Assigned once the chat handlers are registered below; the workspace hooks
// are declared first, so the call is routed through this rather than reordered.
let disposeLiveChatSessions: () => Promise<void> = async () => {};

const workspace = createWorkspaceService({
  getWindow: () => windowManager.getWindow(),
  hooks: {
    beforeRootChanged: async (previousRoot, nextRoot) => {
      // A chat session belongs to the workspace it was opened in: its events
      // and meta live under that root, and its agent's cwd points inside it.
      // Carrying one across a re-root would append to a store that is about to
      // close while its metadata resolves against the new root. Sessions are
      // ended first, so nothing survives the swap to diverge.
      await disposeLiveChatSessions();
      await semanticSearch.handleWorkspaceRootChange(previousRoot, nextRoot);
    },
    prepareWorkspace: (root) => ensureNotesDir(root),
    afterRootChanged: async (root) => {
      crashReporter.setWorkspaceRoot(root);
      registerNotesHandlers(root);
      await projects.setWorkspaceRoot(root);
      await sessions.setWorkspaceRoot(root);
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
projects.registerIpcHandlers();
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
  projects,
  sessions,
});

disposeLiveChatSessions = disposeChat;

// Agent teardown must COMPLETE before the app exits, so it hangs off
// `before-quit` with the quit deferred rather than off `will-quit`, which does
// not await anything it starts. Harness children are spawned detached: if one
// ignores SIGTERM, the supervisor's delayed SIGKILL escalation has to still be
// running when it fires, or the process tree is orphaned. The guard lets the
// re-issued quit through so this is not a loop (and never `app.exit()`, which
// skips the quit hooks entirely).
//
// Deferring the quit is only safe because the awaited work is bounded:
// `disposeChat` runs best-effort `session/cancel` → final transcript
// checkpoint → kill-trees under ONE deadline (see `chat/quit.ts`), so an agent
// that never answers cannot wedge the quit here.
let teardownComplete = false;

app.on('before-quit', (event) => {
  if (teardownComplete) return;
  event.preventDefault();
  void (async () => {
    try {
      // allSettled: one failing teardown must not strand the other's processes.
      // It also never rejects, so a failed disposer has to be read off the
      // results — a silently swallowed one would leave an orphaned process tree
      // with nothing in the log to explain it.
      // Chat teardown first, then the store: `disposeChat` writes each
      // session's `closed` status and flushes its log, which needs the store
      // still open.
      const results = await Promise.allSettled([disposeDevConsole(), disposeChat()]);
      await sessions.close().catch((error: unknown) => {
        console.error('[main] could not close the session store during quit:', error);
      });
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('[main] agent teardown failed during quit:', result.reason);
        }
      }
    } catch (error) {
      // Only reachable if a disposer throws synchronously, before it returns.
      console.error('[main] agent teardown threw during quit:', error);
    } finally {
      teardownComplete = true;
      app.quit();
    }
  })();
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
