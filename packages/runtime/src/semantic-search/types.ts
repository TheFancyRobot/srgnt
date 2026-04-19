import { Schema } from '@effect/schema';

// --- Chunk Metadata ---

export const SChunkMetadata = Schema.Struct({
  id: Schema.String,
  workspaceRelativePath: Schema.String,
  fileName: Schema.String,
  title: Schema.String,
  headingPath: Schema.Array(Schema.String),
  chunkIndex: Schema.Number,
  chunkText: Schema.String,
  wikilinks: Schema.Array(Schema.String),
  mtimeMs: Schema.Number,
  contentHash: Schema.String,
  modelId: Schema.String,
});
export type ChunkMetadata = Schema.Schema.Type<typeof SChunkMetadata>;

// --- Search Result ---

export const SSearchResult = Schema.Struct({
  score: Schema.Number,
  chunk: SChunkMetadata,
  snippet: Schema.String,
});
export type SearchResult = Schema.Schema.Type<typeof SSearchResult>;

// --- Index Status ---

export const SIndexStatus = Schema.Struct({
  isIndexed: Schema.Boolean,
  chunkCount: Schema.Number,
  lastIndexedAt: Schema.optional(Schema.String),
  modelId: Schema.optional(Schema.String),
});
export type IndexStatus = Schema.Schema.Type<typeof SIndexStatus>;

// --- Feature State ---

export const SFeatureState = Schema.Literal('uninitialized', 'initializing', 'ready', 'indexing', 'disabled', 'error');
export type FeatureState = Schema.Schema.Type<typeof SFeatureState>;

// --- Index Manifest ---

export const SIndexManifest = Schema.Struct({
  modelId: Schema.String,
  version: Schema.String,
  chunkIds: Schema.Array(Schema.String),
  contentHashes: Schema.Array(Schema.String),
});
export type IndexManifest = Schema.Schema.Type<typeof SIndexManifest>;

// --- Search Options ---

export const SSearchOptions = Schema.Struct({
  query: Schema.String,
  maxResults: Schema.optionalWith(Schema.Number, { default: () => 10 }),
  minScore: Schema.optionalWith(Schema.Number, { default: () => 0.5 }),
});
export type SearchOptions = Schema.Schema.Type<typeof SSearchOptions>;
