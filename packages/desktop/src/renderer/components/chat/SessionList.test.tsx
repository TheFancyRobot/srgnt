/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsProvider } from './ProjectsContext.js';
import { ChatSessionProvider, replayEvents, type OpenSession } from './ChatSessionContext.js';
import { ChatView } from './ChatView.js';
import { SessionList, mergeSessionRows, UNTITLED_SESSION_LABEL } from './SessionList.js';
import { initialTranscriptState, transcriptReducer } from './transcriptReducer.js';

/**
 * The session list and the multi-session renderer state (PHASE-24, STEP-24-03).
 *
 * Two things are being proved here: streamed frames are routed by session id
 * (a background session keeps accumulating and switching back shows everything,
 * with no cross-talk), and a persisted session renders through the SAME reducer
 * the live feed uses.
 */

afterEach(cleanup);

const project = {
  id: 'proj-a',
  name: 'app',
  rootDir: '/checkouts/app',
  additionalDirectories: [] as readonly string[],
  createdAt: '2026-08-01T10:00:00.000Z',
};

function persistedSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-old',
    projectId: project.id,
    harnessId: 'mock',
    kind: 'single' as const,
    status: 'idle' as const,
    title: 'Fix the login bug',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T11:00:00.000Z',
    ...overrides,
  };
}

/** One `session/update` frame, in the shape main pushes it. */
function chunk(text: string) {
  return { update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } } };
}

let updateListeners: ((event: { sessionId: string; update: unknown }) => void)[] = [];
let persisted: ReturnType<typeof persistedSession>[];
let openEvents: { seq: number; ts: string; protocolVersion: number; kind: string; payload?: unknown }[];
let newSessionCount = 0;
/** What `chat:session:reconnect` answers; per-test, since it drives the branch. */
let reconnectResult: {
  outcome: 'resumed' | 'loaded' | 'read_only' | 'retryable';
  reason?: string;
  session?: Record<string, unknown>;
  historyDiverged?: boolean;
};
// Deliberately loose: this stands in for the whole preload bridge, whose
// members have wildly different signatures.
let api: Record<string, unknown>;

beforeEach(() => {
  updateListeners = [];
  persisted = [persistedSession()];
  openEvents = [];
  newSessionCount = 0;
  reconnectResult = {
    outcome: 'loaded',
    session: {
      sessionId: 'sess-old',
      target: 'mock',
      harnessId: 'mock',
      harnessName: 'Mock Agent',
      quirks: [],
      capabilities: { protocolVersion: 1, loadSession: true },
      projectId: project.id,
      modes: { currentModeId: 'low', availableModes: [{ id: 'low', name: 'low' }] },
    },
  };
  api = {
    getWorkspaceRoot: vi.fn(async () => project.rootDir),
    projectList: vi.fn(async () => ({ projects: [project], skipped: [] })),
    chatSessionList: vi.fn(async () => ({ sessions: persisted, skipped: [] })),
    chatSessionOpen: vi.fn(async (_projectId: string, sessionId: string) => ({
      session: persistedSession({ id: sessionId }),
      events: openEvents,
      truncatedTail: false,
      live: false,
    })),
    chatSessionNew: vi.fn(async (target?: string) => {
      newSessionCount += 1;
      return {
        sessionId: `live-${newSessionCount}`,
        target: target ?? 'mock',
        harnessId: target ?? 'mock',
        harnessName: 'Mock Agent',
        quirks: [],
        capabilities: { protocolVersion: 1 },
        projectId: project.id,
      };
    }),
    chatSessionPrompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    chatSessionReconnect: vi.fn(async () => reconnectResult),
    chatSessionFork: vi.fn(async (_projectId: string, sourceSessionId: string) => ({
      session: {
        sessionId: 'fork-1',
        target: 'mock',
        harnessId: 'mock',
        harnessName: 'Mock Agent',
        quirks: [],
        capabilities: { protocolVersion: 1 },
        projectId: project.id,
      },
      parentSessionId: sourceSessionId,
      handoffText: 'Continuing from "Fix the login bug".\n',
      reused: false,
    })),
    chatSessionDispose: vi.fn(async () => {}),
    onChatSessionUpdate: vi.fn((listener: (event: { sessionId: string; update: unknown }) => void) => {
      updateListeners.push(listener);
      return () => {
        updateListeners = updateListeners.filter((entry) => entry !== listener);
      };
    }),
  };
  (globalThis as { window: { srgnt: unknown } }).window.srgnt = api;
});

