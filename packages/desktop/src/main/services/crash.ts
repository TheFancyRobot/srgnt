import { app, ipcMain } from 'electron';
import * as path from 'node:path';
import { ipcChannels } from '@srgnt/contracts';
import type { CrashReporter } from '../crash.js';

export function registerCrashHandlers(deps: {
  crashReporter: CrashReporter;
  getWorkspaceRoot(): string;
}): void {
  ipcMain.handle(ipcChannels.crashWriteTestLog, async () => {
    const workspaceRoot = deps.getWorkspaceRoot();
    const sampleError = new Error(
      `Diagnostic crash at ${workspaceRoot || '/tmp/srgnt-workspace'} token=top-secret user@example.com`,
    );
    await deps.crashReporter.writeCrashReport('diagnostic', sampleError, {
      workflow: 'release-qa',
      workspaceRoot,
    });
    return {
      directory: path.join(app.getPath('userData'), 'crashes'),
    };
  });
}
