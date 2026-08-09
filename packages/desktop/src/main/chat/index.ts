import { ipcMain, type BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import {
  ipcChannels,
  parseSync,
  SChatPermissionResponse,
  SChatSessionListRequest,
  SChatSessionNewRequest,
  SChatSessionOpenRequest,
  SChatSessionPromptRequest,
  SChatSessionRef,
  SChatSessionSetModeRequest,
  type ChatSessionListResponse,
  type ChatSessionOpenResponse,
  type ChatTarget,
  type Project,
} from '@srgnt/contracts';
import type { SessionStore } from '@srgnt/runtime';
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
  /**
   * The session store, rooted at the current workspace (STEP-24-03). Absent, or
   * returning `undefined` before a workspace root exists, means sessions are
   * memory-only and the list is empty — the Phase-23 behaviour.
   */
  readonly sessions?: {
    store(): SessionStore | undefined;
  };
  /** Overrides controller construction (tests). */
  readonly createController?: (options: {
    onUpdate: (event: { sessionId: string; update: unknown }) => void;
    onTerminalOutput: (event: { sessionId: string; terminalId: string; chunk: string }) => void;
    onStatus: (event: { sessionId: string; status: string }) => void;
    onPermissionRequest: (event: { sessionId: string; requestId: string }) => boolean;
    onPermissionClose: (event: { sessionId: string; requestId: string; reason: string }) => void;
    getCwd?: () => string | undefined;
    getStore?: () => unknown;
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
    // Read per call, never captured: the store is rebuilt when the workspace
    // root changes, and a captured one would keep appending into the workspace
    // the user left.
    getStore: () => wiring.sessions?.store(),
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

  // List + open are pure disk reads. Neither constructs the controller, so
  // browsing sessions never loads `@srgnt/harness` and never spawns an agent —
  // the "UI-open ≠ process-running" invariant, enforced by omission.
  ipcMain.handle(ipcChannels.chatSessionList, async (_event, payload: unknown) => {
    const { projectId } = parseSync(SChatSessionListRequest, payload);
    const store = wiring.sessions?.store();
    if (store === undefined) return { sessions: [], skipped: [] } satisfies ChatSessionListResponse;
    const { sessions, skipped } = await store.listSessions(projectId);
    // Same repair as `open`, applied here because the list is where the user
    // actually sees the status: a session left `active` by a crash has no
    // controller to ever close it, so without this it reads "Running" forever
    // and clicking it is the only way to learn otherwise.
    const controller = controllerPromise === undefined ? undefined : await controllerPromise;
    const reconciled = await Promise.all(
      sessions.map(async (session) => {
        if (session.status !== 'active' || controller?.has(session.id) === true) return session;
        return store
          .updateMeta({ projectId, sessionId: session.id }, { status: 'interrupted' })
          .catch(() => session);
      }),
    );
    return {
      // Newest activity first. `updatedAt` is absent until the first meta
      // rewrite, so a never-prompted session sorts by its creation time rather
      // than to the bottom of the list.
      sessions: [...reconciled].sort((left, right) =>
        (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt),
      ),
      skipped,
    } satisfies ChatSessionListResponse;
  });

  ipcMain.handle(ipcChannels.chatSessionOpen, async (_event, payload: unknown) => {
    const { projectId, sessionId } = parseSync(SChatSessionOpenRequest, payload);
    const store = wiring.sessions?.store();
    if (store === undefined) throw new Error('No workspace root: sessions are not persisted yet.');
    const ref = { projectId, sessionId };
    const [session, events] = await Promise.all([store.readMeta(ref), store.readEvents(ref)]);
    // `has` on an already-constructed controller only: asking whether a session
    // is live must not be what *creates* the controller.
    const live =
      controllerPromise !== undefined && (await controllerPromise).has(sessionId);
    // A log that does not end on a record boundary is a turn that never
    // finished — the crash-mid-append shape. Recorded once, and only for a
    // session nobody is writing to: a live session's tail is simply in flight.
    // A torn tail is the loud crash shape, but not the common one: an app that
    // exits after a newline-terminated event and before `client/stop` leaves a
    // perfectly valid log whose last word is still a turn in progress. Keying
    // only on `truncatedTail` left those sessions reporting "Running" forever,
    // since no controller exists to ever close them out.
    const stranded = !live && session.status === 'active';
    const repaired =
      (events.truncatedTail || stranded) && !live && session.status !== 'interrupted'
        ? await store.updateMeta(ref, { status: 'interrupted' })
        : session;
    return {
      session: repaired,
      events: events.events,
      truncatedTail: events.truncatedTail,
      live,
    } satisfies ChatSessionOpenResponse;
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
