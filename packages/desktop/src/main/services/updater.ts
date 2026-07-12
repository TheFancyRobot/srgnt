import { app, ipcMain } from 'electron';
import { ipcChannels, type UpdateCheckResponse, type UpdateChannel } from '@srgnt/contracts';
import { checkForUpdates } from '../updater.js';

export interface UpdaterService {
  checkNow(): Promise<UpdateCheckResponse>;
  registerIpcHandlers(): void;
}

export function createUpdaterService(deps: { getUpdateChannel(): UpdateChannel }): UpdaterService {
  let lastUpdateCheck: UpdateCheckResponse = {
    status: 'skipped',
    channel: deps.getUpdateChannel(),
    checkedAt: new Date(0).toISOString(),
    message: 'Update check has not run yet.',
  };

  async function checkNow(): Promise<UpdateCheckResponse> {
    lastUpdateCheck = await checkForUpdates(deps.getUpdateChannel());
    return lastUpdateCheck;
  }

  function registerIpcHandlers(): void {
    ipcMain.handle(ipcChannels.appGetVersion, () => app.getVersion());
    ipcMain.handle(ipcChannels.appGetUserDataPath, () => app.getPath('userData'));
    ipcMain.handle(ipcChannels.appCheckForUpdates, async () => checkNow());
  }

  return { checkNow, registerIpcHandlers };
}
