import React from 'react';

/**
 * Accumulated output of terminals the *agent* created through the client
 * `terminal/*` services (PHASE-23, STEP-23-02).
 *
 * This is deliberately a context of its own, nested inside the chat session
 * context rather than folded into it: a chatty command can emit hundreds of
 * chunks a second, and putting them in the session value would re-render every
 * transcript consumer for output only one card is looking at.
 *
 * Chunks arrive append-only per `terminalId`, so a card that mounts late (the
 * `tool_call_update` carrying the terminal block can arrive after the process
 * already printed) still sees everything from the beginning.
 */

export type ChatTerminalOutputs = Readonly<Record<string, string>>;

/**
 * Per-terminal cap on what the renderer keeps. Main truncates its own retained
 * buffer but still forwards every chunk, so without this a verbose build grows
 * renderer memory without bound. Matches main's default 1 MiB budget; measured
 * in characters rather than bytes, which is the cheap side of the same bound.
 */
const OUTPUT_CHAR_CAP = 1024 * 1024;

const ChatTerminalContext = React.createContext<ChatTerminalOutputs>({});

/** rAF when available (real app), a timer otherwise (jsdom/tests). */
function scheduleFlush(callback: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const handle = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(handle);
  }
  const handle = setTimeout(callback, 16);
  return () => clearTimeout(handle);
}

export function ChatTerminalProvider({
  sessionId,
  children,
}: {
  /** The chat handle whose terminals to collect. `null` drops everything. */
  readonly sessionId: string | null;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [outputs, setOutputs] = React.useState<ChatTerminalOutputs>({});
  const sessionIdRef = React.useRef<string | null>(sessionId);
  const pending = React.useRef<Map<string, string>>(new Map());
  const cancelFlush = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    sessionIdRef.current = sessionId;
    // A new (or ended) session starts from an empty screen: terminal ids are
    // per-session and reusing a previous session's buffer would be a lie.
    pending.current.clear();
    setOutputs({});
  }, [sessionId]);

  const flush = React.useCallback(() => {
    cancelFlush.current = null;
    if (pending.current.size === 0) return;
    const batch = pending.current;
    pending.current = new Map();
    setOutputs((previous) => {
      const next = { ...previous };
      for (const [terminalId, chunk] of batch) {
        const combined = (next[terminalId] ?? '') + chunk;
        next[terminalId] =
          combined.length > OUTPUT_CHAR_CAP ? combined.slice(combined.length - OUTPUT_CHAR_CAP) : combined;
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    // Guarded: an older preload (or a test render without the bridge) must leave
    // the rest of the chat surface working.
    if (typeof window.srgnt?.onChatTerminalOutput !== 'function') return;
    const unsubscribe = window.srgnt.onChatTerminalOutput((event) => {
      if (event.sessionId !== sessionIdRef.current) return;
      pending.current.set(event.terminalId, (pending.current.get(event.terminalId) ?? '') + event.chunk);
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

  return <ChatTerminalContext.Provider value={outputs}>{children}</ChatTerminalContext.Provider>;
}

/** Accumulated output for one terminal id (empty string when nothing arrived yet). */
export function useChatTerminalOutput(terminalId: string): string {
  return React.useContext(ChatTerminalContext)[terminalId] ?? '';
}
