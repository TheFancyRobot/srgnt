export {
  CorpusPolicyError,
  SemanticSearchError,
  ConfigurationError,
  ModelAssetError,
  IndexCorruptionError,
  CrawlPolicyViolationError,
  UnsupportedFileError,
  type SemanticSearchDomainError,
} from './errors.js';

export {
  SemanticSearchConfigSchema,
  type SemanticSearchConfig,
  CorpusPolicyConfigSchema,
  type CorpusPolicyConfig,
} from './config.js';

export {
  SChunkMetadata,
  type ChunkMetadata,
  SSearchResult,
  type SearchResult,
  SIndexStatus,
  type IndexStatus,
  SFeatureState,
  type FeatureState,
  SIndexManifest,
  type IndexManifest,
  SSearchOptions,
  type SearchOptions,
} from './types.js';

export {
  makeCorpusPolicyConfig,
  isExcludedPath,
  collectCorpusFiles,
  realFilesystem,
  type CorpusFile,
  type FilesystemClient,
} from './corpus-policy.js';

export {
  validateModelDirectory,
  createEmbeddingPipeline,
  embedText,
  embedBatch,
  EXPECTED_EMBEDDING_DIMENSION,
  DEFAULT_MODEL_ID,
  type EmbeddingServiceConfig,
  type EmbeddingResult,
} from './embedding-service.js';

export {
  parseFrontmatter,
  splitByHeadings,
  chunkOversizedSections,
  extractWikilinks,
  computeContentHash,
  chunkFile,
  type FrontmatterResult,
  type HeadingSection,
  type ChunkInput,
  type ChunkOptions,
  type TextChunk,
} from './markdown-chunker.js';

// --- Effect Service Tags, Types, and Layers ---

export {
  AppConfigTag,
  EmbeddingServiceTag,
  MarkdownChunkerTag,
  IndexStateStoreTag,
  VectraStoreTag,
  WorkspaceIndexerTag,
  SemanticSearchServiceTag,
  AppConfigLayer,
  EmbeddingServiceLayer,
  MarkdownChunkerLayer,
  IndexStateStoreLayer,
  VectraStoreLayer,
  WorkspaceIndexerLayer,
  SemanticSearchServiceLayer,
  type AppConfigService,
  type EmbeddingService,
  type MarkdownChunkerService,
  type IndexStateStoreService,
  type VectraStoreService,
  type WorkspaceIndexerService,
  type SemanticSearchService,
  type DomainError,
} from './services/index.js';
