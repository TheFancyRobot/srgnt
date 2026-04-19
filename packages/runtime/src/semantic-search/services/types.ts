/**
 * Service interface types for the semantic search subsystem.
 *
 * These define the method signatures each service must implement.
 * Actual implementations come in Steps 02-05 of Phase 16.
 */

import type { Effect } from 'effect';
import type {
  SemanticSearchConfig,
  CorpusPolicyConfig,
} from '../config.js';
import type {
  ChunkMetadata,
  SearchResult,
  IndexStatus,
  FeatureState,
  IndexManifest,
  SearchOptions,
} from '../types.js';
import type {
  SemanticSearchError,
  ConfigurationError,
  ModelAssetError,
  IndexCorruptionError,
  CrawlPolicyViolationError,
  UnsupportedFileError,
} from '../errors.js';
import type {
  ChunkInput,
  ChunkOptions,
} from '../markdown-chunker.js';
import type { EmbeddingResult } from '../embedding-service.js';

// Domain error union for convenience
export type DomainError =
  | SemanticSearchError
  | ConfigurationError
  | ModelAssetError
  | IndexCorruptionError
  | CrawlPolicyViolationError
  | UnsupportedFileError;

// --- AppConfig Service ---

export interface AppConfigService {
  /** Get the current semantic search configuration */
  readonly getConfig: () => Effect.Effect<SemanticSearchConfig, ConfigurationError>;

  /** Get the corpus policy configuration derived from app config */
  readonly getCorpusPolicyConfig: () => Effect.Effect<CorpusPolicyConfig, ConfigurationError>;
}

// --- EmbeddingService ---

export interface EmbeddingService {
  /** Initialize the embedding pipeline (lazy, idempotent) */
  readonly initialize: () => Effect.Effect<void, ModelAssetError>;

  /** Generate an embedding for a single text */
  readonly embedText: (text: string) => Effect.Effect<EmbeddingResult, ModelAssetError>;

  /** Generate embeddings for multiple texts in batch */
  readonly embedBatch: (texts: string[]) => Effect.Effect<EmbeddingResult[], ModelAssetError>;

  /** Shut down the embedding pipeline and free resources */
  readonly dispose: () => Effect.Effect<void, never>;
}

// --- MarkdownChunkerService ---

export interface MarkdownChunkerService {
  /** Chunk a single file's content into text chunks */
  readonly chunkFile: (
    input: ChunkInput,
    options: ChunkOptions,
  ) => Effect.Effect<ChunkMetadata[], UnsupportedFileError>;

  /** Chunk multiple files in sequence */
  readonly chunkFiles: (
    inputs: ChunkInput[],
    options: ChunkOptions,
  ) => Effect.Effect<ChunkMetadata[], UnsupportedFileError>;
}

// --- IndexStateStoreService ---

export interface IndexStateStoreService {
  /** Load the index manifest for a workspace */
  readonly loadManifest: (
    workspaceRoot: string,
  ) => Effect.Effect<IndexManifest | null, IndexCorruptionError>;

  /** Save the index manifest for a workspace */
  readonly saveManifest: (
    workspaceRoot: string,
    manifest: IndexManifest,
  ) => Effect.Effect<void, IndexCorruptionError>;

  /** Get the indexing status for a specific file */
  readonly getFileStatus: (
    workspaceRoot: string,
    relativePath: string,
  ) => Effect.Effect<IndexStatus, never>;

  /** Remove entries for a specific file from the manifest */
  readonly removeFile: (
    workspaceRoot: string,
    relativePath: string,
  ) => Effect.Effect<void, IndexCorruptionError>;

  /** Clear the entire manifest (used during rebuilds) */
  readonly clearManifest: (
    workspaceRoot: string,
  ) => Effect.Effect<void, IndexCorruptionError>;
}

// --- VectraStoreService ---

export interface VectraStoreService {
  /** Initialize or open the Vectra index for a workspace */
  readonly openIndex: (
    indexRoot: string,
  ) => Effect.Effect<void, IndexCorruptionError>;

  /** Add chunks with embeddings to the index */
  readonly addItems: (
    items: Array<{
      chunk: ChunkMetadata;
      embedding: number[];
    }>,
  ) => Effect.Effect<void, IndexCorruptionError>;

  /** Query the index for similar chunks */
  readonly query: (
    embedding: number[],
    options: SearchOptions,
  ) => Effect.Effect<SearchResult[], IndexCorruptionError>;

  /** Remove items by metadata filter */
  readonly removeByPath: (
    workspaceRelativePath: string,
  ) => Effect.Effect<void, IndexCorruptionError>;

  /** Delete the entire Vectra index from disk */
  readonly clearIndex: () => Effect.Effect<void, IndexCorruptionError>;

  /** Close and dispose the Vectra index */
  readonly dispose: () => Effect.Effect<void, never>;
}

// --- WorkspaceIndexerService ---

export interface WorkspaceIndexerService {
  /** Run a full initial index of the workspace */
  readonly indexWorkspace: () => Effect.Effect<
    { filesProcessed: number; chunksCreated: number },
    DomainError
  >;

  /** Reindex a single file */
  readonly reindexFile: (
    relativePath: string,
  ) => Effect.Effect<{ chunksCreated: number }, DomainError>;

  /** Remove a file from the index */
  readonly removeFile: (
    relativePath: string,
  ) => Effect.Effect<void, DomainError>;

  /** Rebuild the entire index from scratch */
  readonly rebuildAll: () => Effect.Effect<
    { filesProcessed: number; chunksCreated: number },
    DomainError
  >;
}

// --- SemanticSearchService (public API) ---

export interface SemanticSearchService {
  /** Initialize the semantic search subsystem for the configured workspace */
  readonly init: () => Effect.Effect<void, DomainError>;

  /** Run a full workspace index */
  readonly indexWorkspace: () => Effect.Effect<
    { filesProcessed: number; chunksCreated: number },
    DomainError
  >;

  /** Reindex a single file */
  readonly reindexFile: (
    relativePath: string,
  ) => Effect.Effect<{ chunksCreated: number }, DomainError>;

  /** Remove a file from the index */
  readonly removeFile: (
    relativePath: string,
  ) => Effect.Effect<void, DomainError>;

  /** Rebuild the entire index */
  readonly rebuildAll: () => Effect.Effect<
    { filesProcessed: number; chunksCreated: number },
    DomainError
  >;

  /** Search the index */
  readonly search: (
    query: string,
    options?: Partial<SearchOptions>,
  ) => Effect.Effect<SearchResult[], DomainError>;

  /** Get the current feature state */
  readonly getFeatureState: () => Effect.Effect<FeatureState, never>;
}
