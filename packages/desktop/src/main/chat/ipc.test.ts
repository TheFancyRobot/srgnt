/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import { registerChatHandlers, type ChatSessionController } from './index.js';

const chatChannels = [
  ipcChannels.chatSessionNew,
  ipcChannels.chatSessionPrompt,
  ipcChannels.chatSessionCancel,
  ipcChannels.chatSessionDispose,
  ipcChannels.chatSessionSetMode,
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
    prompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    setMode: vi.fn(async (_handle: string, modeId: string) => ({ ok: true as const, currentModeId: modeId })),
    cancel: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
    disposeAll: vi.fn(async () => {}),
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
    expect(controller.newSession).toHaveBeenCalledWith('mock');

    await handlers.get(ipcChannels.chatSessionPrompt)!({}, { sessionId: 'chat-x-1', text: 'hi' });
    expect(controller.prompt).toHaveBeenCalledWith('chat-x-1', 'hi');

    await handlers.get(ipcChannels.chatSessionCancel)!({}, { sessionId: 'chat-x-1' });
    expect(controller.cancel).toHaveBeenCalledWith('chat-x-1');

    await handlers.get(ipcChannels.chatSessionDispose)!({}, { sessionId: 'chat-x-1' });
    expect(controller.dispose).toHaveBeenCalledWith('chat-x-1');

    await teardown();
    expect(controller.disposeAll).toHaveBeenCalledOnce();
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
