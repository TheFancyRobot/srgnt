/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyStatus,
  createErrorStatus,
  createIndexingStatus,
  createStatusFromIndexResult,
} from './status.js';

describe('semantic-search status helpers', () => {
  it('createEmptyStatus returns defaults', () => {
    expect(createEmptyStatus()).toEqual({
      state: 'uninitialized',
      workspaceRoot: null,
      indexedFileCount: 0,
      totalChunkCount: 0,
      progressPercent: 0,
      lastIndexedAt: null,
      error: null,
    });
  });

  it('createStatusFromIndexResult builds a completed status', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T00:00:00.000Z'));

    const status = createStatusFromIndexResult('ready', '/workspace', {
      indexedChunkCount: 10,
      skippedCount: 2,
      durationMs: 100,
    });

    expect(status).toEqual({
      state: 'ready',
      workspaceRoot: '/workspace',
      indexedFileCount: 8,
      totalChunkCount: 10,
      progressPercent: 100,
      lastIndexedAt: '2026-04-16T00:00:00.000Z',
      error: null,
    });

    vi.useRealTimers();
  });

  it('createStatusFromIndexResult accumulates from previous status', () => {
    const previous = {
      state: 'ready' as const,
      workspaceRoot: '/workspace',
      indexedFileCount: 3,
      totalChunkCount: 5,
      progressPercent: 100,
      lastIndexedAt: '2026-04-15T00:00:00.000Z',
      error: null,
    };

    const status = createStatusFromIndexResult('ready', '/workspace', {
      indexedChunkCount: 4,
      skippedCount: 1,
      durationMs: 100,
    }, previous);

    expect(status.indexedFileCount).toBe(6);
    expect(status.totalChunkCount).toBe(9);
  });

  it('createIndexingStatus preserves previous counts and timestamp', () => {
    const previous = {
      state: 'ready' as const,
      workspaceRoot: '/workspace',
      indexedFileCount: 11,
      totalChunkCount: 20,
      progressPercent: 100,
      lastIndexedAt: '2026-04-15T00:00:00.000Z',
      error: null,
    };

    expect(createIndexingStatus('/workspace', 42, previous)).toEqual({
      state: 'indexing',
      workspaceRoot: '/workspace',
      indexedFileCount: 11,
      totalChunkCount: 20,
      progressPercent: 42,
      lastIndexedAt: '2026-04-15T00:00:00.000Z',
      error: null,
    });
  });

  it('createErrorStatus preserves previous progress context', () => {
    const previous = {
      state: 'indexing' as const,
      workspaceRoot: '/workspace',
      indexedFileCount: 11,
      totalChunkCount: 20,
      progressPercent: 42,
      lastIndexedAt: '2026-04-15T00:00:00.000Z',
      error: null,
    };

    expect(createErrorStatus('/workspace', 'boom', previous)).toEqual({
      state: 'error',
      workspaceRoot: '/workspace',
      indexedFileCount: 11,
      totalChunkCount: 20,
      progressPercent: 0,
      lastIndexedAt: '2026-04-15T00:00:00.000Z',
      error: 'boom',
    });
  });
});
