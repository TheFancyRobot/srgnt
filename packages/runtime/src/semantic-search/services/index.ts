/**
 * Semantic search service module.
 *
 * Re-exports all tags, types, and layer constructors for the
 * 7 semantic search services.
 */

export { AppConfigTag, EmbeddingServiceTag, MarkdownChunkerTag, IndexStateStoreTag, VectraStoreTag, WorkspaceIndexerTag, SemanticSearchServiceTag } from './tags.js';
export type { AppConfigService, EmbeddingService, MarkdownChunkerService, IndexStateStoreService, VectraStoreService, WorkspaceIndexerService, SemanticSearchService, DomainError } from './types.js';
export { AppConfigLayer, EmbeddingServiceLayer, MarkdownChunkerLayer, IndexStateStoreLayer, VectraStoreLayer, WorkspaceIndexerLayer, SemanticSearchServiceLayer } from './layers.js';
