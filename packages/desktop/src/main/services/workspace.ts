import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
import * as path from 'node:path';
import { ipcChannels, type DesktopSettings } from '@srgnt/contracts';
import {
  defaultDesktopSettings,
  ensureWorkspaceLayout,
  mergeDesktopSettings,
  readBootstrapState,
  readDesktopSettings,
  resolveDefaultWorkspaceRoot,
  writeBootstrapState,
  writeDesktopSettings,
} from '../settings.js';

export interface WorkspaceHooks {
  /** Runs before the new root is prepared (e.g. tear down services bound to the previous root). */
  beforeRootChanged(previousRoot: string, nextRoot: string): Promise<void> | void;
  /** Runs after the workspace layout exists but before state is persisted (e.g. ensure notes dir). */
  prepareWorkspace(root: string): Promise<void> | void;
  /** Runs once the new root is fully persisted (e.g. re-register per-root services). */
  afterRootChanged(root: string): Promise<void> | void;
}

export interface WorkspaceService {
  getRoot(): string;
  getSettings(): DesktopSettings;
  setRoot(root: string): Promise<string>;
  persistSettings(next: DesktopSettings): Promise<void>;
  initializeFromBootstrap(): Promise<void>;
  registerIpcHandlers(): void;
}

function normalizeWorkspaceRootInput(root: string): string {
  const trimmed = root.trim();
  if (!trimmed) {
    throw new Error('Workspace root is required.');
  }
  return trimmed;
}

export function createWorkspaceService(deps: {
  getWindow(): BrowserWindow | null;
  hooks: WorkspaceHooks;
}): WorkspaceService {
  let workspaceRoot = '';
  let desktopSettings: DesktopSettings = { ...defaultDesktopSettings };

  async function setRoot(root: string): Promise<string> {
    const resolvedRoot = path.resolve(root);
    const previousWorkspaceRoot = workspaceRoot;
    workspaceRoot = resolvedRoot;

    await deps.hooks.beforeRootChanged(previousWorkspaceRoot, resolvedRoot);

    await ensureWorkspaceLayout(resolvedRoot);
    await deps.hooks.prepareWorkspace(resolvedRoot);
    await writeBootstrapState(app.getPath('userData'), { workspaceRoot: resolvedRoot });

    desktopSettings = mergeDesktopSettings(await readDesktopSettings(resolvedRoot));
    await writeDesktopSettings(resolvedRoot, desktopSettings);

    await deps.hooks.afterRootChanged(resolvedRoot);

    return resolvedRoot;
  }

  async function persistSettings(nextSettings: DesktopSettings): Promise<void> {
    desktopSettings = mergeDesktopSettings(nextSettings);
    if (workspaceRoot) {
      await writeDesktopSettings(workspaceRoot, desktopSettings);
    }
  }

  async function initializeFromBootstrap(): Promise<void> {
    const bootstrapState = await readBootstrapState(app.getPath('userData'));
    if (!bootstrapState.workspaceRoot) {
      return;
    }
    await setRoot(bootstrapState.workspaceRoot);
  }

  async function chooseRoot(): Promise<string> {
    const defaultPath = workspaceRoot || resolveDefaultWorkspaceRoot(app.getPath('home'));
    const options: Electron.OpenDialogOptions = {
      title: 'Choose srgnt workspace',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath,
    };

    const mainWindow = deps.getWindow();
    const result = mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return workspaceRoot;
    }

    return setRoot(result.filePaths[0]);
  }

  async function createDefaultRoot(): Promise<string> {
    const defaultRoot = resolveDefaultWorkspaceRoot(app.getPath('home'));
    return setRoot(defaultRoot);
  }

  function registerIpcHandlers(): void {
    ipcMain.handle(ipcChannels.workspaceGetRoot, () => workspaceRoot);
    ipcMain.handle(ipcChannels.workspaceSetRoot, async (_event, root: string) => setRoot(normalizeWorkspaceRootInput(root)));
    ipcMain.handle(ipcChannels.workspaceChooseRoot, async () => chooseRoot());
    ipcMain.handle(ipcChannels.workspaceCreateDefaultRoot, async () => createDefaultRoot());
  }

  return {
    getRoot: () => workspaceRoot,
    getSettings: () => desktopSettings,
    setRoot,
    persistSettings,
    initializeFromBootstrap,
    registerIpcHandlers,
  };
}
