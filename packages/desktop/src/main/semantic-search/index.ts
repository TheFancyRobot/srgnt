/**
 * Semantic search module re-exports.
 */

export {
  createSemanticSearchHost,
  type SemanticSearchHost,
  type FeatureState,
} from './host.js';

export {
  type WorkerConfig,
  type WorkerMessage,
  type SearchResultItem,
  type IndexResult,
  type RebuildResult,
} from './types.js';

export {
  type SemanticSearchStatus,
  type SemanticSearchEnabledState,
  createEmptyStatus,
  createStatusFromIndexResult,
  createIndexingStatus,
  createErrorStatus,
} from './status.js';

export {
  WorkspaceWatcher,
  createWorkspaceWatcher,
  type WorkspaceWatcherOptions,
} from './workspace-watcher.js';
