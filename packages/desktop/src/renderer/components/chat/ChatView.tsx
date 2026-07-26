import React from 'react';
import { MessageList } from './MessageList.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { TrustBadge } from './TrustBadge.js';
import { useChatSession, type ChatTarget } from './ChatSessionContext.js';

/**
 * The chat center panel (PHASE-23, STEP-23-01) — the first product surface of
 * the ACP pivot. Opens an ephemeral session against a harness, sends a prompt,
 * and renders the streamed transcript.
 *
 * Scope note: the real composer (slash commands, modes, rich cancel/error UX) is
 * STEP-23-04 and the tool cards are STEP-23-02. The controls here are the
 * minimum needed to drive and watch a turn — including a send button disabled
 * while a turn is in flight, so this step cannot double-submit.
 *
 * Session state lives in `ChatSessionProvider` above the panel switch, so
 * navigating to Notes and back neither kills the session nor loses transcript.
 */

const TARGET_LABELS: Record<ChatTarget, string> = {
  mock: 'Mock agent',
  pi: 'Pi',
};

function EmptyState({ hasSession }: { readonly hasSession: boolean }): React.ReactElement {
  return (
    <div className="chat-empty-inner" data-testid="chat-empty">
      <p className="chat-empty-title">{hasSession ? 'Session ready' : 'No active session'}</p>
      <p className="chat-empty-body">
        {hasSession
          ? 'Send a prompt to start the turn.'
          : 'Start a session to talk to an agent. Sessions are temporary and are not saved.'}
      </p>
    </div>
  );
}

export function ChatView(): React.ReactElement {
  const {
    session,
    status,
    error,
    transcript,
    permissions,
    newSession,
    sendPrompt,
    cancel,
    dispose,
    respondToPermission,
    dismissError,
  } = useChatSession();
  const [target, setTarget] = React.useState<ChatTarget>('mock');
  const [draft, setDraft] = React.useState('');

  const hasSession = session !== null;
  const cancelling = status === 'cancelling';
  // A cancelled turn is still a turn in flight — see the note in
  // ChatSessionContext.cancel. Send stays disabled until the prompt settles.
  const busy = status === 'prompting' || cancelling;
  const connecting = status === 'connecting';
  const canSend = hasSession && !busy && draft.trim() !== '';

  const handleSend = React.useCallback(() => {
    if (!canSend) return;
    const text = draft;
    setDraft('');
    void sendPrompt(text);
  }, [canSend, draft, sendPrompt]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends, Shift+Enter is a newline — the convention every agent chat
      // uses. STEP-23-04 owns the full keymap.
      //
      // `isComposing` guards IME input: for CJK users the first Enter commits
      // the candidate word, and sending there would ship a half-typed draft.
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="chat-view" data-testid="chat-view">
      <header className="chat-header">
        <div className="chat-header-main">
          <h2 className="chat-header-title">Chat</h2>
          {hasSession ? (
            <span className="chat-header-session" data-testid="chat-session-badge">
              <span className="chat-header-harness">{session.harnessName}</span>
              {session.quirks.length > 0 && (
                <span
                  className="chat-header-quirks"
                  data-testid="chat-session-quirks"
                  title={`Declared quirks: ${session.quirks.join(', ')}`}
                >
                  {session.quirks.length} quirk{session.quirks.length === 1 ? '' : 's'}
                </span>
              )}
              <TrustBadge quirks={session.quirks} />
            </span>
          ) : (
            <label className="chat-header-target">
              <span className="chat-header-target-label">Agent</span>
              <select
                data-testid="chat-target"
                className="chat-select"
                value={target}
                onChange={(event) => setTarget(event.target.value as ChatTarget)}
              >
                {(Object.keys(TARGET_LABELS) as ChatTarget[]).map((value) => (
                  <option key={value} value={value}>
                    {TARGET_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="chat-header-actions">
          {!hasSession ? (
            <button
              type="button"
              data-testid="chat-new-session"
              className="chat-button chat-button-primary"
              onClick={() => void newSession(target)}
              disabled={connecting}
            >
              {connecting ? 'Starting…' : 'Start session'}
            </button>
          ) : (
            <>
              <button
                type="button"
                data-testid="chat-cancel"
                className="chat-button"
                onClick={() => void cancel()}
                disabled={!busy || cancelling}
              >
                {cancelling ? 'Stopping…' : 'Stop'}
              </button>
              <button
                type="button"
                data-testid="chat-dispose"
                className="chat-button"
                onClick={() => void dispose()}
              >
                End session
              </button>
            </>
          )}
        </div>
      </header>

      {error !== null && (
        <div className="chat-error" role="alert" data-testid="chat-error">
          <span className="chat-error-text">{error}</span>
          <button type="button" className="chat-error-dismiss" onClick={dismissError} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      <MessageList segments={transcript.segments} emptyState={<EmptyState hasSession={hasSession} />} />

      {/* Between transcript and composer: the turn cannot advance until it is
          answered, so it sits where the user's attention already is. */}
      <PermissionPrompt requests={permissions} onRespond={respondToPermission} />

      <div className="chat-composer">
        <textarea
          data-testid="chat-input"
          className="chat-input"
          value={draft}
          rows={2}
          disabled={!hasSession}
          placeholder={hasSession ? 'Send a message…' : 'Start a session to send a message'}
          aria-label="Message"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          data-testid="chat-send"
          className="chat-button chat-button-primary"
          onClick={handleSend}
          disabled={!canSend}
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
