/**
 * Semantic search status tracking for UI integration.
 *
 * Tracks extended status information beyond the basic FeatureState:
 * - state: overall feature state
 * - workspaceRoot: currently configured workspace
 * - indexedFileCount: number of files indexed
 * - totalChunkCount: total chunks across all files
 * - progressPercent: indexing progress (0-100)
 * - lastIndexedAt: ISO timestamp of last indexing completion
 * - error: error message if state is 'error'
 */

import type { FeatureState } from './host.js';

export interface SemanticSearchStatus {
  readonly state: FeatureState;
  readonly workspaceRoot: string | null;
  readonly indexedFileCount: number;
  readonly totalChunkCount: number;
  readonly progressPercent: number;
  readonly lastIndexedAt: string | null;
  readonly error: string | null;
}

export interface SemanticSearchEnabledState {
  readonly isEnabled: boolean;
  readonly workspaceRoot: string | null;
}

/**
 * Create a new empty status with defaults.
 */
export function createEmptyStatus(): SemanticSearchStatus {
  return {
    state: 'uninitialized',
    workspaceRoot: null,
    indexedFileCount: 0,
    totalChunkCount: 0,
    progressPercent: 0,
    lastIndexedAt: null,
    error: null,
  };
}

/**
 * Create a status from basic host state and index result.
 */
export function createStatusFromIndexResult(
  baseState: FeatureState,
  workspaceRoot: string | null,
  result: { indexedChunkCount: number; skippedCount: number; durationMs: number },
  previousStatus?: SemanticSearchStatus,
): SemanticSearchStatus {
  return {
    state: baseState,
    workspaceRoot,
    indexedFileCount: previousStatus
      ? previousStatus.indexedFileCount + result.indexedChunkCount - result.skippedCount
      : result.indexedChunkCount - result.skippedCount,
    totalChunkCount: previousStatus
      ? previousStatus.totalChunkCount + result.indexedChunkCount
      : result.indexedChunkCount,
    progressPercent: 100,
    lastIndexedAt: new Date().toISOString(),
    error: baseState === 'error' ? 'Indexing failed' : null,
  };
}

/**
 * Create a status during indexing with progress.
 */
export function createIndexingStatus(
  workspaceRoot: string | null,
  progressPercent: number,
  previousStatus?: SemanticSearchStatus,
): SemanticSearchStatus {
  return {
    state: 'indexing',
    workspaceRoot,
    indexedFileCount: previousStatus?.indexedFileCount ?? 0,
    totalChunkCount: previousStatus?.totalChunkCount ?? 0,
    progressPercent,
    lastIndexedAt: previousStatus?.lastIndexedAt ?? null,
    error: null,
  };
}

/**
 * Create an error status.
 */
export function createErrorStatus(
  workspaceRoot: string | null,
  errorMessage: string,
  previousStatus?: SemanticSearchStatus,
): SemanticSearchStatus {
  return {
    state: 'error',
    workspaceRoot,
    indexedFileCount: previousStatus?.indexedFileCount ?? 0,
    totalChunkCount: previousStatus?.totalChunkCount ?? 0,
    progressPercent: 0,
    lastIndexedAt: previousStatus?.lastIndexedAt ?? null,
    error: errorMessage,
  };
}
