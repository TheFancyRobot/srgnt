import React from 'react';
import { useChatSession } from './ChatSessionContext.js';

/**
 * The chat composer (PHASE-23, STEP-23-04) — the only input surface, and the
 * place where "no white screens, no zombie processes" becomes visible: submit,
 * cancel, slash commands, session modes, stop reasons, and the agent-crash
 * recovery affordance all live here.
 *
 * Everything user-visible except the buttons is derived from live agent data:
 * commands come from `available_commands_update`, modes from the `session/new`
 * response plus `current_mode_update`. An agent that advertises neither gets
 * neither control — no dead UI, nothing hardcoded (phase acceptance criterion).
 */

/** One command the agent advertised. `description` is optional in the wild. */
interface SlashCommand {
  readonly name: string;
  readonly description: string;
}

/**
 * Tolerant reader for `available_commands_update` (ARCH-0009): the payload is
 * opaque `unknown` all the way from the wire, and a malformed entry must cost
 * that entry, never the menu.
 */
export function parseCommands(raw: unknown): readonly SlashCommand[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { name, description } = entry as { name?: unknown; description?: unknown };
    if (typeof name !== 'string' || name === '') return [];
    return [{ name, description: typeof description === 'string' ? description : '' }];
  });
}

/**
 * The `/`-token the caret currently sits in, or `null`. The trigger is a `/` at
 * the start of a line with no whitespace before the caret — the same rule the
 * notes editor's slash commands use, so `a/b` in prose never opens a menu.
 */
export function slashQuery(text: string, caret: number): string | null {
  const before = text.slice(0, caret);
  const lineStart = before.lastIndexOf('\n') + 1;
  const line = before.slice(lineStart);
  return /^\/\S*$/.test(line) ? line.slice(1) : null;
}

/**
 * Each ACP `StopReason` gets its own end-of-turn line. `end_turn` is
 * deliberately silent: annotating every normal reply is noise.
 */
const STOP_REASON_NOTICES: Record<string, string> = {
  cancelled: 'Stopped by you.',
  max_tokens: 'The agent stopped early: it ran out of tokens for this turn.',
  max_turn_requests: 'The agent stopped early: it hit its request limit for this turn.',
  refusal: 'The agent refused this request.',
};

/** Crash-class statuses. A live agent is `spawning`/`ready`, or has said nothing. */
const DEAD_STATUSES: readonly string[] = ['crashed', 'gave-up', 'exited'];

