import { ipcMain, type BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import {
  ipcChannels,
  parseSync,
  SChatPermissionResponse,
  SChatSessionNewRequest,
  SChatSessionPromptRequest,
  SChatSessionRef,
  SChatSessionSetModeRequest,
  type ChatTarget,
  type Project,
} from '@srgnt/contracts';
// Type-only import: `session-controller` statically imports the ESM-only
// `@srgnt/harness`, and the desktop main is compiled to CommonJS, so a *value*
// import here would become a top-level `require()` of an ESM package
// (ERR_REQUIRE_ESM) at app startup. The concrete controller is loaded lazily via
// dynamic import() on first use (see getController).
import type { ChatSessionController } from './session-controller.js';

export type { ChatSessionController } from './session-controller.js';
export type { ChatConnectFn, ChatConnection, ChatHarnessIdentity } from './session-controller.js';

/**
 * Which harnesses the chat surface can actually drive. A project's stored
 * `defaultHarnessId` is free-form (harnesses.json can name anything), so it is
 * checked against this before being used as a target — an unknown default must
 * degrade to the mock, not crash session creation.
 */
const CHAT_TARGETS: readonly string[] = ['mock', 'pi'];

export function resolveChatTarget(
  requested: ChatTarget | undefined,
  defaultHarnessId: string | undefined,
): ChatTarget {
  if (requested !== undefined) return requested;
  if (defaultHarnessId !== undefined && CHAT_TARGETS.includes(defaultHarnessId)) {
    return defaultHarnessId as ChatTarget;
  }
  return 'mock';
}

export interface ChatWiring {
  /** The active window; the controller pushes `chat:session:update` frames to it. */
  readonly getWindow: () => BrowserWindow | null;
  /** Working directory for sessions (workspace root). Defaults to OS temp dir. */
  readonly getCwd?: () => string | undefined;
  /**
   * Resolves the project a session belongs to (STEP-24-02): by id when the
   * renderer named one, otherwise auto-created for the workspace cwd. Absent
   * (tests, headless) means sessions carry no project, exactly as in Phase 23.
   */
  readonly projects?: {
    get(projectId: string): Promise<Project>;
    ensureForDir(rootDir: string): Promise<Project>;
  };
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
    const { target, projectId } = parseSync(SChatSessionNewRequest, payload);
    // "Project = directory": with no explicit id the workspace cwd materializes
    // one, so a user who never thinks about projects still gets theirs.
    const cwd = wiring.getCwd?.();
    const project =
      wiring.projects === undefined
        ? undefined
        : projectId !== undefined
          ? await wiring.projects.get(projectId)
          : cwd !== undefined && cwd !== ''
            ? await wiring.projects.ensureForDir(cwd)
            : undefined;
    // A project outlives its checkout: it must keep listing after the directory
    // is deleted, but a session there would hand the agent a cwd that is not a
    // directory. Fail with something a user can act on instead.
    if (project !== undefined && !existsSync(project.rootDir)) {
      throw new Error(
        `Project "${project.name}" points at ${project.rootDir}, which no longer exists. Restore the directory or switch projects.`,
      );
    }
    return (await getController()).newSession(resolveChatTarget(target, project?.defaultHarnessId), {
      ...(project !== undefined
        ? {
            projectId: project.id,
            cwd: project.rootDir,
            ...(project.permissionPolicy !== undefined
              ? { permissionPolicy: project.permissionPolicy }
              : {}),
          }
        : {}),
    });
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
