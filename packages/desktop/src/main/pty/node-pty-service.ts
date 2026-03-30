import * as nodePty from 'node-pty';
import { parseSync } from '@srgnt/contracts';
import { SPtyProcessOptions, SPtyProcess } from './contracts.js';
import type { PtyProcessOptions, PtyProcess } from './contracts.js';
import type { PtySessionManager, PtySession } from './session-manager.js';

export { SPtyProcessOptions, SPtyProcess };
export type { PtyProcessOptions, PtyProcess };

export type { PtySession };

export interface PtyService {
  spawn(options: PtyProcessOptions): Promise<{ session: PtySession; process: PtyProcess }>;
  write(sessionId: string, data: string): void;
  resize(sessionId: string, rows: number, cols: number): void;
  kill(sessionId: string): void;
  onData(sessionId: string, callback: (data: string) => void): void;
  onExit(sessionId: string, callback: (exitCode: number) => void): void;
  list(): PtySession[];
}

export interface PtyServiceDeps {
  sessionManager: PtySessionManager;
}

function isSecretEnvKey(key: string): boolean {
  return /SECRET|TOKEN|KEY|PASSWORD|PRIVATE|CREDENTIAL/i.test(key);
}

export function createPtyService(deps: PtyServiceDeps): PtyService {
  const { sessionManager } = deps;
  const dataCallbacks = new Map<string, (data: string) => void>();
  const exitCallbacks = new Map<string, (exitCode: number) => void>();

  return {
    async spawn(options) {
      const validated = parseSync(SPtyProcessOptions, options) as PtyProcessOptions;
      const args = [...validated.args];

      const isWindows = process.platform === 'win32';
      const shell = isWindows
        ? 'powershell.exe'
        : process.env['SHELL'] || 'bash';

      let shellArgs: string[];
      if (isWindows) {
        shellArgs = ['-NoLogo'];
      } else {
        const basename = shell.split('/').pop() || shell;
        switch (basename) {
          case 'bash':
          case 'sh':
            shellArgs = ['--login'];
            break;
          case 'zsh':
          case 'fish':
            shellArgs = ['-l'];
            break;
          default:
            shellArgs = [];
        }
      }

      const cleanEnv: Record<string, string> = {};
      for (const [k, v] of Object.entries(process.env)) {
        if (k && v !== undefined && !isSecretEnvKey(k)) {
          cleanEnv[k] = v;
        }
      }
      for (const [k, v] of Object.entries(validated.env)) {
        if (!isSecretEnvKey(k) && typeof v === 'string') {
          cleanEnv[k] = v;
        }
      }

      const ptyProcess = nodePty.spawn(
        validated.command || shell,
        args.length > 0 ? args : shellArgs,
        {
          name: 'xterm-256color',
          cols: validated.cols,
          rows: validated.rows,
          cwd: validated.cwd || process.cwd(),
          env: cleanEnv,
        }
      );

      const processInfo = parseSync(SPtyProcess, {
        pid: ptyProcess.pid,
        fd: 0,
        exitCode: undefined,
      }) as PtyProcess;

      const session = sessionManager.createSession(processInfo, {
        command: validated.command,
        args,
        cwd: validated.cwd,
        rows: validated.rows,
        cols: validated.cols,
      });

      session.ptyProcess = {
        write: (data: string) => ptyProcess.write(data),
        resize: ({ rows, cols }: { rows: number; cols: number }) => ptyProcess.resize(cols, rows),
        kill: () => ptyProcess.kill(),
      };

      ptyProcess.onData((data: string) => {
        const cb = dataCallbacks.get(session.id);
        if (cb) cb(data);
      });

      ptyProcess.onExit(({ exitCode }) => {
        const cb = exitCallbacks.get(session.id);
        if (cb) cb(exitCode);
        sessionManager.closeSession(session.id);
        dataCallbacks.delete(session.id);
        exitCallbacks.delete(session.id);
      });

      return { session, process: processInfo };
    },

    write(sessionId: string, data: string): void {
      const session = sessionManager.getSession(sessionId);
      if (!session || !session.isActive) return;
      session.ptyProcess.write(data);
    },

    resize(sessionId: string, rows: number, cols: number): void {
      const session = sessionManager.getSession(sessionId);
      if (!session || !session.isActive) return;
      session.ptyProcess.resize({ rows, cols });
    },

    kill(sessionId: string): void {
      const session = sessionManager.getSession(sessionId);
      if (!session) return;
      session.ptyProcess.kill();
      sessionManager.closeSession(sessionId);
      dataCallbacks.delete(sessionId);
      exitCallbacks.delete(sessionId);
    },

    onData(sessionId: string, callback: (data: string) => void): void {
      dataCallbacks.set(sessionId, callback);
    },

    onExit(sessionId: string, callback: (exitCode: number) => void): void {
      exitCallbacks.set(sessionId, callback);
    },

    list(): PtySession[] {
      return sessionManager.listSessions();
    },
  };
}
