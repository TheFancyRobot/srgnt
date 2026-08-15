import { ipcMain, type BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import {
  ipcChannels,
  parseSync,
  SChatPermissionResponse,
  SChatSessionForkRequest,
  SChatSessionListRequest,
  SChatSessionNewRequest,
  SChatSessionOpenRequest,
  SChatSessionPromptRequest,
  SChatSessionReconnectRequest,
  SChatSessionRef,
  SChatSessionSetModeRequest,
  type ChatAuthRequired,
  type ChatSessionForkResponse,
  type ChatSessionListResponse,
  type ChatSessionOpenResponse,
  type ChatSessionReconnectResponse,
  type ChatTarget,
  type HarnessDefinition,
  type Project,
} from '@srgnt/contracts';
import { createHarnessCapabilityCache, type SessionStore } from '@srgnt/runtime';
// Type-only import: `session-controller` statically imports the ESM-only
// `@srgnt/harness`, and the desktop main is compiled to CommonJS, so a *value*
// import here would become a top-level `require()` of an ESM package
// (ERR_REQUIRE_ESM) at app startup. The concrete controller is loaded lazily via
// dynamic import() on first use (see getController).
import type { ChatSessionController } from './session-controller.js';
import { forkSession, reconcileForkLinks, type ForkStore } from './fork.js';
import { runBoundedQuitCleanup } from './quit.js';

export type { ChatSessionController } from './session-controller.js';
export type { ChatConnectFn, ChatConnection, ChatHarnessIdentity } from './session-controller.js';

/** The deterministic in-tree agent. Not a registry harness — its id is reserved. */
const MOCK_TARGET = 'mock';

/**
 * Resolves which harness a session runs on: an explicit choice, else the
 * project's stored `defaultHarnessId`, else the mock.
 *
 * `isConfigured` is the registry check (STEP-25-02). A stored default can point
 * at an entry that was reset or deleted, and the honest answer there is to
 * BLOCK with an actionable error: quietly spawning some other agent because the
 * configured one vanished is the same class of dishonesty as silent context
 * re-priming. Absent (headless, tests, no harnesses service wired) keeps the
 * Phase-23 behaviour of degrading an unresolvable default to the mock.
 */
export async function resolveChatTarget(
  requested: ChatTarget | undefined,
  defaultHarnessId: string | undefined,
  isConfigured?: (id: string) => Promise<boolean>,
): Promise<ChatTarget> {
  const chosen = requested ?? defaultHarnessId;
  if (chosen === undefined || chosen === MOCK_TARGET) return MOCK_TARGET;
  if (isConfigured === undefined) return chosen === 'pi' ? chosen : MOCK_TARGET;
  if (await isConfigured(chosen)) return chosen;
  if (requested !== undefined) {
    throw new Error(`No harness "${chosen}" is configured. Pick another harness, or add it in Settings → Harnesses.`);
  }
  throw new Error(
    `The default harness "${chosen}" for this project is no longer configured. Pick a harness for this session, or set a new default in Settings → Harnesses.`,
  );
}

/**
 * Resolves the harness a fork must continue on. Separate from
 * `resolveChatTarget` only for the message: the id comes from the session being
 * forked, so routing it through the `defaultHarnessId` argument would tell the
 * user their *project default* is broken and send them to change a setting that
 * has nothing to do with it.
 */
export async function resolveForkTarget(
  harnessId: string,
  isConfigured?: (id: string) => Promise<boolean>,
): Promise<ChatTarget> {
  if (harnessId === MOCK_TARGET) return MOCK_TARGET;
  if (isConfigured === undefined) return harnessId === 'pi' ? harnessId : MOCK_TARGET;
  if (await isConfigured(harnessId)) return harnessId;
  throw new Error(
    `This session ran on "${harnessId}", which is no longer configured, so it cannot be forked. ` +
      `Restore that harness in Settings → Harnesses, or start a new session on a different one.`,
  );
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
  /**
   * The merged harness registry (STEP-25-02). It decides which target ids are
   * real and hands the connector the *effective* definition, so a saved binary
   * path or env override is what the next spawn launches. Absent (tests,
   * headless) falls back to the built-in Pi definition, as in Phase 23.
   */
  readonly harnesses?: {
    resolveDefinition(id: string): Promise<HarnessDefinition | undefined>;
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
  // One cache per workspace root, not one per report. The cache serializes
  // writes on an instance-local queue and each write is a read-modify-write of
  // the whole file, so separate instances race: two harnesses connecting in the
  // same workspace would each rewrite from their own stale read and drop the
  // other's entry. Keyed by root (not a single slot) because the workspace can
  // change under a running app — the old root's queue stays intact for writes
  // still draining against it.
  const caches = new Map<string, ReturnType<typeof createHarnessCapabilityCache>>();
  const cacheFor = (root: string): ReturnType<typeof createHarnessCapabilityCache> => {
    let cache = caches.get(root);
    if (cache === undefined) {
      cache = createHarnessCapabilityCache(root);
      caches.set(root, cache);
    }
    return cache;
  };

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
    // Definitions come from the registry, not a hardcoded built-in, so an
    // override saved in Settings is what the next spawn launches (STEP-25-02).
    ...(wiring.harnesses !== undefined
      ? { resolveDefinition: (id: string) => wiring.harnesses!.resolveDefinition(id) }
      : {}),
    // Read per call, never captured: the store is rebuilt when the workspace
    // root changes, and a captured one would keep appending into the workspace
    // the user left.
    getStore: () => wiring.sessions?.store(),
    // Last-negotiated capabilities for the settings/matrix surface. Rooted at
    // the *current* workspace for the same reason as `getStore`, and
    // fire-and-forget: this is display data, and losing a row must never fail
    // the session that produced it.
    onCapabilities: (
      definition: HarnessDefinition,
      capture: { negotiated: Record<string, unknown>; effective: Record<string, unknown> },
    ) => {
      const root = wiring.getCwd?.();
      if (root === undefined || root === '') return;
      void cacheFor(root)
        .record(definition, capture)
        .catch((error: unknown) => {
          console.error('[chat] could not cache harness capabilities:', error);
        });
    },
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

  /**
   * "Project = directory": with no explicit id the workspace cwd materializes
   * one, so a user who never thinks about projects still gets theirs.
   *
   * A project outlives its checkout: it must keep listing after the directory
   * is deleted, but a session there would hand the agent a cwd that is not a
   * directory. Fail with something a user can act on instead.
   */
  const resolveProject = async (projectId: string | undefined): Promise<Project | undefined> => {
    const cwd = wiring.getCwd?.();
    const project =
      wiring.projects === undefined
        ? undefined
        : projectId !== undefined
          ? await wiring.projects.get(projectId)
          : cwd !== undefined && cwd !== ''
            ? await wiring.projects.ensureForDir(cwd)
            : undefined;
    if (project !== undefined && !existsSync(project.rootDir)) {
      throw new Error(
        `Project "${project.name}" points at ${project.rootDir}, which no longer exists. Restore the directory or switch projects.`,
      );
    }
    return project;
  };

  /** The controller-facing view of a project: cwd, id, standing permissions. */
  const sessionProject = (project: Project | undefined) =>
    project === undefined
      ? {}
      : {
          projectId: project.id,
          cwd: project.rootDir,
          ...(project.permissionPolicy !== undefined
            ? { permissionPolicy: project.permissionPolicy }
            : {}),
        };

  /** Whether the registry can actually produce a definition for an id. */
  const isConfigured =
    wiring.harnesses === undefined
      ? undefined
      : async (id: string): Promise<boolean> =>
          (await wiring.harnesses!.resolveDefinition(id)) !== undefined;

  /** Whether this build can put an agent behind a recorded harness id at all. */
  const canDrive = async (id: string): Promise<boolean> =>
    id === MOCK_TARGET || (isConfigured === undefined ? id === 'pi' : await isConfigured(id));

  ipcMain.handle(ipcChannels.chatSessionNew, async (_event, payload: unknown) => {
    const { target, projectId, authMethodId } = parseSync(SChatSessionNewRequest, payload);
    const project = await resolveProject(projectId);
    // Resolved BEFORE the controller is constructed: a dangling default must
    // create no session and spawn no process, only a readable error.
    const resolvedTarget = await resolveChatTarget(target, project?.defaultHarnessId, isConfigured);
    try {
      return await (await getController()).newSession(
        resolvedTarget,
        sessionProject(project),
        undefined,
        authMethodId,
      );
    } catch (cause) {
      // The auth wall answers as DATA, not as a thrown string: an Error message
      // cannot carry the harness's advertised methods, and a raw JSON-RPC error
      // is the first thing an unauthenticated user would otherwise see.
      const authRequired = authRequiredPayload(cause);
      if (authRequired === undefined) throw cause;
      return authRequired satisfies ChatAuthRequired;
    }
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
    // Lineage reconciliation. A fork commits with the CHILD's meta and updates
    // the parent's `forkedSessionIds` after, so a crash in between leaves
    // lineage navigable one way only. Rebuilding it here — the one pass that
    // already reads every record in the project — heals it at the moment it is
    // about to be displayed, which also covers a crash that happened long after
    // startup. Writes are best-effort: broken lineage must never break the list.
    const repairs = reconcileForkLinks(reconciled);
    const linked = await Promise.all(
      reconciled.map(async (session) => {
        const forkedSessionIds = repairs.get(session.id);
        if (forkedSessionIds === undefined) return session;
        return store
          .updateMeta({ projectId, sessionId: session.id }, { forkedSessionIds })
          .catch(() => ({ ...session, forkedSessionIds }));
      }),
    );
    return {
      // Newest activity first. `updatedAt` is absent until the first meta
      // rewrite, so a never-prompted session sorts by its creation time rather
      // than to the bottom of the list.
      sessions: [...linked].sort((left, right) =>
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
    // Re-render the derived transcript from the log we just read. This is what
    // makes the checkpoint cadence irrelevant to crash recovery: whatever
    // `transcript.md` held before the crash, reopening replaces it with the
    // truth in `events.jsonl` — including the interrupted marker. Best-effort
    // and not awaited: the renderer is fed from `events` above, so a failed
    // cache refresh must not fail the open.
    void store.checkpointTranscript(ref).catch((error: unknown) => {
      console.error(`[chat] could not re-render the transcript for ${sessionId}:`, error);
    });
    return {
      session: repaired,
      events: events.events,
      truncatedTail: events.truncatedTail,
      live,
    } satisfies ChatSessionOpenResponse;
  });

  /**
   * Puts an agent back behind a reopened session, on its first prompt. This is
   * the ONLY chat channel that may spawn for a session that already exists on
   * disk — `list` and `open` stay pure reads, which is what keeps "UI-open ≠
   * process-running" true.
   */
  ipcMain.handle(ipcChannels.chatSessionReconnect, async (_event, payload: unknown) => {
    const { projectId, sessionId } = parseSync(SChatSessionReconnectRequest, payload);
    const store = wiring.sessions?.store();
    if (store === undefined) throw new Error('No workspace root: sessions are not persisted yet.');
    const meta = await store.readMeta({ projectId, sessionId });
    // The session was recorded against a harness this build cannot drive
    // (harnesses.json is user data). Silently resuming it on a *different*
    // agent would be the exact "fake continue" the phase forbids.
    if (!(await canDrive(meta.harnessId))) {
      return {
        outcome: 'read_only',
        reason: `This session ran on "${meta.harnessId}", which is not available here. Fork it to continue with another agent.`,
      } satisfies ChatSessionReconnectResponse;
    }
    const project = await resolveProject(projectId);
    return (await getController()).reconnect(sessionId, {
      target: meta.harnessId as ChatTarget,
      project: sessionProject(project),
      ...(meta.acpSessionId !== undefined ? { acpSessionId: meta.acpSessionId } : {}),
    });
  });

  /**
   * In-flight forks, keyed by project + idempotency key. The durable guard is
   * the key stamped on the child record, but that record does not exist until
   * the child's `session/new` returns — so two clicks landing inside that window
   * would both scan, both miss, and both spawn. This closes exactly that window;
   * everything longer-lived is answered by the scan in `forkSession`.
   */
  const forksInFlight = new Map<string, Promise<ChatSessionForkResponse>>();

  ipcMain.handle(ipcChannels.chatSessionFork, async (_event, payload: unknown) => {
    const request = parseSync(SChatSessionForkRequest, payload);
    const store = wiring.sessions?.store();
    if (store === undefined) throw new Error('No workspace root: sessions are not persisted yet.');
    const key = `${request.projectId}/${request.idempotencyKey}`;
    const inflight = forksInFlight.get(key);
    if (inflight !== undefined) return inflight;
    // Registered in the SAME synchronous turn as the lookup above: an `await`
    // before this would let two clicks both pass the check and both fork.
    const run = (async () => {
      const project = await resolveProject(request.projectId);
      return forkSession(
        {
          store: store as unknown as ForkStore,
          createChild: async (lineage, source) =>
            (await getController()).newSession(
              // The fork continues the same agent; a harness that is no longer
              // configured blocks exactly as session creation does, rather than
              // continuing the conversation on a different agent.
              await resolveForkTarget(source.harnessId, isConfigured),
              sessionProject(project),
              lineage,
            ),
        },
        request,
      );
    })();
    forksInFlight.set(key, run);
    try {
      return await run;
    } finally {
      forksInFlight.delete(key);
    }
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
  //
  // Bounded as one sequence (STEP-24-05): in-flight turns are cancelled and
  // transcripts checkpointed as best effort, then the kill-trees run — all
  // three sharing a single deadline so quit can never hang on an agent that
  // will not answer.
  //
  // The workspace re-root hook shares this exact teardown, deliberately. What
  // the deadline can abandon is only the *waiting*: `dispose` unregisters each
  // session and cancels its permissions synchronously before it awaits
  // anything, so a re-root that runs out of budget still leaves nothing writing
  // into the workspace being left — at worst a kill-tree lands a moment late.
  return async () => {
    if (controllerPromise === undefined) return;
    const controller = await controllerPromise;
    await runBoundedQuitCleanup({
      cancelInFlight: () => controller.cancelInFlight(),
      checkpoint: () => controller.checkpointAll(),
      disposeAll: () => controller.disposeAll(),
    });
  };
}

/**
 * The auth-wall payload a `ChatAuthRequiredError` carries, or `undefined` for
 * any other failure. Duck-typed rather than `instanceof`: the controller is
 * imported type-only here (it statically imports the ESM-only `@srgnt/harness`,
 * and this file is CommonJS), so its classes have no value binding to test.
 */
function authRequiredPayload(cause: unknown): ChatAuthRequired | undefined {
  if (cause === null || typeof cause !== 'object') return undefined;
  const payload = (cause as { authRequired?: unknown }).authRequired;
  if (payload === null || typeof payload !== 'object') return undefined;
  return (payload as ChatAuthRequired).authRequired === true ? (payload as ChatAuthRequired) : undefined;
}

/** Returns whether a live window actually received the frame. */
function push(wiring: ChatWiring, channel: string, payload: unknown): boolean {
  const window = wiring.getWindow();
  if (window === null || window.isDestroyed()) return false;
  window.webContents.send(channel, payload);
  return true;
}
