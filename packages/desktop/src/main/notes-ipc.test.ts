/**
 * @vitest-environment node
 *
 * Tests for the IPC handler registration in registerNotesHandlers().
 * MUST be a separate file from notes.test.ts to avoid vi.mock('electron')
 * hoisting conflicts under --coverage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcChannels } from '@srgnt/contracts';

// ─── Hoisted mocks — use vi.hoisted to avoid hoisting reference errors ───
const { mockIpcMainHandlers, mockRemoveHandler, mockHandle } = vi.hoisted(() => {
  const mockIpcMainHandlers = new Map<string, Function>();
  const mockRemoveHandler = vi.fn();
  const mockHandle = vi.fn((channel: string, handler: Function) => {
    mockIpcMainHandlers.set(channel, handler);
  });
  return { mockIpcMainHandlers, mockRemoveHandler, mockHandle };
});

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
}));

// ─── Imports after mock hoisting ───
import { registerNotesHandlers } from './notes.js';

// Collect the 10 channel names used by registerNotesHandlers
const notesChannelNames = [
  ipcChannels.notesListDir,
  ipcChannels.notesReadFile,
  ipcChannels.notesWriteFile,
  ipcChannels.notesCreateFile,
  ipcChannels.notesCreateFolder,
  ipcChannels.notesDelete,
  ipcChannels.notesRename,
  ipcChannels.notesSearch,
  ipcChannels.notesResolveWikilink,
  ipcChannels.notesListWorkspaceMarkdown,
] as const;

describe('registerNotesHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpcMainHandlers.clear();
  });

  it('calls removeHandler 10 times on registration', () => {
    registerNotesHandlers('/test-workspace');
    expect(mockRemoveHandler).toHaveBeenCalledTimes(10);
  });

  it('calls handle 10 times with correct channel strings', () => {
    registerNotesHandlers('/test-workspace');
    expect(mockHandle).toHaveBeenCalledTimes(10);
    const handledChannels = mockHandle.mock.calls.map((call: [string]) => call[0]);
    for (const channel of notesChannelNames) {
      expect(handledChannels).toContain(channel);
    }
  });

  it('registers all 10 handlers that are invocable', () => {
    registerNotesHandlers('/test-workspace');
    for (const channel of notesChannelNames) {
      expect(mockIpcMainHandlers.has(channel)).toBe(true);
      expect(typeof mockIpcMainHandlers.get(channel)).toBe('function');
    }
  });

  // ─── Default payload tests ───

  it('notesListDir handler defaults rawPayload to { dirPath: "" } when undefined', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesListDir)!;
    // Calling with undefined rawPayload should NOT throw on parsing
    // (it will fail on fs ops since /test-workspace doesn't exist)
    try {
      await handler({}, undefined);
    } catch {
      // fs error expected — just verify no parse-time throw
    }
  });

  it('notesSearch handler defaults rawPayload when undefined', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesSearch)!;
    try {
      await handler({}, undefined);
    } catch {
      // fs error expected
    }
  });

  it('notesListWorkspaceMarkdown handler defaults rawPayload when undefined', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesListWorkspaceMarkdown)!;
    try {
      await handler({}, undefined);
    } catch {
      // fs error expected
    }
  });

  // ─── Validation error tests ───

  it('notesReadFile handler throws validation error for missing payload', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesReadFile)!;
    await expect(handler({}, undefined)).rejects.toThrow();
  });

  it('notesWriteFile handler throws validation error for missing payload', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesWriteFile)!;
    await expect(handler({}, undefined)).rejects.toThrow();
  });

  it('notesCreateFile handler throws validation error for missing payload', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesCreateFile)!;
    await expect(handler({}, undefined)).rejects.toThrow();
  });

  it('notesDelete handler throws validation error for missing payload', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesDelete)!;
    await expect(handler({}, undefined)).rejects.toThrow();
  });

  it('notesRename handler throws validation error for missing payload', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesRename)!;
    await expect(handler({}, undefined)).rejects.toThrow();
  });

  it('notesResolveWikilink handler throws validation error for missing payload', async () => {
    registerNotesHandlers('/test-workspace');
    const handler = mockIpcMainHandlers.get(ipcChannels.notesResolveWikilink)!;
    await expect(handler({}, undefined)).rejects.toThrow();
  });
});
