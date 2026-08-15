import React from 'react';
import type { ChatAuthRequired } from '@srgnt/contracts';
import { ChatTerminalProvider } from './ChatTerminalContext.js';
import { useProjectsOptional } from './ProjectsContext.js';
import type { PendingPermission } from './PermissionPrompt.js';
import {
  initialTranscriptState,
  transcriptReducer,
  type TranscriptState,
} from './transcriptReducer.js';

/**
 * Owns the open chat sessions and their transcripts (PHASE-23 STEP-23-01,
 * made plural by PHASE-24 STEP-24-03).
 *
 * This lives ABOVE the panel switch on purpose. Sessions must survive the user
 * visiting Notes or Terminal and coming back: unmounting the view would drop the
 * handles without disposing them, leaving live agent processes in the main
 * process with nothing left to cancel or dispose them by (the same trap
 * documented on `DevConsoleGate`). Disposal is tied to explicit user action and
 * app quit, never to unmount.
 *
 * Several sessions are open at once, across projects, and every one of them
 * keeps accumulating streamed updates whether or not it is the visible one —
 * that is the whole point of concurrency. Only the *active* session is projected
 * onto the single-session fields (`session`, `transcript`, …) so the Phase-23
 * views keep working unchanged; everything else reads `openSessions`.
 *
 * Streamed updates are buffered and flushed once per animation frame. One
 * trivial real-Pi turn produced ~85 frames (37 thought + 23 message + 25 tool);
 * dispatching each one separately would re-render the transcript that many times
 * for text the user cannot read that fast anyway.
 */

/**
 * `mock`, or any harness id the registry resolves — STEP-25-02 made the target
 * set registry data rather than a compile-time union, so main is the only place
 * that can say whether an id is real.
 */
export type ChatTarget = string;

export type ChatStatus = 'idle' | 'connecting' | 'ready' | 'prompting' | 'cancelling' | 'error';

export interface ChatSessionMode {
  readonly id: string;
  readonly name: string;
}

/** Agent *process* lifecycle, as pushed over `chat:session:status`. */
export interface ChatAgentStatus {
  readonly status: 'spawning' | 'ready' | 'crashed' | 'gave-up' | 'exited';
  readonly stderrTail?: string;
  readonly exitCode?: number | null;
  readonly message?: string;
}

export interface ChatSessionInfo {
  readonly sessionId: string;
  readonly target: ChatTarget;
  readonly harnessId: string;
  readonly harnessName: string;
  readonly quirks: readonly string[];
  readonly capabilities: Record<string, unknown>;
  /** The project the session was created under, or `null` when main resolved none. */
  readonly projectId: string | null;
  /**
   * Modes the agent advertised at `session/new`, or `null` when it advertised
   * none. `null` means "no mode selector" — never an empty dropdown.
   */
  readonly modes: {
    readonly currentModeId: string;
    readonly availableModes: readonly ChatSessionMode[];
  } | null;
}

/** One session the renderer is holding open, live or replayed from disk. */
export interface OpenSession {
  readonly info: ChatSessionInfo;
  readonly status: ChatStatus;
  readonly transcript: TranscriptState;
  readonly permissions: readonly PendingPermission[];
  readonly agentStatus: ChatAgentStatus | null;
  readonly lastStopReason: string | null;
  /** Auto-title, derived locally on the first prompt and confirmed by the list. */
  readonly title: string | null;
  /**
   * False for a session replayed from disk with no live connection in main.
   * The first prompt on one of these asks main to reconnect (STEP-24-04); it
   * only becomes live if the harness genuinely resumed or loaded it.
   */
  readonly live: boolean;
  /**
   * Set once a reconnect concluded the session cannot be continued: the
   * composer is disabled and forking is the one way on. `null` means "not
   * established" — a reopened session is NOT read-only until something tried.
   */
  readonly readOnlyReason: string | null;
  /** The agent's replayed history diverged from the local log (local wins). */
  readonly historyDiverged: boolean;
  /** Composer text seeded by a fork handoff; consumed once, never auto-sent. */
  readonly pendingPrompt: string | null;
}

