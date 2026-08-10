/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ipcChannels } from '@srgnt/contracts';

const { handlers, mockHandle } = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, payload: unknown) => unknown>();
  const mockHandle = vi.fn((channel: string, handler: (event: unknown, payload: unknown) => unknown) => {
    handlers.set(channel, handler);
  });
  return { handlers, mockHandle };
});

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}));

import { registerChatHandlers, resolveChatTarget, type ChatSessionController } from './index.js';

const chatChannels = [
  ipcChannels.chatSessionNew,
  ipcChannels.chatSessionPrompt,
  ipcChannels.chatSessionCancel,
  ipcChannels.chatSessionDispose,
  ipcChannels.chatSessionSetMode,
  ipcChannels.chatSessionList,
  ipcChannels.chatSessionOpen,
];

function fakeController() {
  return {
    newSession: vi.fn(async (target: 'mock' | 'pi') => ({
      sessionId: 'chat-x-1',
      target,
      harnessId: target,
      harnessName: target === 'pi' ? 'Pi' : 'Mock Agent',
      quirks: [],
      capabilities: {},
    })),
    reconnect: vi.fn(async () => ({ outcome: 'loaded' as const })),
    prompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    setMode: vi.fn(async (_handle: string, modeId: string) => ({ ok: true as const, currentModeId: modeId })),
    cancel: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
    disposeAll: vi.fn(async () => {}),
    cancelInFlight: vi.fn(async () => {}),
    checkpointAll: vi.fn(async () => {}),
    respondToPermission: vi.fn(() => {}),
  };
}

