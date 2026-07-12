import { BrowserWindow, ipcMain } from 'electron';

export interface WindowManagerOptions {
  preloadPath: string;
  rendererHtmlPath: string;
  devServerUrl: string;
  isDev: boolean;
  forceLocalRenderer: boolean;
  openDevTools: boolean;
}

export interface WindowManager {
  createWindow(): void;
  getWindow(): BrowserWindow | null;
  registerIpcHandlers(): void;
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

export function createWindowManager(options: WindowManagerOptions): WindowManager {
  let mainWindow: BrowserWindow | null = null;

  function createWindow(): void {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      webPreferences: {
        preload: options.preloadPath,
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

    if (options.isDev && !options.forceLocalRenderer) {
      mainWindow.loadURL(options.devServerUrl);
      if (options.openDevTools) {
        mainWindow.webContents.openDevTools();
      }
    } else {
      mainWindow.loadFile(options.rendererHtmlPath);
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  function registerIpcHandlers(): void {
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
  }

  return {
    createWindow,
    getWindow: () => mainWindow,
    registerIpcHandlers,
  };
}
