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
// Deliberately loose: this stands in for the whole preload bridge, whose
// members have wildly different signatures.
let api: Record<string, unknown>;

beforeEach(() => {
  updateListeners = [];
  persisted = [persistedSession()];
  openEvents = [];
  newSessionCount = 0;
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

  it('refuses a prompt on a session replayed from disk', async () => {
    // `live: false` means main holds no controller for that id, so the prompt
    // would surface as a failed turn rather than an explained refusal.
    renderPanel();
    await waitFor(() => expect(screen.getByTestId('session-list')).toBeInTheDocument());
    fireEvent.click(within(rowFor('sess-old')).getByTestId('session-open'));
    await waitFor(() => expect(screen.getByTestId('chat-input')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'keep going' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('chat-send'));
    });
    await waitFor(() => expect(screen.getByTestId('chat-error')).toHaveTextContent(/no longer running/i));
    expect(api.chatSessionPrompt).not.toHaveBeenCalled();
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
