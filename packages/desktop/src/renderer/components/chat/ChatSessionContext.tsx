import React from 'react';
import { ChatTerminalProvider } from './ChatTerminalContext.js';
import { useProjectsOptional } from './ProjectsContext.js';
import type { PendingPermission } from './PermissionPrompt.js';
import {
  initialTranscriptState,
  transcriptReducer,
  type TranscriptState,
} from './transcriptReducer.js';

/**
 * Owns the live chat session and its transcript (PHASE-23, STEP-23-01).
 *
 * This lives ABOVE the panel switch on purpose. The session is ephemeral but it
 * must survive the user visiting Notes or Terminal and coming back: unmounting
 * the view would drop the session handle without disposing it, leaving a live
 * agent process in the main process with nothing left to cancel or dispose it by
 * (the same trap documented on `DevConsoleGate`). Disposal is therefore tied to
 * explicit user action and app quit, never to unmount.
 *
 * Streamed updates are buffered and flushed once per animation frame. One
 * trivial real-Pi turn produced ~85 frames (37 thought + 23 message + 25 tool);
 * dispatching each one separately would re-render the transcript that many times
 * for text the user cannot read that fast anyway.
 */

export type ChatTarget = 'mock' | 'pi';

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

export interface ChatSessionContextValue {
  readonly session: ChatSessionInfo | null;
  readonly status: ChatStatus;
  readonly error: string | null;
  readonly transcript: TranscriptState;
  /** Permission requests the agent is currently blocked on, oldest first. */
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
  readonly newSession: (target: ChatTarget) => Promise<void>;
  /** Resolves `true` when the turn ran; `false` when it failed (draft is kept). */
  readonly sendPrompt: (text: string) => Promise<boolean>;
  readonly setMode: (modeId: string) => Promise<void>;
  /** False when the preload predates `chat:session:set-mode`: no usable selector. */
  readonly canSetMode: boolean;
  readonly cancel: () => Promise<void>;
  readonly dispose: () => Promise<void>;
  readonly respondToPermission: (requestId: string, optionId: string | undefined) => void;
  readonly dismissError: () => void;
}

const ChatSessionContext = React.createContext<ChatSessionContextValue | null>(null);

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
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