export interface ChatSessionContextValue {
  /** The ACTIVE session, or `null` when none is open/selected. */
  readonly session: ChatSessionInfo | null;
  readonly status: ChatStatus;
  readonly error: string | null;
  readonly transcript: TranscriptState;
  /** Permission requests the ACTIVE session is currently blocked on, oldest first. */
  readonly permissions: readonly PendingPermission[];
  /**
   * The mode the session is actually in: the agent's `current_mode_update` wins
   * over what was advertised at `session/new`, so an agent-initiated switch is
   * reflected without the user touching anything.
   */
  readonly currentModeId: string | null;
  /** Latest agent-process status. `null` until the process says otherwise. */
  readonly agentStatus: ChatAgentStatus | null;
  /** Stop reason of the last completed turn, for the end-of-turn notice. */
  readonly lastStopReason: string | null;
  /** Every open session, in the order it was opened. */
  readonly openSessions: readonly OpenSession[];
  readonly activeSessionId: string | null;
  /** Brings an already-open session to the front. Unknown ids are ignored. */
  readonly selectSession: (sessionId: string) => void;
  /**
   * Renders a persisted session from disk, without spawning anything. A session
   * already open is simply re-selected, so its in-memory stream is never lost.
   */
  readonly openPersistedSession: (projectId: string, sessionId: string) => Promise<void>;
  /**
   * Bumps whenever something changed that the persisted session list would
   * show (a session opened, was titled, finished a turn, crashed, or closed).
   * The list re-reads on it rather than polling.
   */
  readonly listRevision: number;
  /**
   * Opens a session. An absent `target` lets main pick the project's
   * `defaultHarnessId` — the list's "New session" affordance never second-
   * guesses the project's own default.
   *
   * `authMethodId` is the auth panel's retry: main authenticates with it on the
   * fresh connection before `session/new`.
   */
  readonly newSession: (target?: ChatTarget, authMethodId?: string) => Promise<void>;
  /**
   * The harness demanded authentication instead of opening a session. Rendered
   * as guidance, not as an error string — see `AuthPanel`.
   */
  readonly authRequired: ChatAuthRequired | null;
  readonly dismissAuth: () => void;
  /** Resolves `true` when the turn ran; `false` when it failed (draft is kept). */
  readonly sendPrompt: (text: string) => Promise<boolean>;
  readonly setMode: (modeId: string) => Promise<void>;
  /** False when the preload predates `chat:session:set-mode`: no usable selector. */
  readonly canSetMode: boolean;
  readonly cancel: () => Promise<void>;
  readonly dispose: () => Promise<void>;
  readonly respondToPermission: (requestId: string, optionId: string | undefined) => void;
  readonly dismissError: () => void;
  /**
   * Why the ACTIVE session cannot take a prompt, or `null` when it can. Set by
   * a reconnect that found no transparent-continue path; the banner shows it
   * verbatim so the user learns *why*, not just that.
   */
  readonly readOnlyReason: string | null;
  /** The active session's replayed history disagreed with the local log. */
  readonly historyDiverged: boolean;
  /**
   * Continues the active read-only session in a new linked one. The handoff
   * text lands in the composer as a draft — this NEVER sends it.
   * `idempotencyKey` must be stable per intent so a double-click forks once.
   */
  readonly fork: (idempotencyKey: string) => Promise<void>;
  /** False when the preload predates `chat:session:fork`: no fork affordance. */
  readonly canFork: boolean;
  /** Composer seed from a fork handoff, cleared once the composer adopts it. */
  readonly pendingPrompt: string | null;
  readonly clearPendingPrompt: () => void;
}

const ChatSessionContext = React.createContext<ChatSessionContextValue | null>(null);

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** The identity block main returns for an opened, reconnected or forked session. */
interface OpenedSessionIdentity {
  readonly sessionId: string;
  readonly target: ChatTarget;
  readonly projectId?: string;
  readonly harnessId: string;
  readonly harnessName: string;
  readonly quirks: readonly string[];
  readonly capabilities: Record<string, unknown>;
  readonly modes?: { readonly currentModeId: string; readonly availableModes: readonly ChatSessionMode[] };
}

/**
 * Main's session identity → the renderer's. Shared by open, reconnect and fork
 * so a reconnected session ends up with exactly the same shape a fresh one has
 * — a second mapping is how a resumed session would end up subtly different.
 */
