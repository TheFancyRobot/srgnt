import { ipcMain, type BrowserWindow } from 'electron';
import {
  ipcChannels,
  parseSync,
  SDevSessionNewRequest,
  SDevSessionPromptRequest,
  SDevSessionRef,
} from '@srgnt/contracts';
// Type-only import: `session-controller` statically imports the ESM-only
// `@srgnt/harness`, and the desktop main is compiled to CommonJS, so a *value*
// import here would become a top-level `require()` of an ESM package
// (ERR_REQUIRE_ESM) at app startup. The concrete controller is loaded lazily
// via dynamic import() inside the flag-on path below (see getController).
import type { DevSessionController } from './session-controller.js';

export type { DevSessionController } from './session-controller.js';
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

  const controllerOptions = {
    onUpdate: (event: { sessionId: string; update: unknown }) =>
      pushUpdate(wiring, event.sessionId, event.update),
    ...(wiring.getCwd !== undefined ? { getCwd: wiring.getCwd } : {}),
  };

  // Lazily construct the harness-backed controller on first use. A test-injected
  // `createController` needs no harness at all; otherwise we dynamic-import the
  // controller module (which pulls in the ESM `@srgnt/harness`) — deferred to the
  // flag-on path so the default app never loads it. Memoized so all handlers and
  // the teardown share one controller.
  let controllerPromise: Promise<DevSessionController> | undefined;
  const getController = (): Promise<DevSessionController> => {
    if (controllerPromise === undefined) {
      controllerPromise =
        wiring.createController !== undefined
          ? Promise.resolve(wiring.createController(controllerOptions))
          : import('./session-controller.js').then(
              ({ DevSessionController }) => new DevSessionController(controllerOptions),
            );
    }
    return controllerPromise;
  };

  ipcMain.handle(ipcChannels.devSessionNew, async (_event, payload: unknown) => {
    const { target } = parseSync(SDevSessionNewRequest, payload);
    return (await getController()).newSession(target);
  });

  ipcMain.handle(ipcChannels.devSessionPrompt, async (_event, payload: unknown) => {
    const { sessionId, text } = parseSync(SDevSessionPromptRequest, payload);
    return (await getController()).prompt(sessionId, text);
  });

  ipcMain.handle(ipcChannels.devSessionCancel, async (_event, payload: unknown) => {
    const { sessionId } = parseSync(SDevSessionRef, payload);
    await (await getController()).cancel(sessionId);
  });

  ipcMain.handle(ipcChannels.devSessionDispose, async (_event, payload: unknown) => {
    const { sessionId } = parseSync(SDevSessionRef, payload);
    await (await getController()).dispose(sessionId);
  });

  // Teardown: only tear down if a controller was ever constructed (a console that
  // was enabled but never opened a session has nothing to dispose).
  return async () => {
    if (controllerPromise !== undefined) {
      await (await controllerPromise).disposeAll();
    }
  };
}

function pushUpdate(wiring: DevConsoleWiring, sessionId: string, update: unknown): void {
  const window = wiring.getWindow();
  if (window === null || window.isDestroyed()) return;
  window.webContents.send(ipcChannels.devSessionUpdate, { sessionId, update });
}
