import React from 'react';
import { ChatTerminalProvider } from './ChatTerminalContext.js';
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

export interface ChatSessionInfo {
  readonly sessionId: string;
  readonly target: ChatTarget;
  readonly harnessId: string;
  readonly harnessName: string;
  readonly quirks: readonly string[];
  readonly capabilities: Record<string, unknown>;
}

export interface ChatSessionContextValue {
  readonly session: ChatSessionInfo | null;
  readonly status: ChatStatus;
  readonly error: string | null;
  readonly transcript: TranscriptState;
  readonly newSession: (target: ChatTarget) => Promise<void>;
  readonly sendPrompt: (text: string) => Promise<void>;
  readonly cancel: () => Promise<void>;
  readonly dispose: () => Promise<void>;
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
  const [session, setSession] = React.useState<ChatSessionInfo | null>(null);
  const [status, setStatus] = React.useState<ChatStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [transcript, dispatch] = React.useReducer(transcriptReducer, initialTranscriptState);

  // The subscription is installed once and filters on a ref, so re-subscribing
  // per session (and racing the frames that arrive during the swap) is avoided.
  const sessionIdRef = React.useRef<string | null>(null);
  const pending = React.useRef<unknown[]>([]);
  const cancelFlush = React.useRef<(() => void) | null>(null);

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

  const newSession = React.useCallback(async (target: ChatTarget) => {
    setError(null);
    setStatus('connecting');
    try {
      const result = await window.srgnt.chatSessionNew(target);
      pending.current = [];
      sessionIdRef.current = result.sessionId;
      dispatch({ type: 'reset' });
      setSession({
        sessionId: result.sessionId,
        target: result.target,
        harnessId: result.harnessId,
        harnessName: result.harnessName,
        quirks: result.quirks,
        capabilities: result.capabilities,
      });
      setStatus('ready');
    } catch (cause) {
      // The controller already tore down its side, so there is no handle to
      // clean up here — just surface it and stay in a retryable state.
      setSession(null);
      sessionIdRef.current = null;
      setStatus('error');
      setError(messageOf(cause));
    }
  }, []);

  const sendPrompt = React.useCallback(
    async (text: string) => {
      const current = sessionIdRef.current;
      if (current === null || text.trim() === '') return;
      setError(null);
      setStatus('prompting');
      dispatch({ type: 'user_prompt', text });
      try {
        await window.srgnt.chatSessionPrompt(current, text);
        setStatus('ready');
      } catch (cause) {
        setStatus('error');
        setError(messageOf(cause));
      } finally {
        // Whether the turn ended, failed, or was interrupted, no more chunks
        // belong to the trailing run — a later turn must start a fresh bubble.
        flush();
        dispatch({ type: 'close_open' });
      }
    },
    [flush],
  );

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
    } catch (cause) {
      // Keep the handle so the user can retry: forgetting it here would strand
      // the agent process with no way to dispose it before app quit.
      setStatus('error');
      setError(messageOf(cause));
    }
  }, []);

  const dismissError = React.useCallback(() => setError(null), []);

  const value = React.useMemo<ChatSessionContextValue>(
    () => ({ session, status, error, transcript, newSession, sendPrompt, cancel, dispose, dismissError }),
    [session, status, error, transcript, newSession, sendPrompt, cancel, dispose, dismissError],
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
