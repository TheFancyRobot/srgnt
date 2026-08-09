import React from 'react';
import { useChatSession } from './ChatSessionContext.js';

/**
 * The honest end of a session (PHASE-24, STEP-24-04).
 *
 * When a reopened session's harness cannot genuinely continue it, this is what
 * the user sees instead of a working composer: why it stopped, and the one
 * offered way forward — a new session, explicitly linked, seeded with a summary
 * they read before sending. The phase's non-goal is silent re-priming, so there
 * is deliberately no "just keep typing" affordance here.
 *
 * It also carries the load-reconciliation notice, which is NOT an error: the
 * session continues, the local log stays canonical, and the user is simply told
 * that the agent's own history of the conversation differs from ours.
 */
export function ReadOnlyBanner(): React.ReactElement | null {
  const { session, readOnlyReason, historyDiverged, fork, canFork } = useChatSession();
  const [forking, setForking] = React.useState(false);
  const sessionId = session?.sessionId ?? null;

  // One key per session, not per click: a double-click must reach main with the
  // SAME idempotency key, which is what makes the second call resolve to the
  // first fork instead of creating a sibling. A new key is only minted when the
  // user moves to a different session.
  const idempotencyKey = React.useMemo(
    () => (sessionId === null ? '' : globalThis.crypto.randomUUID()),
    [sessionId],
  );

  const handleFork = React.useCallback(() => {
    if (forking || idempotencyKey === '') return;
    setForking(true);
    void fork(idempotencyKey).finally(() => setForking(false));
  }, [fork, forking, idempotencyKey]);

  if (session === null) return null;

  return (
    <>
      {historyDiverged && (
        <div className="chat-history-diverged" data-testid="chat-history-diverged">
          The agent&rsquo;s replayed history differs from what is saved here. This transcript is the
          saved one.
        </div>
      )}

      {readOnlyReason !== null && (
        <div className="chat-read-only" role="status" data-testid="chat-read-only">
          <div className="chat-read-only-main">
            <span className="chat-read-only-title">Read-only session</span>
            <span className="chat-read-only-message" data-testid="chat-read-only-reason">
              {readOnlyReason}
            </span>
          </div>
          {canFork && (
            <button
              type="button"
              className="chat-button chat-button-primary"
              data-testid="chat-fork"
              onClick={handleFork}
              disabled={forking}
            >
              {forking ? 'Creating…' : 'Continue in new session'}
            </button>
          )}
        </div>
      )}
    </>
  );
}
