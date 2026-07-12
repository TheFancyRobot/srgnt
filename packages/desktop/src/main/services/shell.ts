import { ipcMain, shell } from 'electron';
import { ipcChannels } from '@srgnt/contracts';
import { createShellOpenExternalHandler } from '../shell-open-external.js';

export function registerShellHandlers(): void {
  ipcMain.handle(
    ipcChannels.shellOpenExternal,
    createShellOpenExternalHandler(shell.openExternal),
  );
}
