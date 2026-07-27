import { ipcMain, type BrowserWindow } from 'electron';
import {
  ipcChannels,
  parseSync,
  SChatPermissionResponse,
  SChatSessionNewRequest,
  SChatSessionPromptRequest,
  SChatSessionRef,
  SChatSessionSetModeRequest,
} from '@srgnt/contracts';
// Type-only import: `session-controller` statically imports the ESM-only
// `@srgnt/harness`, and the desktop main is compiled to CommonJS, so a *value*
// import here would become a top-level `require()` of an ESM package
// (ERR_REQUIRE_ESM) at app startup. The concrete controller is loaded lazily via
// dynamic import() on first use (see getController).
import type { ChatSessionController } from './session-controller.js';

export type { ChatSessionController } from './session-controller.js';
export type { ChatConnectFn, ChatConnection, ChatHarnessIdentity } from './session-controller.js';

export interface ChatWiring {
  /** The active window; the controller pushes `chat:session:update` frames to it. */
  readonly getWindow: () => BrowserWindow | null;
  /** Working directory for sessions (workspace root). Defaults to OS temp dir. */
  readonly getCwd?: () => string | undefined;
  /** Overrides controller construction (tests). */
  readonly createController?: (options: {
    onUpdate: (event: { sessionId: string; update: unknown }) => void;
    onTerminalOutput: (event: { sessionId: string; terminalId: string; chunk: string }) => void;
    onStatus: (event: { sessionId: string; status: string }) => void;
    onPermissionRequest: (event: { sessionId: string; requestId: string }) => boolean;
    onPermissionClose: (event: { sessionId: string; requestId: string; reason: string }) => void;
    getCwd?: () => string | undefined;
  }) => ChatSessionController;
}

/**
 * Registers the chat IPC surface (PHASE-23). Unlike the flag-gated dev console
 * this is the shipped product path, so the channels are always registered — but
 * the harness-backed controller is still constructed lazily, so an app whose
 * user never opens a chat session never loads `@srgnt/harness` and never spawns
 * an agent process.
 *
 * Returns a teardown that disposes every live session (kill-tree), for app quit.
 */
export function registerChatHandlers(wiring: ChatWiring): () => Promise<void> {
  const controllerOptions = {
    onUpdate: (event: { sessionId: string; update: unknown }) =>
      push(wiring, ipcChannels.chatSessionUpdate, event),
    onTerminalOutput: (event: { sessionId: string; terminalId: string; chunk: string }) =>
      push(wiring, ipcChannels.chatTerminalOutput, event),
    // Agent process lifecycle (STEP-23-04). Fire-and-forget: with no live window
    // there is nothing to warn, and the session is torn down at quit anyway.
    onStatus: (event: { sessionId: string; status: string }) => {
      push(wiring, ipcChannels.chatSessionStatus, event);
    },
    // Returns whether the prompt was actually delivered: with no live window
    // there is nobody to ask, and the controller answers the agent `cancelled`
    // instead of blocking it on a prompt that will never be shown.
    onPermissionRequest: (event: { sessionId: string; requestId: string }) =>
      push(wiring, ipcChannels.chatPermissionRequest, event),
    onPermissionClose: (event: { sessionId: string; requestId: string; reason: string }) => {
      push(wiring, ipcChannels.chatPermissionClose, event);
    },
    ...(wiring.getCwd !== undefined ? { getCwd: wiring.getCwd } : {}),
  };

  // Memoized so all handlers and the teardown share one controller.
  let controllerPromise: Promise<ChatSessionController> | undefined;
  const getController = (): Promise<ChatSessionController> => {
    if (controllerPromise === undefined) {
      controllerPromise =
        wiring.createController !== undefined
          ? Promise.resolve(wiring.createController(controllerOptions))
          : import('./session-controller.js').then(
              ({ ChatSessionController }) => new ChatSessionController(controllerOptions),
            );
    }
    return controllerPromise;
  };

  ipcMain.handle(ipcChannels.chatSessionNew, async (_event, payload: unknown) => {
    const { target } = parseSync(SChatSessionNewRequest, payload);
    return (await getController()).newSession(target);
  });

  ipcMain.handle(ipcChannels.chatSessionPrompt, async (_event, payload: unknown) => {
    const { sessionId, text } = parseSync(SChatSessionPromptRequest, payload);
    return (await getController()).prompt(sessionId, text);
  });

  ipcMain.handle(ipcChannels.chatSessionCancel, async (_event, payload: unknown) => {
    const { sessionId } = parseSync(SChatSessionRef, payload);
    await (await getController()).cancel(sessionId);
  });

  ipcMain.handle(ipcChannels.chatSessionSetMode, async (_event, payload: unknown) => {
    const { sessionId, modeId } = parseSync(SChatSessionSetModeRequest, payload);
    return (await getController()).setMode(sessionId, modeId);
  });

  ipcMain.handle(ipcChannels.chatSessionDispose, async (_event, payload: unknown) => {
    const { sessionId } = parseSync(SChatSessionRef, payload);
    await (await getController()).dispose(sessionId);
  });

  ipcMain.handle(ipcChannels.chatPermissionRespond, async (_event, payload: unknown) => {
    const { sessionId, requestId, optionId } = parseSync(SChatPermissionResponse, payload);
    // No `getController()`: a response can only exist because a controller
    // already asked, so constructing one here would be answering a question
    // nobody posed.
    if (controllerPromise === undefined) return;
    (await controllerPromise).respondToPermission(sessionId, requestId, optionId);
  });

  // Teardown: only tear down if a controller was ever constructed (an app where
  // no session was ever opened has nothing to dispose).
  return async () => {
    if (controllerPromise !== undefined) {
      await (await controllerPromise).disposeAll();
    }
  };
}

/** Returns whether a live window actually received the frame. */
function push(wiring: ChatWiring, channel: string, payload: unknown): boolean {
  const window = wiring.getWindow();
  if (window === null || window.isDestroyed()) return false;
  window.webContents.send(channel, payload);
  return true;
}