function renderPanel() {
  return render(
    <ProjectsProvider>
      <ChatSessionProvider>
        <ChatView />
        <SessionList />
      </ChatSessionProvider>
    </ProjectsProvider>,
  );
}

function pushUpdate(sessionId: string, update: unknown): void {
  act(() => {
    for (const listener of updateListeners) listener({ sessionId, update });
  });
}

function rows(): HTMLElement[] {
  return screen.queryAllByTestId('session-row');
}

function rowFor(sessionId: string): HTMLElement {
  return rows().find((row) => row.getAttribute('data-session-id') === sessionId)!;
}

describe('mergeSessionRows', () => {
  const open = (overrides: Partial<OpenSession> = {}): OpenSession => ({
    info: {
      sessionId: 'sess-old',
      target: 'mock',
      harnessId: 'mock',
      harnessName: 'Mock Agent',
      quirks: [],
      capabilities: {},
      projectId: project.id,
      modes: null,
    },
    status: 'ready',
    transcript: initialTranscriptState,
    permissions: [],
    agentStatus: null,
    lastStopReason: null,
    title: null,
    live: true,
    readOnlyReason: null,
    historyDiverged: false,
    pendingPrompt: null,
    ...overrides,
  });

  it('shows persisted rows untouched when nothing is open', () => {
    const merged = mergeSessionRows([persistedSession()], [], project.id);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.title).toBe('Fix the login bug');
    expect(merged[0]!.status).toBe('idle');
    expect(merged[0]!.open).toBe(false);
  });

  it('overlays the live status of an open session onto its persisted row', () => {
    // A turn in flight is `active` the moment the prompt is sent — waiting for
    // the next disk read would show a stale dot for the length of the turn.
    expect(mergeSessionRows([persistedSession()], [open({ status: 'prompting' })], project.id)[0]!.status).toBe(
      'active',
    );
    // A blocked permission outranks everything: it is never written to disk.
    expect(
      mergeSessionRows(
        [persistedSession()],
        [open({ permissions: [{ requestId: 'r1', kind: 'edit', title: 'x', paths: [], options: [] }] })],
        project.id,
      )[0]!.status,
    ).toBe('awaiting_permission');
    // A crashed process is an error session whatever the last disk write said.
    expect(
      mergeSessionRows([persistedSession()], [open({ agentStatus: { status: 'gave-up' } })], project.id)[0]!.status,
    ).toBe('error');
    // A live session is never shown `closed` from a stale read.
    expect(
      mergeSessionRows([persistedSession({ status: 'closed' })], [open()], project.id)[0]!.status,
    ).toBe('idle');
  });

  it('shows a just-created session that has not reached the list read yet', () => {
    const merged = mergeSessionRows([], [open({ info: { ...open().info, sessionId: 'live-1' } })], project.id);
    expect(merged.map((row) => row.id)).toEqual(['live-1']);
    expect(merged[0]!.title).toBeNull();
  });

  it('never shows an open session that belongs to a different project', () => {
    const elsewhere = open({ info: { ...open().info, sessionId: 'other', projectId: 'proj-b' } });
    expect(mergeSessionRows([], [elsewhere], project.id)).toEqual([]);
  });
});

describe('replayEvents', () => {
  it('renders a persisted stream identically to the same content streamed live', () => {
    const notifications = [chunk('Hello '), chunk('world.')];
    const live = notifications.reduce(
      (state, notification) => transcriptReducer(state, { type: 'update', notification }),
      transcriptReducer(initialTranscriptState, { type: 'user_prompt', text: 'hi' }),
    );
    const replayed = replayEvents([
      { kind: 'client/prompt', payload: { text: 'hi' } },
      ...notifications.map((payload) => ({ kind: 'acp/session_update', payload })),
    ]);
    // One reducer, two feeds: identical event content must render identically.
    expect(replayed.segments).toEqual(live.segments);
  });

  it('ignores event kinds it has no rendering for', () => {
    const replayed = replayEvents([
      { kind: 'client/session_created', payload: { cwd: '/x' } },
      { kind: 'client/fs_read_text_file', payload: { path: '/x/a.ts' } },
      // A kind from a newer writer: readers must never fail on one.
      { kind: 'acp/some_future_kind', payload: { anything: true } },
    ]);
    expect(replayed.segments).toEqual([]);
  });
});

