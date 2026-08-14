import React from 'react';
import { Composer } from './Composer.js';
import { MessageList } from './MessageList.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { ReadOnlyBanner } from './ReadOnlyBanner.js';
import { TrustBadge } from './TrustBadge.js';
import { useChatSession, type ChatTarget } from './ChatSessionContext.js';
import { useProjectsOptional } from './ProjectsContext.js';

/**
 * The chat center panel (PHASE-23, STEP-23-01) — the first product surface of
 * the ACP pivot. Opens an ephemeral session against a harness, sends a prompt,
 * and renders the streamed transcript.
 *
 * The view owns session lifecycle (target choice, start, end) and the transcript;
 * everything about *driving a turn* — input, slash commands, mode selection,
 * cancel, stop reasons, and crash recovery — belongs to `Composer` (STEP-23-04).
 *
 * Session state lives in `ChatSessionProvider` above the panel switch, so
 * navigating to Notes and back neither kills the session nor loses transcript.
 */

// The explicitly pickable targets. A project's default harness (Settings →
// Harnesses) is what selects anything else, so this list stays short rather
// than becoming a second harness registry in the renderer.
const TARGET_LABELS: Record<string, string> = {
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
          : 'Start a session to talk to an agent, or reopen one from the session list. Sessions are saved to your project.'}
      </p>
    </div>
  );
}

export function ChatView(): React.ReactElement {
  const { session, status, error, transcript, permissions, newSession, dispose, respondToPermission, dismissError } =
    useChatSession();
  // `null` means "the user has not chosen", which is what lets the project's
  // `defaultHarnessId` decide. Without it the selector always sent an explicit
  // target and main's default resolution was unreachable — a project set to Pi
  // still opened Mock unless the user touched the dropdown.
  const [chosenTarget, setChosenTarget] = React.useState<ChatTarget | null>(null);
  const projectDefault = useProjectsOptional()?.activeProject?.defaultHarnessId;
  const target: ChatTarget =
    chosenTarget ?? (projectDefault === 'pi' || projectDefault === 'mock' ? projectDefault : 'mock');
  const setTarget = setChosenTarget;

  const hasSession = session !== null;
  const connecting = status === 'connecting';

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
            <button
              type="button"
              data-testid="chat-dispose"
              className="chat-button"
              onClick={() => void dispose()}
            >
              End session
            </button>
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

      {/* Above the composer, which it disables: the fork button has to be the
          next thing the eye lands on after the transcript ends. */}
      <ReadOnlyBanner />

      <Composer />
    </div>
  );
}