function identityOf(session: OpenedSessionIdentity): ChatSessionInfo {
  return {
    sessionId: session.sessionId,
    target: session.target,
    harnessId: session.harnessId,
    harnessName: session.harnessName,
    quirks: session.quirks,
    capabilities: session.capabilities,
    projectId: session.projectId ?? null,
    modes: session.modes ?? null,
  };
}

/** rAF when the environment has one (real app), a timer otherwise (jsdom/tests). */
function scheduleFlush(callback: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const handle = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(handle);
  }
  const handle = setTimeout(callback, 16);
  return () => clearTimeout(handle);
}

/**
 * Replays a persisted event stream into a transcript.
 *
 * The SAME reducer the live feed uses, fed the same `acp/session_update`
 * payloads: identical event content must render identically whether it arrived
 * over IPC or off disk, and a second replay-only render path is exactly how the
 * two would drift. `client/prompt` is replayed too — the user's own text never
 * arrives as an ACP frame, so without it a reopened session would show the
 * agent answering nothing.
 */
export function replayEvents(
  events: readonly { kind: string; payload?: unknown }[],
): TranscriptState {
  return events.reduce<TranscriptState>((state, event) => {
    if (event.kind === 'acp/session_update') {
      return transcriptReducer(state, { type: 'update', notification: event.payload });
    }
    if (event.kind === 'client/prompt') {
      const text = (event.payload as { text?: unknown } | undefined)?.text;
      return typeof text === 'string'
        ? transcriptReducer(state, { type: 'user_prompt', text })
        : state;
    }
    // A turn boundary closes the open run, so the next turn starts a new bubble
    // instead of appending to the previous answer.
    if (event.kind === 'client/stop') {
      return transcriptReducer(state, { type: 'close_open' });
    }
    return state;
  }, initialTranscriptState);
}

