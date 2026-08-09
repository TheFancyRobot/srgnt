import React from 'react';
import { useProjectsOptional } from './ProjectsContext.js';
import { useChatSessionOptional, type OpenSession } from './ChatSessionContext.js';

/**
 * The session list (PHASE-24, STEP-24-03), in the chat panel's side panel under
 * the project switcher.
 *
 * Rows come from disk (`chat:session:list` reads `meta.json` only — no event log
 * is opened, so a project with fifty sessions costs fifty tiny reads and spawns
 * nothing), overlaid with whatever the renderer knows about the sessions it
 * currently has open. That overlay is what makes the status dot LIVE: a turn in
 * flight is `active` the moment the prompt is sent, not when the next disk read
 * happens to catch it.
 *
 * Everything on a row is data — title, harness badge, status — so a new harness
 * needs no code here (the capability-driven-UI invariant, ARCH-0009).
 */

/** The persisted status vocabulary, plus the live-only states the overlay adds. */
export type SessionRowStatus = 'active' | 'idle' | 'interrupted' | 'error' | 'closed' | 'awaiting_permission';

export interface SessionRow {
  readonly id: string;
  readonly projectId: string;
  readonly title: string | null;
  readonly harnessId: string;
  readonly status: SessionRowStatus;
  readonly updatedAt: string;
  /** True while this renderer holds it open (live connection or replayed). */
  readonly open: boolean;
}

const STATUS_LABELS: Record<SessionRowStatus, string> = {
  active: 'Running',
  idle: 'Idle',
  awaiting_permission: 'Waiting for you',
  interrupted: 'Interrupted',
  error: 'Error',
  closed: 'Closed',
};

/** Placeholder for a session that never got a prompt to name it. */
export const UNTITLED_SESSION_LABEL = 'New session';

/**
 * Persisted rows + live overlay → what the list renders. Pure and exported: the
 * overlay is the only real logic in this component, and it is far cheaper to
 * test as a function than through a mounted list.
 */
export function mergeSessionRows(
  persisted: readonly {
    id: string;
    projectId: string;
    title?: string;
    harnessId: string;
    status: 'active' | 'idle' | 'interrupted' | 'error' | 'closed';
    createdAt: string;
    updatedAt?: string;
  }[],
  open: readonly OpenSession[],
  projectId: string | null,
): readonly SessionRow[] {
  const openById = new Map(open.map((entry) => [entry.info.sessionId, entry]));
  const rows: SessionRow[] = persisted.map((session) => {
    const live = openById.get(session.id);
    openById.delete(session.id);
    return {
      id: session.id,
      projectId: session.projectId,
      title: session.title ?? live?.title ?? null,
      harnessId: session.harnessId,
      status: live === undefined ? session.status : liveStatusOf(live, session.status),
      updatedAt: session.updatedAt ?? session.createdAt,
      open: live !== undefined,
    };
  });
  // A session created moments ago may not be on disk yet (or belongs to another
  // project entirely). Showing it anyway is what keeps "start a session" from
  // looking like it did nothing until the next list read.
  for (const entry of openById.values()) {
    if (entry.info.projectId === null || entry.info.projectId !== projectId) continue;
    rows.unshift({
      id: entry.info.sessionId,
      projectId: entry.info.projectId,
      title: entry.title,
      harnessId: entry.info.harnessId,
      status: liveStatusOf(entry, 'idle'),
      updatedAt: '',
      open: true,
    });
  }
  return rows;
}

function liveStatusOf(entry: OpenSession, persisted: SessionRowStatus): SessionRowStatus {
  // A blocked permission outranks everything: the session is stopped waiting on
  // the user, which no persisted status can express (it is never written).
  if (entry.permissions.length > 0) return 'awaiting_permission';
  if (entry.agentStatus !== null && entry.agentStatus.status !== 'spawning' && entry.agentStatus.status !== 'ready') {
    return 'error';
  }
  if (entry.status === 'prompting' || entry.status === 'cancelling') return 'active';
  if (entry.status === 'error') return 'error';
  // A live session is never `closed`, whatever a stale disk read says.
  return persisted === 'closed' ? 'idle' : persisted === 'active' ? 'idle' : persisted;
}

function SessionRowItem({
  row,
  active,
  onOpen,
}: {
  readonly row: SessionRow;
  readonly active: boolean;
  readonly onOpen: () => void;
}): React.ReactElement {
  return (
    <li
      className="session-row"
      data-testid="session-row"
      data-session-id={row.id}
      data-active={active}
      data-status={row.status}
    >
      <button
        type="button"
        className="w-full text-left"
        data-testid="session-open"
        aria-pressed={active}
        onClick={onOpen}
      >
        <span className="flex items-center gap-1">
          <span
            className="session-status-dot"
            data-testid="session-status"
            data-status={row.status}
            title={STATUS_LABELS[row.status]}
            aria-label={STATUS_LABELS[row.status]}
          />
          <span className="flex-1 block text-xs truncate">{row.title ?? UNTITLED_SESSION_LABEL}</span>
          {/* Rendered from the stored id, never from a per-harness branch. */}
          <span className="session-harness-badge" data-testid="session-harness">
            {row.harnessId}
          </span>
        </span>
      </button>
    </li>
  );
}

export function SessionList(): React.ReactElement | null {
  // Both providers are optional: the side panel is also rendered in isolation
  // and by surfaces that predate projects, where the list should simply not
  // exist rather than take the panel down with it.
  const projects = useProjectsOptional();
  const chat = useChatSessionOptional();
  const projectId = projects?.activeProjectId ?? null;
  const revision = chat?.listRevision ?? 0;
  const [persisted, setPersisted] = React.useState<
    readonly {
      id: string;
      projectId: string;
      title?: string;
      harnessId: string;
      status: 'active' | 'idle' | 'interrupted' | 'error' | 'closed';
      createdAt: string;
      updatedAt?: string;
    }[]
  >([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (projectId === null || typeof window.srgnt?.chatSessionList !== 'function') {
      setPersisted([]);
      return;
    }
    let cancelled = false;
    void window.srgnt
      .chatSessionList(projectId)
      .then((result) => {
        if (cancelled) return;
        setPersisted(result.sessions);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    // Re-read on `revision`, which the chat context bumps when a session opens,
    // finishes a turn, crashes or closes — a poll would either lag or burn reads
    // on a panel where nothing is happening.
    return () => {
      cancelled = true;
    };
  }, [projectId, revision]);

  if (chat === null) return null;
  const rows = mergeSessionRows(persisted, chat.openSessions, projectId);

  return (
    <div className="p-3 border-b border-border-default space-y-2" data-testid="session-list-panel">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-heading">Sessions</h2>
        <button
          type="button"
          className="text-[11px] text-text-tertiary"
          data-testid="session-new"
          onClick={() => void chat.newSession('mock')}
        >
          New session
        </button>
      </div>

      {error !== null && (
        <p className="text-[11px] text-status-error" role="alert" data-testid="session-list-error">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-text-tertiary" data-testid="session-list-empty">
          No sessions in this project yet.
        </p>
      ) : (
        <ul className="space-y-0.5" data-testid="session-list">
          {rows.map((row) => (
            <SessionRowItem
              key={row.id}
              row={row}
              active={row.id === chat.activeSessionId}
              onOpen={() => void chat.openPersistedSession(row.projectId, row.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
