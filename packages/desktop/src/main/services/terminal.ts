import { ipcMain, type BrowserWindow } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  ipcChannels,
  parseSync,
  SLaunchApprovalResolveRequest,
  STerminalCloseRequest,
  STerminalLaunchWithContextRequest,
  STerminalResizeRequest,
  STerminalSpawnRequest,
  STerminalWriteRequest,
  type TerminalLaunchWithContextRequest,
} from '@srgnt/contracts';
import { createRunLogService, createApprovalService, redactEnv, truncateOutput, DEFAULT_REDACTION_POLICY } from '@srgnt/runtime';
import { createPtySessionManager } from '../pty/session-manager.js';
import { createPtyService } from '../pty/node-pty-service.js';

const SAFE_STORAGE_STEM_PATTERN = /[^A-Za-z0-9_-]+/g;
const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

function sanitizeStorageStem(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(SAFE_STORAGE_STEM_PATTERN, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return sanitized || `${fallback}-${Date.now()}`;
}

export interface TerminalService {
  registerIpcHandlers(): void;
}

export function createTerminalService(deps: {
  getWindow(): BrowserWindow | null;
  getWorkspaceRoot(): string;
  getUserDataPath(): string;
}): TerminalService {
  const sessionManager = createPtySessionManager();
  const ptyService = createPtyService({ sessionManager });
  const runLogService = createRunLogService();
  const approvalService = createApprovalService();
  const pendingLaunches = new Map<string, { resolve: (approved: boolean) => void }>();

  function getRunLogPath(stem: string): string {
    const root = deps.getWorkspaceRoot() || deps.getUserDataPath();
    const fileName = `${sanitizeStorageStem(stem, 'run')}.md`;
    return path.join(root, '.command-center', 'runs', fileName);
  }

  async function writeRunLogToDisk(logId: string, markdown: string): Promise<void> {
    const filePath = getRunLogPath(logId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  function forwardSessionOutput(sessionId: string): void {
    ptyService.onData(sessionId, (data) => {
      const mainWindow = deps.getWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', sessionId, data);
      }
    });
  }

  function sendSessionExit(sessionId: string, exitCode: number): void {
    const mainWindow = deps.getWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', sessionId, exitCode);
    }
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

    forwardSessionOutput(session.id);

    ptyService.onExit(session.id, async (exitCode) => {
      const output = '';
      const completedLog = runLogService.completeRun(launchContext.launchId, exitCode, output);
      if (completedLog) {
        const redactedOutput = redactEnv(runLogService.getRun(launchContext.launchId)?.context.env || {}, DEFAULT_REDACTION_POLICY);
        completedLog.outputSummary = truncateOutput(output, 500);
        completedLog.redactedFields = redactedOutput.redactedFields;
        await writeRunLogToDisk(completedLog.id, runLogService.toMarkdown(completedLog));
      }
      sendSessionExit(session.id, exitCode);
    });

    return { sessionId: session.id, pid: session.process.pid, launchId: launchContext.launchId, status: 'approved' };
  }

  function registerIpcHandlers(): void {
    ipcMain.handle(ipcChannels.terminalSpawn, async (_event, rawOptions) => {
      const options = parseSync(STerminalSpawnRequest, rawOptions ?? {});
      const { session } = await ptyService.spawn({
        args: [],
        env: {},
        rows: options.rows,
        cols: options.cols,
      });
      forwardSessionOutput(session.id);
      ptyService.onExit(session.id, (exitCode) => {
        sendSessionExit(session.id, exitCode);
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

        const mainWindow = deps.getWindow();
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
          }, APPROVAL_TIMEOUT_MS);
        });
      }

      return launchApproved(launchContext, rows, cols);
    });

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
  }

  return { registerIpcHandlers };
}