describe('registerChatHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
  });

  it('always registers the chat channels and routes them to the controller', async () => {
    const controller = fakeController();
    const teardown = registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
    });

    for (const channel of chatChannels) {
      expect(handlers.has(channel)).toBe(true);
    }

    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });
    // No `projects` wiring → no project resolved, exactly as in Phase 23.
    expect(controller.newSession).toHaveBeenCalledWith('mock', {});

    await handlers.get(ipcChannels.chatSessionPrompt)!({}, { sessionId: 'chat-x-1', text: 'hi' });
    expect(controller.prompt).toHaveBeenCalledWith('chat-x-1', 'hi');

    await handlers.get(ipcChannels.chatSessionCancel)!({}, { sessionId: 'chat-x-1' });
    expect(controller.cancel).toHaveBeenCalledWith('chat-x-1');

    await handlers.get(ipcChannels.chatSessionDispose)!({}, { sessionId: 'chat-x-1' });
    expect(controller.dispose).toHaveBeenCalledWith('chat-x-1');

    await teardown();
    expect(controller.disposeAll).toHaveBeenCalledOnce();
  });

  it('lists a project sessions newest-activity-first without constructing a controller', async () => {
    const createController = vi.fn(() => fakeController() as unknown as ChatSessionController);
    const listSessions = vi.fn(async () => ({
      sessions: [
        { id: 'old', projectId: 'p1', harnessId: 'mock', kind: 'single', status: 'idle', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
        { id: 'new', projectId: 'p1', harnessId: 'mock', kind: 'single', status: 'idle', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-05T00:00:00.000Z' },
        // Never prompted, so no `updatedAt`: it sorts on `createdAt` instead of
        // falling to the bottom of the list.
        { id: 'never', projectId: 'p1', harnessId: 'mock', kind: 'single', status: 'idle', createdAt: '2026-01-03T00:00:00.000Z' },
      ],
      skipped: [{ sessionId: 'broken', reason: 'invalid meta' }],
    }));
    registerChatHandlers({
      getWindow: () => null,
      createController,
      sessions: { store: () => ({ listSessions }) as never },
    });

    const listed = (await handlers.get(ipcChannels.chatSessionList)!({}, { projectId: 'p1' })) as {
      sessions: { id: string }[];
      skipped: { sessionId: string }[];
    };
    expect(listed.sessions.map((session) => session.id)).toEqual(['new', 'never', 'old']);
    expect(listed.skipped[0]!.sessionId).toBe('broken');
    // Listing is a disk read: it must never load the harness or spawn an agent.
    expect(createController).not.toHaveBeenCalled();
  });

  it('marks a session stranded active by a crash as interrupted when listing', async () => {
    // The common crash shape: the app exited after a complete, newline-terminated
    // event and before `client/stop`. The log is not torn, so nothing flags it,
    // and no controller exists to ever close it out — without this the list
    // reports "Running" forever and clicking the row is the only way to find out.
    const createController = vi.fn(() => fakeController() as unknown as ChatSessionController);
    const updateMeta = vi.fn(async (_ref: unknown, patch: { status: string }) => ({
      id: 'stranded', projectId: 'p1', harnessId: 'mock', kind: 'single',
      status: patch.status, createdAt: '2026-01-01T00:00:00.000Z',
    }));
    const listSessions = vi.fn(async () => ({
      sessions: [
        { id: 'stranded', projectId: 'p1', harnessId: 'mock', kind: 'single', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'clean', projectId: 'p1', harnessId: 'mock', kind: 'single', status: 'idle', createdAt: '2026-01-02T00:00:00.000Z' },
      ],
      skipped: [],
    }));
    registerChatHandlers({
      getWindow: () => null,
      createController,
      sessions: { store: () => ({ listSessions, updateMeta }) as never },
    });

    const listed = (await handlers.get(ipcChannels.chatSessionList)!({}, { projectId: 'p1' })) as {
      sessions: { id: string; status: string }[];
    };
    expect(listed.sessions.find((session) => session.id === 'stranded')!.status).toBe('interrupted');
    // Only the stranded one is rewritten, and still no controller is built.
    expect(listed.sessions.find((session) => session.id === 'clean')!.status).toBe('idle');
    expect(updateMeta).toHaveBeenCalledTimes(1);
    expect(createController).not.toHaveBeenCalled();
  });

  it('returns an empty session list when no workspace root exists yet', async () => {
    registerChatHandlers({ getWindow: () => null, createController: () => fakeController() as unknown as ChatSessionController });
    expect(await handlers.get(ipcChannels.chatSessionList)!({}, { projectId: 'p1' })).toEqual({
      sessions: [],
      skipped: [],
    });
  });

  it('opens a persisted session from disk, marking a truncated tail interrupted', async () => {
    const meta = {
      id: 's1',
      projectId: 'p1',
      harnessId: 'mock',
      kind: 'single',
      status: 'idle',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const updateMeta = vi.fn(async () => ({ ...meta, status: 'interrupted' }));
    const checkpointTranscript = vi.fn(async () => {});
    const createController = vi.fn(() => fakeController() as unknown as ChatSessionController);
    registerChatHandlers({
      getWindow: () => null,
      createController,
      sessions: {
        store: () =>
          ({
            checkpointTranscript,
            readMeta: async () => meta,
            readEvents: async () => ({
              events: [{ seq: 0, ts: '2026-01-01T00:00:01.000Z', protocolVersion: 1, kind: 'client/prompt', payload: { text: 'hi' } }],
              truncatedTail: true,
              lastValidByteOffset: 0,
              tailMissingNewline: false,
            }),
            updateMeta,
          }) as never,
      },
    });

    const opened = (await handlers.get(ipcChannels.chatSessionOpen)!({}, { projectId: 'p1', sessionId: 's1' })) as {
      session: { status: string };
      events: unknown[];
      truncatedTail: boolean;
      live: boolean;
    };
    // A log that stops mid-record is a turn that never finished.
    expect(updateMeta).toHaveBeenCalledWith({ projectId: 'p1', sessionId: 's1' }, { status: 'interrupted' });
    expect(opened.session.status).toBe('interrupted');
    expect(opened.events).toHaveLength(1);
    expect(opened.truncatedTail).toBe(true);
    // The derived transcript is re-rendered from the log that was just read, so
    // a stale checkpoint written before the crash never survives a reopen.
    expect(checkpointTranscript).toHaveBeenCalledWith({ projectId: 'p1', sessionId: 's1' });
    // Nothing is live because nothing ever constructed the controller.
    expect(opened.live).toBe(false);
    expect(createController).not.toHaveBeenCalled();
  });

  it('does not construct a controller until a channel is actually used', async () => {
    const createController = vi.fn(() => fakeController() as unknown as ChatSessionController);
    const teardown = registerChatHandlers({ getWindow: () => null, createController });

    expect(createController).not.toHaveBeenCalled();
    // Teardown with no session ever opened must not force construction either.
    await teardown();
    expect(createController).not.toHaveBeenCalled();
  });

  it('rejects a malformed new-session payload (schema-validated)', async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
    });
    await expect(handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'bogus' })).rejects.toThrow();
    expect(controller.newSession).not.toHaveBeenCalled();
  });

  it('rejects a prompt payload missing the session handle', async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
    });
    await expect(handlers.get(ipcChannels.chatSessionPrompt)!({}, { text: 'hi' })).rejects.toThrow();
    expect(controller.prompt).not.toHaveBeenCalled();
  });

  it('drops pushed frames when the window is gone instead of throwing', async () => {
    let capturedOnUpdate: ((event: { sessionId: string; update: unknown }) => void) | undefined;
    registerChatHandlers({
      getWindow: () => null,
      createController: (options) => {
        capturedOnUpdate = options.onUpdate;
        return fakeController() as unknown as ChatSessionController;
      },
    });
    // Force construction so the onUpdate wiring exists.
    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });
    expect(capturedOnUpdate).toBeDefined();
    expect(() => capturedOnUpdate!({ sessionId: 'chat-x-1', update: {} })).not.toThrow();
  });

  it('pushes session updates and client-terminal output on their own channels', async () => {
    const sent: { channel: string; payload: unknown }[] = [];
    let options: Parameters<NonNullable<Parameters<typeof registerChatHandlers>[0]['createController']>>[0] | undefined;
    registerChatHandlers({
      getWindow: () =>
        ({
          isDestroyed: () => false,
          webContents: { send: (channel: string, payload: unknown) => sent.push({ channel, payload }) },
        }) as never,
      createController: (received) => {
        options = received;
        return fakeController() as unknown as ChatSessionController;
      },
    });
    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });

    options!.onUpdate({ sessionId: 'chat-x-1', update: { sessionUpdate: 'tool_call' } });
    options!.onTerminalOutput({ sessionId: 'chat-x-1', terminalId: 'chat-term-1', chunk: 'out\r\n' });
    options!.onStatus({ sessionId: 'chat-x-1', status: 'crashed' });

    expect(sent).toEqual([
      {
        channel: ipcChannels.chatSessionUpdate,
        payload: { sessionId: 'chat-x-1', update: { sessionUpdate: 'tool_call' } },
      },
      {
        channel: ipcChannels.chatTerminalOutput,
        payload: { sessionId: 'chat-x-1', terminalId: 'chat-term-1', chunk: 'out\r\n' },
      },
      {
        channel: ipcChannels.chatSessionStatus,
        payload: { sessionId: 'chat-x-1', status: 'crashed' },
      },
    ]);
  });

  it('routes a set-mode call and rejects a malformed one', async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
    });

    await expect(
      handlers.get(ipcChannels.chatSessionSetMode)!({}, { sessionId: 'chat-x-1', modeId: 'xhigh' }),
    ).resolves.toEqual({ ok: true, currentModeId: 'xhigh' });
    expect(controller.setMode).toHaveBeenCalledWith('chat-x-1', 'xhigh');

    // A payload missing `modeId` must never reach the controller: an untyped
    // set-mode is exactly the `Schema.Unknown` escape hatch this step forbids.
    await expect(
      handlers.get(ipcChannels.chatSessionSetMode)!({}, { sessionId: 'chat-x-1' }),
    ).rejects.toThrow();
    expect(controller.setMode).toHaveBeenCalledTimes(1);
  });

  it('routes a permission answer to the controller', async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
    });
    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });
    await handlers.get(ipcChannels.chatPermissionRespond)!(
      {},
      { sessionId: 'chat-x-1', requestId: 'chat-x-1-perm-1', optionId: 'allow-1' },
    );
    expect(controller.respondToPermission).toHaveBeenCalledWith('chat-x-1', 'chat-x-1-perm-1', 'allow-1');
  });

  it('treats a permission answer with no option id as a cancel', async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
    });
    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });
    await handlers.get(ipcChannels.chatPermissionRespond)!(
      {},
      { sessionId: 'chat-x-1', requestId: 'chat-x-1-perm-1' },
    );
    expect(controller.respondToPermission).toHaveBeenCalledWith('chat-x-1', 'chat-x-1-perm-1', undefined);
  });

  it('does not construct a controller just because a permission answer arrived', async () => {
    const createController = vi.fn(() => fakeController() as unknown as ChatSessionController);
    registerChatHandlers({ getWindow: () => null, createController });
    await handlers.get(ipcChannels.chatPermissionRespond)!(
      {},
      { sessionId: 'chat-x-1', requestId: 'ghost' },
    );
    expect(createController).not.toHaveBeenCalled();
  });

  it('reports permission-push delivery so an unaskable prompt fails closed', async () => {
    let options:
      | Parameters<NonNullable<Parameters<typeof registerChatHandlers>[0]['createController']>>[0]
      | undefined;
    let window: unknown = null;
    registerChatHandlers({
      getWindow: () => window as never,
      createController: (received) => {
        options = received;
        return fakeController() as unknown as ChatSessionController;
      },
    });
    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });

    // No window: the controller must learn the prompt was NOT delivered, so it
    // answers the agent `cancelled` rather than blocking on an invisible prompt.
    expect(options!.onPermissionRequest({ sessionId: 'chat-x-1', requestId: 'r1' })).toBe(false);

    const sent: { channel: string; payload: unknown }[] = [];
    window = {
      isDestroyed: () => false,
      webContents: { send: (channel: string, payload: unknown) => sent.push({ channel, payload }) },
    };
    expect(options!.onPermissionRequest({ sessionId: 'chat-x-1', requestId: 'r1' })).toBe(true);
    options!.onPermissionClose({ sessionId: 'chat-x-1', requestId: 'r1', reason: 'expired' });
    expect(sent.map((frame) => frame.channel)).toEqual([
      ipcChannels.chatPermissionRequest,
      ipcChannels.chatPermissionClose,
    ]);
  });
});

