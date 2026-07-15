import { ipcMain, type BrowserWindow } from 'electron';
import {
  ipcChannels,
  parseSync,
  SDevSessionNewRequest,
  SDevSessionPromptRequest,
  SDevSessionRef,
} from '@srgnt/contracts';
import { DevSessionController } from './session-controller.js';

export { DevSessionController } from './session-controller.js';
export type { DevConnectFn, DevConnection } from './session-controller.js';

/** True when the flag-gated dev console is switched on for this process. */
export function isDevConsoleEnabled(): boolean {
  return process.env.SRGNT_DEV_CONSOLE === '1';
}

export interface DevConsoleWiring {
  /** The active window; the controller pushes `dev:session:update` frames to it. */
  readonly getWindow: () => BrowserWindow | null;
  /** Working directory for sessions (workspace root). Defaults to OS temp dir. */
  readonly getCwd?: () => string | undefined;
  /** Overrides the flag check (tests). */
  readonly enabled?: boolean;
  /** Overrides controller construction (tests). */
  readonly createController?: (options: {
    onUpdate: (event: { sessionId: string; update: unknown }) => void;
    getCwd?: () => string | undefined;
  }) => DevSessionController;
}

/**
 * Registers the dev-console IPC surface. `dev:console:enabled` is ALWAYS
 * registered so the renderer can query whether to render the console; the
 * operational channels (`dev:session:*`) are registered ONLY when the flag is
 * on. With the flag off the console has no IPC surface at all, so the default
 * (flag-off) app is byte-identical and the renderer keeps the console invisible.
 *
 * Returns a teardown that disposes every live session (kill-tree), for app quit.
 */
export function registerDevConsoleHandlers(wiring: DevConsoleWiring): () => Promise<void> {
  const enabled = wiring.enabled ?? isDevConsoleEnabled();

  ipcMain.handle(ipcChannels.devConsoleEnabled, () => enabled);

  if (!enabled) {
    return async () => {
      /* nothing registered, nothing to tear down */
    };
  }

  const controller =
    wiring.createController?.({
      onUpdate: (event) => pushUpdate(wiring, event.sessionId, event.update),
      ...(wiring.getCwd !== undefined ? { getCwd: wiring.getCwd } : {}),
    }) ??
    new DevSessionController({
      onUpdate: (event) => pushUpdate(wiring, event.sessionId, event.update),
      ...(wiring.getCwd !== undefined ? { getCwd: wiring.getCwd } : {}),
    });

  ipcMain.handle(ipcChannels.devSessionNew, async (_event, payload: unknown) => {
    const { target } = parseSync(SDevSessionNewRequest, payload);
    return controller.newSession(target);
  });

  ipcMain.handle(ipcChannels.devSessionPrompt, async (_event, payload: unknown) => {
    const { sessionId, text } = parseSync(SDevSessionPromptRequest, payload);
    return controller.prompt(sessionId, text);
  });

  ipcMain.handle(ipcChannels.devSessionCancel, async (_event, payload: unknown) => {
    const { sessionId } = parseSync(SDevSessionRef, payload);
    await controller.cancel(sessionId);
  });

  ipcMain.handle(ipcChannels.devSessionDispose, async (_event, payload: unknown) => {
    const { sessionId } = parseSync(SDevSessionRef, payload);
    await controller.dispose(sessionId);
  });

  return () => controller.disposeAll();
}

function pushUpdate(wiring: DevConsoleWiring, sessionId: string, update: unknown): void {
  const window = wiring.getWindow();
  if (window === null || window.isDestroyed()) return;
  window.webContents.send(ipcChannels.devSessionUpdate, { sessionId, update });
}