export function ChatSessionProvider({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  // Optional: Phase-23 tests and any surface without projects mount this
  // provider on its own, and a missing project context just means "let main
  // derive the project from the cwd".
  const projects = useProjectsOptional();
  const activeProjectId = projects?.activeProjectId ?? null;
  const refreshProjects = projects?.refresh;
  const [sessions, setSessions] = React.useState<readonly OpenSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [authRequired, setAuthRequired] = React.useState<ChatAuthRequired | null>(null);
  // Session creation has no session to hang a status on yet, so it lives here.
  const [connecting, setConnecting] = React.useState(false);
  const [listRevision, setListRevision] = React.useState(0);
  const bumpList = React.useCallback(() => setListRevision((revision) => revision + 1), []);

  // The subscriptions are installed once and route on the session id in the
  // frame, so re-subscribing per session (and racing the frames that arrive
  // during a swap) is avoided. Every open session receives its own frames,
  // visible or not.
  const knownIds = React.useRef<ReadonlySet<string>>(new Set());
  const activeIdRef = React.useRef<string | null>(null);
  /** Mirrors `sessions` so callbacks can read `live` without re-binding. */
  const liveById = React.useRef<ReadonlyMap<string, boolean>>(new Map());
  /** Same mirror for the whole record, when a callback needs more than `live`. */
  const sessionsRef = React.useRef<readonly OpenSession[]>([]);
  const pending = React.useRef(new Map<string, unknown[]>());
  const cancelFlush = React.useRef<(() => void) | null>(null);
  /**
   * Prompts that arrived before their session handle was known. An agent may
   * ask for permission during `initialize` or `session/new`, while
   * `chatSessionNew` has not returned yet — main counts that push as delivered,
   * so discarding it would block the agent for the full permission deadline.
   */
  const earlyPermissions = React.useRef<{ sessionId: string; request: PendingPermission }[]>([]);
  /** Same race for process lifecycle: last status seen per not-yet-adopted handle. */
  const earlyStatuses = React.useRef<Record<string, ChatAgentStatus>>({});

  React.useEffect(() => {
    knownIds.current = new Set(sessions.map((entry) => entry.info.sessionId));
    liveById.current = new Map(sessions.map((entry) => [entry.info.sessionId, entry.live]));
    sessionsRef.current = sessions;
    activeIdRef.current = activeSessionId;
  }, [sessions, activeSessionId]);

  /** Patches one session in place. A stale id is a no-op, never a crash. */
  const patch = React.useCallback(
    (sessionId: string, change: (entry: OpenSession) => OpenSession) => {
      setSessions((current) => {
        const index = current.findIndex((entry) => entry.info.sessionId === sessionId);
        if (index === -1) return current;
        const next = [...current];
        next[index] = change(current[index]!);
        return next;
      });
    },
    [],
  );

  const flush = React.useCallback(() => {
    cancelFlush.current = null;
    if (pending.current.size === 0) return;
    const batches = pending.current;
    pending.current = new Map();
    setSessions((current) =>
      current.map((entry) => {
        const batch = batches.get(entry.info.sessionId);
        if (batch === undefined || batch.length === 0) return entry;
        return {
          ...entry,
          transcript: transcriptReducer(entry.transcript, { type: 'updates', notifications: batch }),
        };
      }),
    );
  }, []);

  React.useEffect(() => {
    // Guarded: the provider mounts for every panel, including in environments
    // (older preload, harness-less test renders) where the chat bridge is absent.
    // A missing bridge must leave the rest of the app fully usable.
    if (typeof window.srgnt?.onChatSessionUpdate !== 'function') return;
    const unsubscribe = window.srgnt.onChatSessionUpdate((event) => {
      // Frames are keyed by the srgnt session id: a dev-console session, or one
      // this renderer already disposed, must never land in someone's transcript.
      if (!knownIds.current.has(event.sessionId)) return;
      const batch = pending.current.get(event.sessionId);
      if (batch === undefined) pending.current.set(event.sessionId, [event.update]);
      else batch.push(event.update);
      if (cancelFlush.current === null) {
        cancelFlush.current = scheduleFlush(flush);
      }
    });
    return () => {
      unsubscribe();
      if (cancelFlush.current !== null) {
        cancelFlush.current();
        cancelFlush.current = null;
      }
    };
  }, [flush]);

  // Permission prompts are NOT batched into the rAF flush: the agent's turn is
  // blocked on each one, so a frame of latency buys nothing and dropping one
  // into a batch that a `reset` later clears would strand the agent.
  React.useEffect(() => {
    if (typeof window.srgnt?.onChatPermissionRequest !== 'function') return;
    const unsubscribeRequest = window.srgnt.onChatPermissionRequest((event) => {
      const request = { ...event, paths: [...event.paths], options: [...event.options] };
      if (!knownIds.current.has(event.sessionId)) {
        // Not a session we know — but it may be the one still being created.
        // Hold it until `newSession` learns the handle; capped because an
        // unmatched id would otherwise accumulate forever.
        earlyPermissions.current = [
          ...earlyPermissions.current.filter((held) => held.request.requestId !== event.requestId),
          { sessionId: event.sessionId, request },
        ].slice(-20);
        return;
      }
      patch(event.sessionId, (entry) => ({
        ...entry,
        // The agent may re-send on reconnect; ids are the identity, not order.
        permissions: entry.permissions.some((held) => held.requestId === event.requestId)
          ? entry.permissions
          : [...entry.permissions, request],
      }));
    });
    // Main resolved it without us (turn cancel, deadline, dispose): the prompt
    // is already answered, so leaving it on screen would let the user "decide"
    // something nobody is listening for.
    const unsubscribeClose = window.srgnt.onChatPermissionClose?.((event) => {
      earlyPermissions.current = earlyPermissions.current.filter(
        (held) => held.request.requestId !== event.requestId,
      );
      patch(event.sessionId, (entry) => ({
        ...entry,
        permissions: entry.permissions.filter((held) => held.requestId !== event.requestId),
      }));
    });
    return () => {
      unsubscribeRequest();
      unsubscribeClose?.();
    };
  }, [patch]);

  // Process lifecycle (STEP-23-04). Not batched with transcript frames: a crash
  // must reach the user immediately, and there may be no further frames at all.
  React.useEffect(() => {
    if (typeof window.srgnt?.onChatSessionStatus !== 'function') return;
    return window.srgnt.onChatSessionStatus((event) => {
      const { sessionId, ...status } = event;
      if (!knownIds.current.has(sessionId)) {
        // An agent can die between answering session/new and `chatSessionNew`
        // resolving here. Dropping that status would install an already-dead
        // session with a working composer and no recovery banner.
        earlyStatuses.current = { ...earlyStatuses.current, [sessionId]: status };
        return;
      }
      patch(sessionId, (entry) => ({ ...entry, agentStatus: status }));
      // A crash rewrites the persisted status to `error`; the list must show it.
      if (status.status !== 'spawning' && status.status !== 'ready') bumpList();
    });
  }, [patch, bumpList]);

  const respondToPermission = React.useCallback(
    (requestId: string, optionId: string | undefined) => {
      const current = activeIdRef.current;
      if (current === null) return;
      // Optimistic removal: the main process treats a late or duplicate response
      // as unknown and drops it, so a double-click cannot answer twice.
      patch(current, (entry) => ({
        ...entry,
        permissions: entry.permissions.filter((request) => request.requestId !== requestId),
      }));
      void window.srgnt.chatPermissionRespond(current, requestId, optionId);
    },
    [patch],
  );

  const newSession = React.useCallback(
    async (target?: ChatTarget, authMethodId?: string) => {
      setError(null);
      setConnecting(true);
      try {
        // `undefined` is meaningful: it tells main to derive (and auto-create) the
        // project from the workspace cwd, which is what happens before the user
        // has ever opened the switcher.
        const result = await window.srgnt.chatSessionNew(target, activeProjectId ?? undefined, authMethodId);
        // The agent answered the auth wall instead of a session. Nothing was
        // opened and nothing is running: this is guidance, not a failed session.
        if ('authRequired' in result) {
          setAuthRequired(result);
          return;
        }
        setAuthRequired(null);
        // Adopt anything the agent asked during startup; drop the rest, which
        // belonged to sessions that never became this one.
        const held = earlyPermissions.current
          .filter((entry) => entry.sessionId === result.sessionId)
          .map((entry) => entry.request);
        // Only this session's entries. Sessions are concurrent now — the header
        // button and the session list can both be creating one — so clearing the
        // whole buffer would discard the other creation's startup prompt and
        // leave that agent blocked until its permission deadline expires.
        earlyPermissions.current = earlyPermissions.current.filter(
          (entry) => entry.sessionId !== result.sessionId,
        );
        // A status that arrived before the handle was known still describes THIS
        // process — adopt it so a startup crash surfaces instead of vanishing.
        const heldStatus = earlyStatuses.current[result.sessionId] ?? null;
        const { [result.sessionId]: _adopted, ...remainingStatuses } = earlyStatuses.current;
        earlyStatuses.current = remainingStatuses;
        const opened: OpenSession = {
          info: identityOf(result),
          status: 'ready',
          transcript: initialTranscriptState,
          permissions: held,
          agentStatus: heldStatus,
          lastStopReason: null,
          title: null,
          live: true,
          readOnlyReason: null,
          historyDiverged: false,
          pendingPrompt: null,
        };
        // Set before the state lands: frames for this session can arrive in the
        // same tick, and the router drops anything it does not recognise.
        knownIds.current = new Set([...knownIds.current, result.sessionId]);
        activeIdRef.current = result.sessionId;
        setSessions((current) => [...current, opened]);
        setActiveSessionId(result.sessionId);
        bumpList();
        // A session may have just auto-created its project; without this the
        // switcher stays empty until the next reload.
        void refreshProjects?.();
      } catch (cause) {
        // The controller already tore down its side, so there is no handle to
        // clean up here — just surface it and stay in a retryable state.
        setError(messageOf(cause));
      } finally {
        setConnecting(false);
      }
    },
    [activeProjectId, refreshProjects, bumpList],
  );

  const selectSession = React.useCallback((sessionId: string) => {
    setActiveSessionId((current) => (current === sessionId ? current : sessionId));
  }, []);

  const openPersistedSession = React.useCallback(
    async (projectId: string, sessionId: string) => {
      // Already open: re-select rather than reload. Re-reading disk would drop
      // everything a background session streamed since it was last shown.
      if (knownIds.current.has(sessionId)) {
        setActiveSessionId(sessionId);
        return;
      }
      if (typeof window.srgnt?.chatSessionOpen !== 'function') return;
      setError(null);
      try {
        const result = await window.srgnt.chatSessionOpen(projectId, sessionId);
        const opened: OpenSession = {
          info: {
            sessionId: result.session.id,
            // The persisted record knows the harness id, not which of the two
            // chat targets it was; they coincide for every target we can drive.
            target: result.session.harnessId === 'pi' ? 'pi' : 'mock',
            harnessId: result.session.harnessId,
            harnessName: result.session.harnessId,
            quirks: [],
            capabilities: {},
            projectId: result.session.projectId,
            modes: null,
          },
          status: 'ready',
          transcript: replayEvents(result.events),
          permissions: [],
          agentStatus: null,
          lastStopReason: null,
          title: result.session.title ?? null,
          // Not live does NOT mean read-only: the first prompt asks main to
          // reconnect, and only a failed cascade sets `readOnlyReason`.
          live: result.live,
          readOnlyReason: null,
          historyDiverged: false,
          pendingPrompt: null,
        };
        knownIds.current = new Set([...knownIds.current, sessionId]);
        // `knownIds` is only written after the read resolves, so two clicks on
        // one row both pass the guard above. De-duplicate in the updater, which
        // is the only place that sees the committed list.
        setSessions((current) =>
          current.some((entry) => entry.info.sessionId === sessionId) ? current : [...current, opened],
        );
        setActiveSessionId(sessionId);
      } catch (cause) {
        setError(messageOf(cause));
      }
    },
    [],
  );

  /**
   * Puts an agent back behind a reopened session, on the prompt that needs one.
   *
   * Reopening stays process-free; this is the lazy half of that bargain. It
   * resolves `true` only when the session genuinely continues — a harness that
   * cannot resume marks the session read-only (fork is then the only way on)
   * and a transient failure leaves it retryable, so the NEXT prompt tries again
   * rather than the session being written off.
   */
  const reconnect = React.useCallback(
    async (sessionId: string, projectId: string | null): Promise<boolean> => {
      if (projectId === null || typeof window.srgnt?.chatSessionReconnect !== 'function') {
        // No route to reconnect at all (older preload, or a session with no
        // project). Leaving only an error would keep the composer enabled and
        // let the user keep sending into nothing — the read-only state IS the
        // honest one here.
        const reason = 'This session cannot be reconnected here. Fork it to keep going.';
        patch(sessionId, (entry) => ({ ...entry, live: false, readOnlyReason: reason }));
        setError(reason);
        return false;
      }
      let result;
      try {
        result = await window.srgnt.chatSessionReconnect(projectId, sessionId);
      } catch (cause) {
        setError(messageOf(cause));
        return false;
      }
      if (result.outcome === 'read_only') {
        patch(sessionId, (entry) => ({
          ...entry,
          live: false,
          readOnlyReason: result.reason ?? 'This session cannot be continued.',
        }));
        return false;
      }
      if (result.outcome === 'retryable') {
        // Deliberately NOT read-only: the harness may resume it fine next time.
        setError(result.reason ?? 'Could not reach the agent. Try again.');
        return false;
      }
      patch(sessionId, (entry) => ({
        ...entry,
        live: true,
        readOnlyReason: null,
        historyDiverged: result.historyDiverged === true,
        // A resumed session regains its real harness identity, capabilities and
        // — for a `session/load` — its advertised modes, so the thinking-level
        // selector comes back instead of staying blank.
        info: result.session === undefined ? entry.info : { ...entry.info, ...identityOf(result.session) },
      }));
      liveById.current = new Map(liveById.current).set(sessionId, true);
      return true;
    },
    [patch],
  );

  const sendPrompt = React.useCallback(
    async (text: string): Promise<boolean> => {
      const current = activeIdRef.current;
      if (current === null || text.trim() === '') return false;
      // A session replayed from disk has no process behind it yet. Ask main for
      // one HERE rather than refusing: reopen is process-free by design, and the
      // first prompt is exactly when a process becomes worth spawning.
      if (liveById.current.get(current) === false) {
        const projectId = sessionsRef.current.find((entry) => entry.info.sessionId === current)
          ?.info.projectId ?? null;
        if (!(await reconnect(current, projectId))) return false;
      }
      setError(null);
      patch(current, (entry) => ({
        ...entry,
        status: 'prompting',
        lastStopReason: null,
        transcript: transcriptReducer(entry.transcript, { type: 'user_prompt', text }),
      }));
      let ok = false;
      try {
        const result = await window.srgnt.chatSessionPrompt(current, text);
        patch(current, (entry) => ({ ...entry, status: 'ready', lastStopReason: result.stopReason }));
        ok = true;
      } catch (cause) {
        setError(messageOf(cause));
        patch(current, (entry) => ({
          ...entry,
          status: 'error',
          // The composer hands this text back for a retry, so the entry that
          // never ran has to be distinguishable from the one that will.
          transcript: transcriptReducer(entry.transcript, { type: 'prompt_failed' }),
        }));
      } finally {
        // Whether the turn ended, failed, or was interrupted, no more chunks
        // belong to the trailing run — a later turn must start a fresh bubble.
        flush();
        patch(current, (entry) => ({
          ...entry,
          transcript: transcriptReducer(entry.transcript, { type: 'close_open' }),
        }));
        // The turn just moved the session's title, status and `updatedAt`.
        bumpList();
      }
      return ok;
    },
    [flush, patch, bumpList],
  );

  /**
   * Continues the active session in a new, linked one.
   *
   * The handoff text is installed as a DRAFT and nothing is sent: the whole
   * point of the fork path is that the user sees the context the new session
   * gets. A reused fork (double-click, retry after a crash) resolves to the
   * child that already exists and is simply opened from disk.
   */
  const fork = React.useCallback(
    async (idempotencyKey: string) => {
      const current = activeIdRef.current;
      if (current === null || typeof window.srgnt?.chatSessionFork !== 'function') return;
      const source = sessionsRef.current.find((entry) => entry.info.sessionId === current);
      const projectId = source?.info.projectId ?? null;
      if (projectId === null) {
        setError('This session has no project, so it cannot be forked.');
        return;
      }
      try {
        const result = await window.srgnt.chatSessionFork(projectId, current, idempotencyKey);
        if (result.reused) {
          // The child already exists (and may no longer be live). Open it the
          // ordinary way rather than installing a second record for one id.
          await openPersistedSession(projectId, result.session.sessionId);
          // `openPersistedSession` clears `pendingPrompt`, so without this a
          // retry or double-click drops the handoff the user was meant to read
          // before sending — the whole point of seeding it as a draft.
          if (result.handoffText !== '') {
            patch(result.session.sessionId, (entry) => ({ ...entry, pendingPrompt: result.handoffText }));
          }
          return;
        }
        const opened: OpenSession = {
          info: identityOf(result.session),
          status: 'ready',
          transcript: initialTranscriptState,
          permissions: [],
          agentStatus: null,
          lastStopReason: null,
          title: null,
          live: true,
          readOnlyReason: null,
          historyDiverged: false,
          pendingPrompt: result.handoffText === '' ? null : result.handoffText,
        };
        knownIds.current = new Set([...knownIds.current, result.session.sessionId]);
        activeIdRef.current = result.session.sessionId;
        setSessions((currentList) =>
          currentList.some((entry) => entry.info.sessionId === result.session.sessionId)
            ? currentList
            : [...currentList, opened],
        );
        setActiveSessionId(result.session.sessionId);
        setError(null);
        bumpList();
      } catch (cause) {
        setError(messageOf(cause));
      }
    },
    [bumpList, openPersistedSession],
  );

  const clearPendingPrompt = React.useCallback(() => {
    const current = activeIdRef.current;
    if (current === null) return;
    patch(current, (entry) => (entry.pendingPrompt === null ? entry : { ...entry, pendingPrompt: null }));
  }, [patch]);

  const setMode = React.useCallback(
    async (modeId: string) => {
      const current = activeIdRef.current;
      if (current === null || typeof window.srgnt?.chatSessionSetMode !== 'function') return;
      try {
        const result = await window.srgnt.chatSessionSetMode(current, modeId);
        // Reflect what the agent accepted, not what was clicked. The reducer's
        // `current_mode_update` is the other (agent-initiated) path into the same
        // field, so both converge on one source of truth.
        patch(current, (entry) => ({
          ...entry,
          transcript: transcriptReducer(entry.transcript, {
            type: 'update',
            notification: { sessionUpdate: 'current_mode_update', currentModeId: result.currentModeId },
          }),
        }));
      } catch (cause) {
        setError(messageOf(cause));
      }
    },
    [patch],
  );

  const cancel = React.useCallback(async () => {
    const current = activeIdRef.current;
    if (current === null) return;
    // `session/cancel` is a notification, not a turn ender: the outstanding
    // prompt stays unresolved until the agent finishes winding down. Returning
    // to `ready` here would re-enable Send and let a second prompt run
    // concurrently with the cancelled turn on the same ACP session, interleaving
    // its updates. The turn stays busy until the prompt promise itself settles
    // in `sendPrompt`, which is the only signal that the agent is actually done.
    patch(current, (entry) => ({
      ...entry,
      status: entry.status === 'prompting' ? 'cancelling' : entry.status,
    }));
    try {
      await window.srgnt.chatSessionCancel(current);
    } catch (cause) {
      setError(messageOf(cause));
      patch(current, (entry) => ({ ...entry, status: 'error' }));
    }
  }, [patch]);

  const dispose = React.useCallback(async () => {
    const current = activeIdRef.current;
    if (current === null) return;
    try {
      await window.srgnt.chatSessionDispose(current);
    } catch (cause) {
      // Keep the record so the user can retry: forgetting it here would strand
      // the agent process with no way to dispose it before app quit.
      setError(messageOf(cause));
      patch(current, (entry) => ({ ...entry, status: 'error' }));
      return;
    }
    setError(null);
    pending.current.delete(current);
    knownIds.current = new Set([...knownIds.current].filter((id) => id !== current));
    setSessions((sessionList) => sessionList.filter((entry) => entry.info.sessionId !== current));
    // Fall back to whatever is still open rather than to nothing: with three
    // sessions running, ending one should not empty the panel. Resolved off the
    // id set rather than inside the state updater, which React may re-run.
    const remaining = [...knownIds.current];
    setActiveSessionId(remaining.at(-1) ?? null);
    bumpList();
  }, [patch, bumpList]);

  const dismissError = React.useCallback(() => setError(null), []);
  const dismissAuth = React.useCallback(() => setAuthRequired(null), []);

  const active = sessions.find((entry) => entry.info.sessionId === activeSessionId) ?? null;

  const value = React.useMemo<ChatSessionContextValue>(
    () => ({
      session: active?.info ?? null,
      // `connecting` only while nothing is selected: opening a SECOND session
      // must not blank out the first one's composer mid-turn.
      status: connecting && active === null ? 'connecting' : (active?.status ?? 'idle'),
      error,
      transcript: active?.transcript ?? initialTranscriptState,
      permissions: active?.permissions ?? [],
      currentModeId: active?.transcript.currentModeId ?? active?.info.modes?.currentModeId ?? null,
      // The preload bridge is optional in the types, so the selector must not
      // offer a switch that `setMode` would silently swallow.
      canSetMode: typeof window.srgnt?.chatSessionSetMode === 'function',
      agentStatus: active?.agentStatus ?? null,
      lastStopReason: active?.lastStopReason ?? null,
      openSessions: sessions,
      activeSessionId,
      selectSession,
      openPersistedSession,
      listRevision,
      newSession,
      authRequired,
      dismissAuth,
      sendPrompt,
      setMode,
      cancel,
      dispose,
      respondToPermission,
      dismissError,
      readOnlyReason: active?.readOnlyReason ?? null,
      historyDiverged: active?.historyDiverged ?? false,
      fork,
      canFork: typeof window.srgnt?.chatSessionFork === 'function',
      pendingPrompt: active?.pendingPrompt ?? null,
      clearPendingPrompt,
    }),
    [
      active,
      sessions,
      activeSessionId,
      error,
      connecting,
      listRevision,
      selectSession,
      openPersistedSession,
      newSession,
      authRequired,
      dismissAuth,
      sendPrompt,
      setMode,
      cancel,
      dispose,
      respondToPermission,
      dismissError,
      fork,
      clearPendingPrompt,
    ],
  );

  return (
    <ChatSessionContext.Provider value={value}>
      {/* Nested, not merged: terminal chunks arrive far more often than
          transcript updates and must not re-render every transcript consumer. */}
      <ChatTerminalProvider sessionId={activeSessionId}>{children}</ChatTerminalProvider>
    </ChatSessionContext.Provider>
  );
}

/** Like {@link useChatSession}, but `null` outside the provider. */
export function useChatSessionOptional(): ChatSessionContextValue | null {
  return React.useContext(ChatSessionContext);
}

export function useChatSession(): ChatSessionContextValue {
  const value = React.useContext(ChatSessionContext);
  if (value === null) {
    throw new Error('useChatSession must be used inside a ChatSessionProvider');
  }
  return value;
}