export function Composer(): React.ReactElement {
  const {
    session,
    status,
    transcript,
    currentModeId,
    canSetMode,
    agentStatus,
    lastStopReason,
    newSession,
    sendPrompt,
    setMode,
    cancel,
    dispose,
  } = useChatSession();

  const [draft, setDraft] = React.useState('');
  const [caret, setCaret] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const hasSession = session !== null;
  const cancelling = status === 'cancelling';
  // A cancelled turn is still a turn in flight — see ChatSessionContext.cancel.
  // Send stays disabled until the prompt promise itself settles.
  const busy = status === 'prompting' || cancelling;
  const agentDead = agentStatus !== null && DEAD_STATUSES.includes(agentStatus.status);
  const canSend = hasSession && !busy && !agentDead && draft.trim() !== '';

  const commands = React.useMemo(
    () => parseCommands(transcript.availableCommands),
    [transcript.availableCommands],
  );
  const query = slashQuery(draft, caret);
  const matches = React.useMemo(
    () =>
      query === null
        ? []
        : commands.filter((command) => command.name.toLowerCase().startsWith(query.toLowerCase())),
    [commands, query],
  );
  // An `available_commands_update` that empties the list (or a query that matches
  // nothing) closes the popover instead of leaving an empty box on screen.
  const showMenu = menuOpen && query !== null && matches.length > 0;
  const active = Math.min(highlight, Math.max(matches.length - 1, 0));

  // A commands update arriving while the menu is open must not leave the
  // highlight past the end of the new, shorter list.
  React.useEffect(() => {
    setHighlight(0);
  }, [query, commands]);

  const handleSend = React.useCallback(() => {
    if (!canSend) return;
    const text = draft;
    setDraft('');
    setMenuOpen(false);
    void sendPrompt(text).then((ok) => {
      // The turn failed (crash, TurnFailed, transport loss): give the user their
      // words back rather than making them retype a prompt nobody ran.
      if (!ok) setDraft((current) => (current === '' ? text : current));
    });
  }, [canSend, draft, sendPrompt]);

  const insertCommand = React.useCallback(
    (name: string) => {
      const before = draft.slice(0, caret);
      const lineStart = before.lastIndexOf('\n') + 1;
      const inserted = `${draft.slice(0, lineStart)}/${name} `;
      setDraft(inserted + draft.slice(caret));
      setMenuOpen(false);
      const nextCaret = inserted.length;
      setCaret(nextCaret);
      // The caret must land after the inserted command, not wherever the browser
      // leaves it after a controlled-value swap.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [caret, draft],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showMenu) {
        // While the menu owns the keyboard, Enter picks a command rather than
        // sending a half-typed `/`.
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setHighlight((current) => (current + 1) % matches.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setHighlight((current) => (current - 1 + matches.length) % matches.length);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setMenuOpen(false);
          return;
        }
        if ((event.key === 'Enter' || event.key === 'Tab') && !event.nativeEvent.isComposing) {
          event.preventDefault();
          insertCommand(matches[active]!.name);
          return;
        }
      }
      // Enter sends, Shift+Enter is a newline. `isComposing` guards IME input:
      // for CJK users the first Enter commits the candidate word, and sending
      // there would ship a half-typed draft.
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handleSend();
      }
    },
    [active, handleSend, insertCommand, matches, showMenu],
  );

  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
    setCaret(event.target.selectionStart);
    setMenuOpen(true);
  }, []);

  const syncCaret = React.useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCaret(event.currentTarget.selectionStart);
  }, []);

  const handleRecover = React.useCallback(() => {
    if (session === null) return;
    const { target } = session;
    // Dispose first: the crashed process may still have live children, and the
    // kill-tree is what guarantees the recovery does not stack up orphans.
    void dispose().then(() => newSession(target));
  }, [dispose, newSession, session]);

  const stopNotice = lastStopReason === null ? null : STOP_REASON_NOTICES[lastStopReason] ?? null;

  return (
    <div className="chat-composer-shell">
      {agentDead && (
        <div className="chat-agent-down" role="alert" data-testid="chat-agent-down">
          <div className="chat-agent-down-main">
            <span className="chat-agent-down-title">
              {agentStatus.status === 'gave-up' ? 'Agent stopped restarting' : 'Agent process ended'}
            </span>
            <span className="chat-agent-down-message">
              {agentStatus.message ?? 'The agent process is no longer running.'}
            </span>
          </div>
          {agentStatus.stderrTail !== undefined && agentStatus.stderrTail !== '' && (
            <pre className="chat-agent-down-stderr" data-testid="chat-agent-down-stderr">
              {agentStatus.stderrTail}
            </pre>
          )}
          <button
            type="button"
            className="chat-button chat-button-primary"
            data-testid="chat-recover"
            onClick={handleRecover}
          >
            New session
          </button>
        </div>
      )}

      {stopNotice !== null && (
        <div className="chat-stop-notice" data-testid="chat-stop-notice" data-reason={lastStopReason}>
          {stopNotice}
        </div>
      )}

      <div className="chat-composer">
        <div className="chat-composer-input-wrap">
          {showMenu && (
            <ul className="chat-slash-menu" role="listbox" aria-label="Commands" data-testid="chat-slash-menu">
              {matches.map((command, index) => (
                <li
                  key={command.name}
                  role="option"
                  aria-selected={index === active}
                  className={`chat-slash-item${index === active ? ' is-active' : ''}`}
                  data-testid={`chat-slash-item-${command.name}`}
                  // `onMouseDown` not `onClick`: a click would blur the textarea
                  // first and close the menu before the selection registered.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertCommand(command.name);
                  }}
                >
                  <span className="chat-slash-name">/{command.name}</span>
                  {command.description !== '' && (
                    <span className="chat-slash-description">{command.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <textarea
            ref={inputRef}
            data-testid="chat-input"
            className="chat-input"
            value={draft}
            rows={2}
            disabled={!hasSession}
            placeholder={hasSession ? 'Send a message…  (/ for commands)' : 'Start a session to send a message'}
            aria-label="Message"
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={syncCaret}
            onClick={syncCaret}
            onBlur={() => setMenuOpen(false)}
          />
        </div>

        {/* Only rendered when the agent advertised modes. For Pi this selector IS
            the thinking-level control (`off`…`xhigh`) — spike probe 3. */}
        {session?.modes != null && (
          <label className="chat-mode-select-label">
            <span className="chat-mode-select-caption">Mode</span>
            <select
              className="chat-select"
              data-testid="chat-mode-select"
              aria-label="Session mode"
              value={currentModeId ?? session.modes.currentModeId}
              disabled={busy || agentDead || !canSetMode}
              onChange={(event) => void setMode(event.target.value)}
            >
              {session.modes.availableModes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Both buttons stay mounted rather than swapping: exactly one is ever
            enabled, so cancel-with-no-turn is a literal no-op (no toast spam),
            and the controls do not jump under the pointer mid-turn. */}
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
