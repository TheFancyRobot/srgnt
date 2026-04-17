/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock modules (hoisted to top)
// ---------------------------------------------------------------------------

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => true } as any),
}));

// Mock electron app - tests run in dev mode (isPackaged: false)
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}));

// ---------------------------------------------------------------------------
// Worker mock state
// ---------------------------------------------------------------------------

let workerMessageHandler: ((msg: Record<string, unknown>) => void) | null = null;
let workerErrorHandler: ((err: Error) => void) | null = null;
let workerExitHandler: ((code: number) => void) | null = null;

vi.mock('node:worker_threads', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    postMessage: vi.fn(),
    on: vi.fn(function (
      event: string,
      handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
    ) {
      if (event === 'message') {
        workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
      } else if (event === 'error') {
        workerErrorHandler = handler as (err: Error) => void;
      } else if (event === 'exit') {
        workerExitHandler = handler as (code: number) => void;
      }
    }),
    removeAllListeners: vi.fn(),
    terminate: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { createSemanticSearchHost, type SemanticSearchHost } from './host.js';
import { Worker } from 'node:worker_threads';

const MockedWorker = vi.mocked(Worker);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function sendWorkerResult(id: string, data: unknown) {
  if (workerMessageHandler) {
    workerMessageHandler({ type: 'result', id, data });
  }
}

function sendWorkerError(id: string, error: string) {
  if (workerMessageHandler) {
    workerMessageHandler({ type: 'error', id, error });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SemanticSearchHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerMessageHandler = null;
    workerErrorHandler = null;
    workerExitHandler = null;
    MockedWorker.mockClear();
  });

  // -------------------------------------------------------------------------
  // Lifecycle tests
  // -------------------------------------------------------------------------

  describe('lifecycle', () => {
    it('starts in uninitialized state', () => {
      const host = createSemanticSearchHost();
      expect(host.getStatus()).toBe('uninitialized');
    });

    it('transitions to ready after initialize()', async () => {
      const host = createSemanticSearchHost();

      // Mock Worker to capture postMessage and respond with result
      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            // Respond with success result after short delay
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('ready');
    });

    it('transitions to indexing then back to ready after indexWorkspace()', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          } else if (type === 'index' && id) {
            setTimeout(() => sendWorkerResult(id, { indexedChunkCount: 10, skippedCount: 0, durationMs: 100 }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('ready');

      const indexPromise = host.indexWorkspace('/test/workspace');
      expect(host.getStatus()).toBe('indexing');

      await indexPromise;
      expect(host.getStatus()).toBe('ready');
    });

    it('teardown resets state to uninitialized', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('ready');

      await host.teardown();
      expect(host.getStatus()).toBe('uninitialized');
    });

    it('terminate is called on teardown', async () => {
      let terminateFn = vi.fn().mockResolvedValue(undefined);

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: terminateFn,
        };
      });

      const host = createSemanticSearchHost();
      await host.initialize('/test/workspace');
      await host.teardown();

      expect(terminateFn).toHaveBeenCalled();
    });

    it('initializes worker with correct config', async () => {
      let postMessageFn = vi.fn();

      MockedWorker.mockImplementation(() => {
        const postMessage = postMessageFn.mockImplementation((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      const host = createSemanticSearchHost();
      await host.initialize('/test/workspace');

      expect(postMessageFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'init',
          config: expect.objectContaining({
            workspaceRoot: '/test/workspace',
          }),
        }),
      );
    });
  });



  // -------------------------------------------------------------------------
  // Idempotent init
  // -------------------------------------------------------------------------

  describe('idempotent initialize()', () => {
    it('does not restart worker when called with same root twice', async () => {
      let postMessageFn = vi.fn();

      MockedWorker.mockImplementation(() => {
        const postMessage = postMessageFn.mockImplementation((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      const host = createSemanticSearchHost();
      await host.initialize('/test/workspace');
      const callCountAfterFirst = postMessageFn.mock.calls.length;

      // Same root - should be no-op
      await host.initialize('/test/workspace');

      expect(postMessageFn.mock.calls.length).toBe(callCountAfterFirst);
    });

    it('still returns without error on second init with same root', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      await expect(host.initialize('/test/workspace')).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Workspace switch teardown
  // -------------------------------------------------------------------------

  describe('workspace switch teardown', () => {
    it('automatically tears down when workspace root changes', async () => {
      let terminateFn = vi.fn().mockResolvedValue(undefined);

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: terminateFn,
        };
      });

      const host = createSemanticSearchHost();
      await host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('ready');

      // Switch to different workspace - should trigger teardown first
      await host.initialize('/test/other-workspace');

      expect(terminateFn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Concurrent init rejection
  // -------------------------------------------------------------------------

  describe('concurrent init rejection', () => {
    it('throws when initialize() is called while already initializing', async () => {
      // Use a custom mock that responds after a delay to simulate slow init
      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          // Respond after a delay to ensure concurrent call happens during init
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 100);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      const host = createSemanticSearchHost();
      const firstInit = host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('initializing');

      // Second init should throw immediately because state is 'initializing'
      await expect(host.initialize('/test/workspace')).rejects.toThrow(
        'Semantic search is already initializing',
      );

      // Clean up - resolve the first init by letting it complete
      await firstInit;
    });
  });

  // -------------------------------------------------------------------------
  // Worker crash handling
  // -------------------------------------------------------------------------

  describe('worker crash handling', () => {
    it('sets state to error when worker emits error event', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('ready');

      // Simulate worker error
      if (workerErrorHandler) {
        workerErrorHandler(new Error('Worker crashed'));
      }

      expect(host.getStatus()).toBe('error');
    });

    it('sets state to error when worker exits with non-zero code', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('ready');

      // Simulate worker exit with error code
      if (workerExitHandler) {
        workerExitHandler(1);
      }

      expect(host.getStatus()).toBe('error');
    });

    it('does not set error state when worker exits with code 0 during teardown', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      await host.teardown();

      // State should remain uninitialized, not error
      expect(host.getStatus()).toBe('uninitialized');
    });
  });

  // -------------------------------------------------------------------------
  // Status reporting
  // -------------------------------------------------------------------------

  describe('getStatus()', () => {
    it('returns correct state at each lifecycle stage', async () => {
      const host = createSemanticSearchHost();

      expect(host.getStatus()).toBe('uninitialized');

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      expect(host.getStatus()).toBe('ready');

      await host.teardown();
      expect(host.getStatus()).toBe('uninitialized');
    });

    it('returns error state after worker crash', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');

      if (workerErrorHandler) {
        workerErrorHandler(new Error('Worker crashed'));
      }

      expect(host.getStatus()).toBe('error');
    });
  });

  // -------------------------------------------------------------------------
  // API return types
  // -------------------------------------------------------------------------

  describe('API return types', () => {
    it('indexWorkspace() returns indexedChunkCount, skippedCount, durationMs', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          } else if (type === 'index' && id) {
            setTimeout(() => sendWorkerResult(id, { indexedChunkCount: 10, skippedCount: 0, durationMs: 100 }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      const result = await host.indexWorkspace('/test/workspace');

      expect(result).toHaveProperty('indexedChunkCount');
      expect(result).toHaveProperty('skippedCount');
      expect(result).toHaveProperty('durationMs');
    });

    it('rebuildAll() returns totalChunkCount, durationMs', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          } else if (type === 'rebuild' && id) {
            setTimeout(() => sendWorkerResult(id, { totalChunkCount: 50, durationMs: 200 }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      const result = await host.rebuildAll('/test/workspace');

      expect(result).toHaveProperty('totalChunkCount');
      expect(result).toHaveProperty('durationMs');
    });

    it('search() returns array of results', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          } else if (type === 'search' && id) {
            setTimeout(() => sendWorkerResult(id, [
              { score: 0.9, title: 'Test', workspaceRelativePath: 'test.md', snippet: '...' },
            ]), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      const results = await host.search('test query');

      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('score');
        expect(results[0]).toHaveProperty('title');
        expect(results[0]).toHaveProperty('workspaceRelativePath');
        expect(results[0]).toHaveProperty('snippet');
      }
    });

    it('search() auto-initializes when given a workspace root', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          } else if (type === 'search' && id) {
            setTimeout(() => sendWorkerResult(id, [
              { score: 0.9, title: 'Auto Init', workspaceRelativePath: 'test.md', snippet: '...' },
            ]), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      const results = await host.search('test query', '/test/workspace');
      expect(results[0]?.title).toBe('Auto Init');
      expect(host.getStatus()).toBe('ready');
    });

    it('search() throws when not initialized and no workspace root is available', async () => {
      const host = createSemanticSearchHost();
      await expect(host.search('test query')).rejects.toThrow('Semantic search not initialized');
    });

    it('rebuildAll() resets state to ready when worker returns an error', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          } else if (type === 'rebuild' && id) {
            setTimeout(() => sendWorkerError(id, 'rebuild failed'), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      await expect(host.rebuildAll('/test/workspace')).rejects.toThrow('rebuild failed');
      expect(host.getStatus()).toBe('ready');
    });

    it('ignores worker ready messages and orphaned results', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => {
              if (workerMessageHandler) {
                workerMessageHandler({ type: 'ready' });
                workerMessageHandler({ type: 'result', data: { ignored: true } });
                workerMessageHandler({ type: 'result', id: 'missing-request', data: { ignored: true } });
              }
              sendWorkerResult(id, { success: true });
            }, 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await expect(host.initialize('/test/workspace')).resolves.toBeUndefined();
      expect(host.getStatus()).toBe('ready');
    });
  });

  // -------------------------------------------------------------------------
  // Teardown behavior
  // -------------------------------------------------------------------------

  describe('teardown() behavior', () => {
    it('can be called when not initialized', async () => {
      const host = createSemanticSearchHost();
      await expect(host.teardown()).resolves.toBeUndefined();
      expect(host.getStatus()).toBe('uninitialized');
    });

    it('can be called multiple times safely', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.initialize('/test/workspace');
      await host.teardown();
      await expect(host.teardown()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // enableForWorkspace
  // -------------------------------------------------------------------------

  describe('enableForWorkspace()', () => {
    it('initializes when not ready', async () => {
      const host = createSemanticSearchHost();

      MockedWorker.mockImplementation(() => {
        const postMessage = vi.fn((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      await host.enableForWorkspace('/test/workspace');
      expect(host.getStatus()).toBe('ready');
    });

    it('does not reinitialize when already ready', async () => {
      let postMessageFn = vi.fn();

      MockedWorker.mockImplementation(() => {
        const postMessage = postMessageFn.mockImplementation((msg: Record<string, unknown>) => {
          const type = (msg as any).type;
          const id = (msg as any).id;
          if (type === 'init' && id) {
            setTimeout(() => sendWorkerResult(id, { success: true }), 0);
          }
        });
        return {
          postMessage,
          on: vi.fn(function (
            event: string,
            handler: ((msg: Record<string, unknown>) => void) | ((err: Error) => void) | ((code: number) => void),
          ) {
            if (event === 'message') {
              workerMessageHandler = handler as (msg: Record<string, unknown>) => void;
            } else if (event === 'error') {
              workerErrorHandler = handler as (err: Error) => void;
            } else if (event === 'exit') {
              workerExitHandler = handler as (code: number) => void;
            }
          }),
          removeAllListeners: vi.fn(),
          terminate: vi.fn().mockResolvedValue(undefined),
        };
      });

      const host = createSemanticSearchHost();
      await host.enableForWorkspace('/test/workspace');
      const callCount = postMessageFn.mock.calls.length;

      await host.enableForWorkspace('/test/workspace');

      expect(postMessageFn.mock.calls.length).toBe(callCount);
    });
  });




});
