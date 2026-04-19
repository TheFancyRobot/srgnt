/**
 * Effect service tags for the semantic search subsystem.
 *
 * Each tag identifies a service boundary. Implementations are provided
 * via Layer constructors in layers.ts and wired by consumers in Phase 17.
 */

import { Context } from 'effect';

// --- AppConfig ---

export class AppConfigTag extends Context.Tag('srgnt/AppConfig')<
  AppConfigTag,
  import('./types.js').AppConfigService
>() {}

// --- EmbeddingService ---

export class EmbeddingServiceTag extends Context.Tag('srgnt/EmbeddingService')<
  EmbeddingServiceTag,
  import('./types.js').EmbeddingService
>() {}

// --- MarkdownChunker ---

export class MarkdownChunkerTag extends Context.Tag('srgnt/MarkdownChunker')<
  MarkdownChunkerTag,
  import('./types.js').MarkdownChunkerService
>() {}

// --- IndexStateStore ---

export class IndexStateStoreTag extends Context.Tag('srgnt/IndexStateStore')<
  IndexStateStoreTag,
  import('./types.js').IndexStateStoreService
>() {}

// --- VectraStore ---

export class VectraStoreTag extends Context.Tag('srgnt/VectraStore')<
  VectraStoreTag,
  import('./types.js').VectraStoreService
>() {}

// --- WorkspaceIndexer ---

export class WorkspaceIndexerTag extends Context.Tag('srgnt/WorkspaceIndexer')<
  WorkspaceIndexerTag,
  import('./types.js').WorkspaceIndexerService
>() {}

// --- SemanticSearchService (public API) ---

export class SemanticSearchServiceTag extends Context.Tag('srgnt/SemanticSearchService')<
  SemanticSearchServiceTag,
  import('./types.js').SemanticSearchService
>() {}
