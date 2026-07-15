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

import { registerDevConsoleHandlers, type DevSessionController } from './index.js';

const operationalChannels = [
  ipcChannels.devSessionNew,
  ipcChannels.devSessionPrompt,
  ipcChannels.devSessionCancel,
  ipcChannels.devSessionDispose,
];

function fakeController() {
  return {
    newSession: vi.fn(async (target: 'mock' | 'pi') => ({ sessionId: 'dev-x-1', target, capabilities: {} })),
    prompt: vi.fn(async () => ({ stopReason: 'end_turn' })),
    cancel: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
    disposeAll: vi.fn(async () => {}),
  };
}

describe('registerDevConsoleHandlers gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
  });

  it('with the flag OFF, registers ONLY the enabled-query channel and reports false', async () => {
    registerDevConsoleHandlers({ getWindow: () => null, enabled: false });

    expect(handlers.has(ipcChannels.devConsoleEnabled)).toBe(true);
    for (const channel of operationalChannels) {
      expect(handlers.has(channel)).toBe(false);
    }
    const enabled = await handlers.get(ipcChannels.devConsoleEnabled)!({}, undefined);
    expect(enabled).toBe(false);
  });

  it('with the flag ON, registers the operational channels and routes to the controller', async () => {
    const controller = fakeController();
    const teardown = registerDevConsoleHandlers({
      getWindow: () => null,
      enabled: true,
      createController: () => controller as unknown as DevSessionController,
    });

    expect(await handlers.get(ipcChannels.devConsoleEnabled)!({}, undefined)).toBe(true);
    for (const channel of operationalChannels) {
      expect(handlers.has(channel)).toBe(true);
    }

    await handlers.get(ipcChannels.devSessionNew)!({}, { target: 'mock' });
    expect(controller.newSession).toHaveBeenCalledWith('mock');

    await handlers.get(ipcChannels.devSessionPrompt)!({}, { sessionId: 'dev-x-1', text: 'hi' });
    expect(controller.prompt).toHaveBeenCalledWith('dev-x-1', 'hi');

    await handlers.get(ipcChannels.devSessionCancel)!({}, { sessionId: 'dev-x-1' });
    expect(controller.cancel).toHaveBeenCalledWith('dev-x-1');

    await handlers.get(ipcChannels.devSessionDispose)!({}, { sessionId: 'dev-x-1' });
    expect(controller.dispose).toHaveBeenCalledWith('dev-x-1');

    await teardown();
    expect(controller.disposeAll).toHaveBeenCalledOnce();
  });

  it('rejects a malformed new-session payload (schema-validated)', async () => {
    const controller = fakeController();
    registerDevConsoleHandlers({
      getWindow: () => null,
      enabled: true,
      createController: () => controller as unknown as DevSessionController,
    });
    await expect(handlers.get(ipcChannels.devSessionNew)!({}, { target: 'bogus' })).rejects.toThrow();
    expect(controller.newSession).not.toHaveBeenCalled();
  });
});
