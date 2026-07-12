import { ipcMain } from 'electron';
import { ipcChannels, parseSync, SDesktopSettings, type DesktopSettings } from '@srgnt/contracts';
import type { WorkspaceService } from './workspace.js';

export function registerSettingsHandlers(workspace: WorkspaceService): void {
  ipcMain.handle(ipcChannels.settingsGet, () => ({
    workspaceRoot: workspace.getRoot(),
    settings: workspace.getSettings(),
  }));

  ipcMain.handle(ipcChannels.settingsSave, async (_event, payload: DesktopSettings) => {
    const parsedSettings = parseSync(SDesktopSettings, payload);
    await workspace.persistSettings(parsedSettings);
    return {
      workspaceRoot: workspace.getRoot(),
      settings: workspace.getSettings(),
    };
  });
}
