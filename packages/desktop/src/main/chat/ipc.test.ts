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
    cancel: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
    disposeAll: vi.fn(async () => {}),
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
});