export function ChatSessionProvider({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  // Optional: Phase-23 tests and any surface without projects mount this
  // provider on its own, and a missing project context just means "let main
  // derive the project from the cwd".
  const projects = useProjectsOptional();
  const activeProjectId = projects?.activeProjectId ?? null;
  const refreshProjects = projects?.refresh;
  const [session, setSession] = React.useState<ChatSessionInfo | null>(null);
  const [status, setStatus] = React.useState<ChatStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [transcript, dispatch] = React.useReducer(transcriptReducer, initialTranscriptState);
  const [permissions, setPermissions] = React.useState<readonly PendingPermission[]>([]);
  const [agentStatus, setAgentStatus] = React.useState<ChatAgentStatus | null>(null);
  const [lastStopReason, setLastStopReason] = React.useState<string | null>(null);

  // The subscription is installed once and filters on a ref, so re-subscribing
  // per session (and racing the frames that arrive during the swap) is avoided.
  const sessionIdRef = React.useRef<string | null>(null);
  const pending = React.useRef<unknown[]>([]);
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
    sessionIdRef.current = session?.sessionId ?? null;
  }, [session]);

  const flush = React.useCallback(() => {
    cancelFlush.current = null;
    if (pending.current.length === 0) return;
    const batch = pending.current;
    pending.current = [];
    dispatch({ type: 'updates', notifications: batch });
  }, []);

  React.useEffect(() => {
    // Guarded: the provider mounts for every panel, including in environments
    // (older preload, harness-less test renders) where the chat bridge is absent.
    // A missing bridge must leave the rest of the app fully usable.
    if (typeof window.srgnt?.onChatSessionUpdate !== 'function') return;
    const unsubscribe = window.srgnt.onChatSessionUpdate((event) => {
      // Frames are keyed by the chat-local handle: a stale session's tail (or a
      // dev-console session) must never appear in this transcript.
      if (event.sessionId !== sessionIdRef.current) return;
      pending.current.push(event.update);
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
      if (event.sessionId !== sessionIdRef.current) {
        // Not this session's — but it may be the session still being created.
        // Hold it until `newSession` learns the handle; capped because an
        // unmatched id would otherwise accumulate forever.
        earlyPermissions.current = [
          ...earlyPermissions.current.filter((held) => held.request.requestId !== event.requestId),
          { sessionId: event.sessionId, request },
        ].slice(-20);
        return;
      }
      setPermissions((current) =>
        // The agent may re-send on reconnect; ids are the identity, not order.
        current.some((pending) => pending.requestId === event.requestId) ? current : [...current, request],
      );
    });
    // Main resolved it without us (turn cancel, deadline, dispose): the prompt
    // is already answered, so leaving it on screen would let the user "decide"
    // something nobody is listening for.
    const unsubscribeClose = window.srgnt.onChatPermissionClose?.((event) => {
      earlyPermissions.current = earlyPermissions.current.filter(
        (held) => held.request.requestId !== event.requestId,
      );
      if (event.sessionId !== sessionIdRef.current) return;
      setPermissions((current) => current.filter((pending) => pending.requestId !== event.requestId));
    });
    return () => {
      unsubscribeRequest();
      unsubscribeClose?.();
    };
  }, []);

  // Process lifecycle (STEP-23-04). Not batched with transcript frames: a crash
  // must reach the user immediately, and there may be no further frames at all.
  React.useEffect(() => {
    if (typeof window.srgnt?.onChatSessionStatus !== 'function') return;
    return window.srgnt.onChatSessionStatus((event) => {
      const { sessionId, ...status } = event;
      if (sessionId !== sessionIdRef.current) {
        // An agent can die between answering session/new and `chatSessionNew`
        // resolving here. Dropping that status would install an already-dead
        // session with a working composer and no recovery banner.
        earlyStatuses.current = { ...earlyStatuses.current, [sessionId]: status };
        return;
      }
      setAgentStatus(status);
    });
  }, []);

  const respondToPermission = React.useCallback((requestId: string, optionId: string | undefined) => {
    const current = sessionIdRef.current;
    if (current === null) return;
    // Optimistic removal: the main process treats a late or duplicate response
    // as unknown and drops it, so a double-click cannot answer twice.
    setPermissions((pending) => pending.filter((request) => request.requestId !== requestId));
    void window.srgnt.chatPermissionRespond(current, requestId, optionId);
  }, []);

  const newSession = React.useCallback(async (target: ChatTarget) => {
    setError(null);
    setStatus('connecting');
    try {
      // `undefined` is meaningful: it tells main to derive (and auto-create) the
      // project from the workspace cwd, which is what happens before the user
      // has ever opened the switcher.
      const result = await window.srgnt.chatSessionNew(target, activeProjectId ?? undefined);
      pending.current = [];
      sessionIdRef.current = result.sessionId;
      dispatch({ type: 'reset' });
      // Adopt anything the agent asked during startup; drop the rest, which
      // belonged to sessions that never became this one.
      const held = earlyPermissions.current
        .filter((entry) => entry.sessionId === result.sessionId)
        .map((entry) => entry.request);
      earlyPermissions.current = [];
      setPermissions(held);
      // A status that arrived before the handle was known still describes THIS
      // process — adopt it so a startup crash surfaces instead of vanishing.
      const heldStatus = earlyStatuses.current[result.sessionId] ?? null;
      earlyStatuses.current = {};
      setAgentStatus(heldStatus);
      setLastStopReason(null);
      setSession({
        sessionId: result.sessionId,
        target: result.target,
        harnessId: result.harnessId,
        harnessName: result.harnessName,
        quirks: result.quirks,
        capabilities: result.capabilities,
        projectId: result.projectId ?? null,
        modes: result.modes ?? null,
      });
      setStatus('ready');
      // A session may have just auto-created its project; without this the
      // switcher stays empty until the next reload.
      void refreshProjects?.();
    } catch (cause) {
      // The controller already tore down its side, so there is no handle to
      // clean up here — just surface it and stay in a retryable state.
      setSession(null);
      sessionIdRef.current = null;
      setStatus('error');
      setError(messageOf(cause));
    }
  }, [activeProjectId, refreshProjects]);

  const sendPrompt = React.useCallback(
    async (text: string): Promise<boolean> => {
      const current = sessionIdRef.current;
      if (current === null || text.trim() === '') return false;
      setError(null);
      setLastStopReason(null);
      setStatus('prompting');
      dispatch({ type: 'user_prompt', text });
      let ok = false;
      try {
        const result = await window.srgnt.chatSessionPrompt(current, text);
        setLastStopReason(result.stopReason);
        setStatus('ready');
        ok = true;
      } catch (cause) {
        setStatus('error');
        setError(messageOf(cause));
        // The composer hands this text back for a retry, so the entry that never
        // ran has to be distinguishable from the one that will.
        dispatch({ type: 'prompt_failed' });
      } finally {
        // Whether the turn ended, failed, or was interrupted, no more chunks
        // belong to the trailing run — a later turn must start a fresh bubble.
        flush();
        dispatch({ type: 'close_open' });
      }
      return ok;
    },
    [flush],
  );

  const setMode = React.useCallback(async (modeId: string) => {
    const current = sessionIdRef.current;
    if (current === null || typeof window.srgnt?.chatSessionSetMode !== 'function') return;
    try {
      const result = await window.srgnt.chatSessionSetMode(current, modeId);
      // Reflect what the agent accepted, not what was clicked. The reducer's
      // `current_mode_update` is the other (agent-initiated) path into the same
      // field, so both converge on one source of truth.
      dispatch({
        type: 'update',
        notification: { sessionUpdate: 'current_mode_update', currentModeId: result.currentModeId },
      });
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, []);

  const cancel = React.useCallback(async () => {
    const current = sessionIdRef.current;
    if (current === null) return;
    // `session/cancel` is a notification, not a turn ender: the outstanding
    // prompt stays unresolved until the agent finishes winding down. Returning
    // to `ready` here would re-enable Send and let a second prompt run
    // concurrently with the cancelled turn on the same ACP session, interleaving
    // its updates. The turn stays busy until the prompt promise itself settles
    // in `sendPrompt`, which is the only signal that the agent is actually done.
    setStatus((previous) => (previous === 'prompting' ? 'cancelling' : previous));
    try {
      await window.srgnt.chatSessionCancel(current);
    } catch (cause) {
      setStatus('error');
      setError(messageOf(cause));
    }
  }, []);

  const dispose = React.useCallback(async () => {
    const current = sessionIdRef.current;
    if (current === null) return;
    try {
      await window.srgnt.chatSessionDispose(current);
      setSession(null);
      sessionIdRef.current = null;
      setStatus('idle');
      setError(null);
      dispatch({ type: 'reset' });
      setPermissions([]);
      setAgentStatus(null);
      setLastStopReason(null);
    } catch (cause) {
      // Keep the handle so the user can retry: forgetting it here would strand
      // the agent process with no way to dispose it before app quit.
      setStatus('error');
      setError(messageOf(cause));
    }
  }, []);

  const dismissError = React.useCallback(() => setError(null), []);

  const value = React.useMemo<ChatSessionContextValue>(
    () => ({
      session,
      status,
      error,
      transcript,
      permissions,
      currentModeId: transcript.currentModeId ?? session?.modes?.currentModeId ?? null,
      // The preload bridge is optional in the types, so the selector must not
      // offer a switch that `setMode` would silently swallow.
      canSetMode: typeof window.srgnt?.chatSessionSetMode === 'function',
      agentStatus,
      lastStopReason,
      newSession,
      sendPrompt,
      setMode,
      cancel,
      dispose,
      respondToPermission,
      dismissError,
    }),
    [
      session,
      status,
      error,
      transcript,
      permissions,
      agentStatus,
      lastStopReason,
      newSession,
      sendPrompt,
      setMode,
      cancel,
      dispose,
      respondToPermission,
      dismissError,
    ],
  );

  return (
    <ChatSessionContext.Provider value={value}>
      {/* Nested, not merged: terminal chunks arrive far more often than
          transcript updates and must not re-render every transcript consumer. */}
      <ChatTerminalProvider sessionId={session?.sessionId ?? null}>{children}</ChatTerminalProvider>
    </ChatSessionContext.Provider>
  );
}

export function useChatSession(): ChatSessionContextValue {
  const value = React.useContext(ChatSessionContext);
  if (value === null) {
    throw new Error('useChatSession must be used inside a ChatSessionProvider');
  }
  return value;
}