// ---------------------------------------------------------------------------
// Honest resume + fork (PHASE-24, STEP-24-04)
// ---------------------------------------------------------------------------

describe('registerChatHandlers resume and fork', () => {
  const meta = {
    id: 's1',
    projectId: 'p1',
    harnessId: 'mock',
    kind: 'single',
    status: 'closed',
    title: 'Fix the bug',
    acpSessionId: 'acp-1',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
  });

  /** A store fake over one mutable project's session records. */
  function storeFor(records: Record<string, unknown>[]) {
    const updateMeta = vi.fn(async (ref: { sessionId: string }, patch: Record<string, unknown>) => {
      const index = records.findIndex((record) => record.id === ref.sessionId);
      records[index] = { ...records[index], ...patch };
      return records[index];
    });
    return {
      updateMeta,
      store: {
        readMeta: async (ref: { sessionId: string }) => records.find((record) => record.id === ref.sessionId),
        readEvents: async () => ({ events: [] }),
        listSessions: async () => ({ sessions: records, skipped: [] }),
        updateMeta,
      },
    };
  }

  it('reconnects a persisted session using the harness and ACP id off its meta', async () => {
    const controller = fakeController();
    const { store } = storeFor([{ ...meta }]);
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
      sessions: { store: () => store as never },
    });

    const result = await handlers.get(ipcChannels.chatSessionReconnect)!({}, { projectId: 'p1', sessionId: 's1' });

    expect(result).toEqual({ outcome: 'loaded' });
    expect(controller.reconnect).toHaveBeenCalledWith('s1', {
      target: 'mock',
      project: {},
      acpSessionId: 'acp-1',
    });
  });

  it('refuses to resume a session on a harness this build cannot drive', async () => {
    // harnesses.json is user data. Quietly resuming on a DIFFERENT agent would
    // be the exact fake-continue the phase forbids.
    const createController = vi.fn(() => fakeController() as unknown as ChatSessionController);
    const { store } = storeFor([{ ...meta, harnessId: 'opencode' }]);
    registerChatHandlers({
      getWindow: () => null,
      createController,
      sessions: { store: () => store as never },
    });

    const result = (await handlers.get(ipcChannels.chatSessionReconnect)!(
      {},
      { projectId: 'p1', sessionId: 's1' },
    )) as { outcome: string; reason: string };

    expect(result.outcome).toBe('read_only');
    expect(result.reason).toMatch(/opencode/);
    // And nothing was spawned to reach that conclusion.
    expect(createController).not.toHaveBeenCalled();
  });

  it('forks a session, stamping lineage into the child session-creation call', async () => {
    const controller = fakeController();
    const records = [{ ...meta }];
    const { store, updateMeta } = storeFor(records);
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
      sessions: { store: () => store as never },
    });

    const forked = (await handlers.get(ipcChannels.chatSessionFork)!(
      {},
      { projectId: 'p1', sourceSessionId: 's1', idempotencyKey: 'key-1' },
    )) as { parentSessionId: string; handoffText: string; reused: boolean };

    expect(forked.reused).toBe(false);
    expect(forked.parentSessionId).toBe('s1');
    expect(forked.handoffText).toContain('Continuing from "Fix the bug".');
    // The stamp rides along with the child's FIRST meta write.
    expect(controller.newSession).toHaveBeenCalledWith('mock', {}, {
      parentSessionId: 's1',
      idempotencyKey: 'key-1',
      requestFingerprint: expect.any(String),
    });
    expect(updateMeta).toHaveBeenCalledWith(
      { projectId: 'p1', sessionId: 's1' },
      { forkedSessionIds: ['chat-x-1'] },
    );
  });

  it('collapses two simultaneous forks with one key into a single child', async () => {
    // The durable guard is the key stamped on the child, but that record does
    // not exist until session/new returns — this covers exactly that window.
    const controller = fakeController();
    const { store } = storeFor([{ ...meta }]);
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
      sessions: { store: () => store as never },
    });

    const payload = { projectId: 'p1', sourceSessionId: 's1', idempotencyKey: 'key-1' };
    const [first, second] = await Promise.all([
      handlers.get(ipcChannels.chatSessionFork)!({}, payload),
      handlers.get(ipcChannels.chatSessionFork)!({}, payload),
    ]);

    expect(first).toEqual(second);
    expect(controller.newSession).toHaveBeenCalledTimes(1);
  });

  it('rejects a fork request with no idempotency key before it reaches the service', async () => {
    const controller = fakeController();
    const { store } = storeFor([{ ...meta }]);
    registerChatHandlers({
      getWindow: () => null,
      createController: () => controller as unknown as ChatSessionController,
      sessions: { store: () => store as never },
    });
    await expect(
      handlers.get(ipcChannels.chatSessionFork)!({}, { projectId: 'p1', sourceSessionId: 's1' }),
    ).rejects.toThrow();
    expect(controller.newSession).not.toHaveBeenCalled();
  });

  it('rebuilds a parent forkedSessionIds list from its children when listing', async () => {
    // The crash-between-writes shape: the child names its parent, the parent
    // never learned about it. The list is where lineage is displayed, so it is
    // where the repair belongs.
    const records = [
      { ...meta, id: 'parent', status: 'idle' },
      { ...meta, id: 'child', status: 'idle', parentSessionId: 'parent' },
    ];
    const { store, updateMeta } = storeFor(records);
    registerChatHandlers({
      getWindow: () => null,
      createController: () => fakeController() as unknown as ChatSessionController,
      sessions: { store: () => store as never },
    });

    const listed = (await handlers.get(ipcChannels.chatSessionList)!({}, { projectId: 'p1' })) as {
      sessions: { id: string; forkedSessionIds?: string[] }[];
    };

    expect(listed.sessions.find((session) => session.id === 'parent')!.forkedSessionIds).toEqual(['child']);
    expect(updateMeta).toHaveBeenCalledWith(
      { projectId: 'p1', sessionId: 'parent' },
      { forkedSessionIds: ['child'] },
    );

    // Idempotent: a second read repairs nothing, so `updatedAt` does not churn.
    updateMeta.mockClear();
    await handlers.get(ipcChannels.chatSessionList)!({}, { projectId: 'p1' });
    expect(updateMeta).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Project resolution (PHASE-24, STEP-24-02)
// ---------------------------------------------------------------------------

describe('resolveChatTarget', () => {
  it('prefers an explicit choice over the project default', () => {
    expect(resolveChatTarget('mock', 'pi')).toBe('mock');
    expect(resolveChatTarget('pi', 'mock')).toBe('pi');
  });

  it('falls back to the project default, then to mock', () => {
    expect(resolveChatTarget(undefined, 'pi')).toBe('pi');
    expect(resolveChatTarget(undefined, undefined)).toBe('mock');
  });

  it('ignores a default naming a harness this surface cannot drive', () => {
    // harnesses.json is user data; an unknown default must degrade, not crash.
    expect(resolveChatTarget(undefined, 'opencode')).toBe('mock');
  });
});

describe('registerChatHandlers project resolution', () => {
  const project = {
    id: 'abc123',
    name: 'srgnt',
    rootDir: tmpdir(),
    additionalDirectories: [] as readonly string[],
    createdAt: '2026-07-20T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
  });

  function projectsStub(overrides: Partial<typeof project> = {}) {
    const resolved = { ...project, ...overrides };
    return {
      get: vi.fn(async () => resolved),
      ensureForDir: vi.fn(async () => resolved),
    };
  }

  it('auto-creates the project from the workspace cwd when none is named', async () => {
    const controller = fakeController();
    const projects = projectsStub();
    registerChatHandlers({
      getWindow: () => null,
      getCwd: () => '/ws',
      projects,
      createController: () => controller as unknown as ChatSessionController,
    });

    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });

    expect(projects.ensureForDir).toHaveBeenCalledWith('/ws');
    expect(projects.get).not.toHaveBeenCalled();
    expect(controller.newSession).toHaveBeenCalledWith('mock', {
      projectId: 'abc123',
      cwd: project.rootDir,
    });
  });

  it('looks the project up by id when the renderer named one', async () => {
    const controller = fakeController();
    const projects = projectsStub();
    registerChatHandlers({
      getWindow: () => null,
      getCwd: () => '/ws',
      projects,
      createController: () => controller as unknown as ChatSessionController,
    });

    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock', projectId: 'abc123' });

    expect(projects.get).toHaveBeenCalledWith('abc123');
    expect(projects.ensureForDir).not.toHaveBeenCalled();
  });

  it("applies the project's defaultHarnessId when no target was chosen", async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      getCwd: () => '/ws',
      projects: projectsStub({ defaultHarnessId: 'pi' } as Partial<typeof project>),
      createController: () => controller as unknown as ChatSessionController,
    });

    await handlers.get(ipcChannels.chatSessionNew)!({}, {});

    expect(controller.newSession).toHaveBeenCalledWith('pi', expect.objectContaining({ projectId: 'abc123' }));
  });

  it("passes the project's permission policy through to the controller", async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      getCwd: () => '/ws',
      projects: projectsStub({ permissionPolicy: { read: 'allow' } } as Partial<typeof project>),
      createController: () => controller as unknown as ChatSessionController,
    });

    await handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' });

    expect(controller.newSession).toHaveBeenCalledWith(
      'mock',
      expect.objectContaining({ permissionPolicy: { read: 'allow' } }),
    );
  });

  it('fails with a readable error when the project rootDir no longer exists', async () => {
    const controller = fakeController();
    registerChatHandlers({
      getWindow: () => null,
      getCwd: () => '/ws',
      projects: projectsStub({ rootDir: join(tmpdir(), 'srgnt-deleted-checkout-that-does-not-exist') }),
      createController: () => controller as unknown as ChatSessionController,
    });

    await expect(handlers.get(ipcChannels.chatSessionNew)!({}, { target: 'mock' })).rejects.toThrow(
      /no longer exists/,
    );
    expect(controller.newSession).not.toHaveBeenCalled();
  });
});