describe('SessionList', () => {
  it('lists persisted sessions with title, harness badge and a status dot', async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());
    const row = rowFor('sess-old');
    expect(row).toHaveTextContent('Fix the login bug');
    expect(within(row).getByTestId('session-harness')).toHaveTextContent('mock');
    expect(within(row).getByTestId('session-status').getAttribute('data-status')).toBe('idle');
  });

  it('shows a placeholder title for a session that was never prompted', async () => {
    persisted = [persistedSession({ title: undefined })];
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());
    expect(rowFor('sess-old')).toHaveTextContent(UNTITLED_SESSION_LABEL);
  });

  it('shows an empty state for a project with no sessions', async () => {
    persisted = [];
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list-empty')).toBeInTheDocument());
    expect(screen.getByTestId('session-new')).toBeInTheDocument();
  });

  it('opens a new session with no target so the project default applies', async () => {
    // Passing 'mock' here opened a Mock session in a project configured for Pi.
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('session-new'));
    await waitFor(() => expect(api.chatSessionNew).toHaveBeenCalled());
    expect((api.chatSessionNew as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toBeUndefined();
  });

  /** Reopen `sess-old` from the list and type into its composer. */
  async function reopenAndType(text: string): Promise<void> {
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());
    fireEvent.click(within(rowFor('sess-old')).getByTestId('session-open'));
    await waitFor(() => expect(screen.getByTestId('chat-input')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: text } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'));
    });
  }

  it('reconnects a session replayed from disk on its first prompt, then sends it', async () => {
    // Reopen is process-free; the prompt is where a process becomes worth
    // spawning. Nothing may be sent before the reconnect resolved.
    await reopenAndType('keep going');
    await waitFor(() => expect(api.chatSessionReconnect).toHaveBeenCalledWith('proj-a', 'sess-old'));
    expect(api.chatSessionPrompt).toHaveBeenCalledWith('sess-old', 'keep going');
    expect(screen.queryByTestId('chat-read-only')).not.toBeInTheDocument();
    // The load response's identity block lands, so a resumed Pi-shaped session
    // gets its mode selector back instead of staying blank.
    expect(screen.getByTestId('chat-mode-select')).toBeInTheDocument();
  });

  it('goes read-only with a fork affordance when nothing can continue the session', async () => {
    reconnectResult = { outcome: 'read_only', reason: 'Mock Agent cannot continue a previous session.' };
    await reopenAndType('keep going');
    await waitFor(() => expect(screen.getByTestId('chat-read-only')).toBeInTheDocument());
    expect(screen.getByTestId('chat-read-only-reason')).toHaveTextContent(/cannot continue/i);
    // Read-only means read-only: nothing was prompted and the composer is inert.
    expect(api.chatSessionPrompt).not.toHaveBeenCalled();
    expect(screen.getByTestId('chat-input')).toBeDisabled();
  });

  it('keeps a transient reconnect failure retryable instead of read-only', async () => {
    reconnectResult = { outcome: 'retryable', reason: 'Failed to spawn ACP agent' };
    await reopenAndType('keep going');
    await waitFor(() => expect(screen.getByTestId('chat-error')).toHaveTextContent(/failed to spawn/i));
    // The session is NOT written off: the composer still takes a retry.
    expect(screen.queryByTestId('chat-read-only')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeEnabled();
    expect(api.chatSessionPrompt).not.toHaveBeenCalled();
  });

  it('forks a read-only session and pre-fills the handoff without sending it', async () => {
    reconnectResult = { outcome: 'read_only', reason: 'Mock Agent cannot continue a previous session.' };
    await reopenAndType('keep going');
    await waitFor(() => expect(screen.getByTestId('chat-fork')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-fork'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('chat-input')).toHaveValue('Continuing from "Fix the login bug".\n'),
    );
    // The whole point of the fork path: the user reads the handoff first.
    expect(api.chatSessionPrompt).not.toHaveBeenCalled();
    expect(api.chatSessionFork).toHaveBeenCalledTimes(1);
  });

  it('sends the same idempotency key when the fork button is double-clicked', async () => {
    reconnectResult = { outcome: 'read_only', reason: 'nope' };
    await reopenAndType('keep going');
    await waitFor(() => expect(screen.getByTestId('chat-fork')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-fork'));
      fireEvent.click(screen.getByTestId('chat-fork'));
    });
    const calls = (api.chatSessionFork as ReturnType<typeof vi.fn>).mock.calls;
    // Whether the button's own guard swallowed the second click or not, any key
    // that DID reach main must be the same one — that is what makes the service
    // resolve it to the first child instead of forking twice.
    expect(new Set(calls.map((call) => call[2] as string)).size).toBe(1);
  });

  it('shows a subtle notice when the replayed history diverged from the local log', async () => {
    reconnectResult = { ...reconnectResult, historyDiverged: true };
    await reopenAndType('keep going');
    await waitFor(() => expect(screen.getByTestId('chat-history-diverged')).toBeInTheDocument());
    // Diverging is not a failure: the turn still ran.
    expect(api.chatSessionPrompt).toHaveBeenCalled();
    expect(screen.queryByTestId('chat-read-only')).not.toBeInTheDocument();
  });

  it('renders navigable lineage links in both directions', async () => {
    persisted = [
      persistedSession({ id: 'sess-old', forkedSessionIds: ['sess-fork'] }),
      persistedSession({ id: 'sess-fork', title: 'Continued', parentSessionId: 'sess-old' }),
    ];
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());
    const parentLink = within(rowFor('sess-fork')).getByTestId('session-lineage');
    expect(parentLink).toHaveAttribute('data-target-session-id', 'sess-old');
    const childLink = within(rowFor('sess-old')).getByTestId('session-lineage');
    expect(childLink).toHaveAttribute('data-target-session-id', 'sess-fork');

    await act(async () => {
      fireEvent.click(childLink);
    });
    await waitFor(() => expect(api.chatSessionOpen).toHaveBeenCalledWith('proj-a', 'sess-fork'));
  });

  it('opens a persisted session and renders its transcript from disk', async () => {
    openEvents = [
      { seq: 0, ts: '2026-08-01T10:00:01.000Z', protocolVersion: 1, kind: 'client/prompt', payload: { text: 'hi' } },
      { seq: 1, ts: '2026-08-01T10:00:02.000Z', protocolVersion: 1, kind: 'acp/session_update', payload: chunk('From disk.') },
    ];
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());

    fireEvent.click(within(rowFor('sess-old')).getByTestId('session-open'));
    await waitFor(() => expect(screen.getByTestId('chat-view')).toHaveTextContent('From disk.'));
    expect(screen.getByTestId('chat-view')).toHaveTextContent('hi');
    // Opening a persisted session spawns nothing — it is a disk read.
    expect(api.chatSessionNew).not.toHaveBeenCalled();
  });

  it('keeps a background session streaming and shows the whole transcript on return', async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('chat-new-session'));
    await waitFor(() => expect(screen.getByTestId('chat-session-badge')).toBeInTheDocument());
    pushUpdate('live-1', chunk('alpha-one '));

    // Open a second session; the first is now in the background.
    fireEvent.click(screen.getByTestId('session-new'));
    await waitFor(() => expect(rows()).toHaveLength(3));
    pushUpdate('live-2', chunk('bravo-one '));
    // Frames for the hidden session keep arriving and must still be kept.
    pushUpdate('live-1', chunk('alpha-two'));
    pushUpdate('live-2', chunk('bravo-two'));

    await waitFor(() => expect(screen.getByTestId('chat-view')).toHaveTextContent('bravo-one bravo-two'));
    // No cross-talk: the visible session shows only its own frames.
    expect(screen.getByTestId('chat-view')).not.toHaveTextContent('alpha');

    fireEvent.click(within(rowFor('live-1')).getByTestId('session-open'));
    await waitFor(() => expect(screen.getByTestId('chat-view')).toHaveTextContent('alpha-one alpha-two'));
    expect(screen.getByTestId('chat-view')).not.toHaveTextContent('bravo');
    // Switching back is in-memory: the already-open session is never re-read.
    expect(api.chatSessionOpen).not.toHaveBeenCalled();
  });

  it('ignores frames for a session this renderer does not know', async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('chat-new-session'));
    await waitFor(() => expect(screen.getByTestId('chat-session-badge')).toBeInTheDocument());

    // A dev-console session, or one already disposed: dropped, never a crash.
    pushUpdate('somebody-elses-session', chunk('should not appear'));
    pushUpdate('live-1', chunk('mine'));
    await waitFor(() => expect(screen.getByTestId('chat-view')).toHaveTextContent('mine'));
    expect(screen.getByTestId('chat-view')).not.toHaveTextContent('should not appear');
  });

  it('degrades to the empty state when the preload has no session bridge', async () => {
    (globalThis as { window: { srgnt: unknown } }).window.srgnt = {
      getWorkspaceRoot: async () => project.rootDir,
      projectList: async () => ({ projects: [project], skipped: [] }),
      onChatSessionUpdate: () => () => {},
    };
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list-empty')).toBeInTheDocument());
  });
});
