import { Schema } from '@effect/schema';

// --- Corpus Policy Error (plain Error, used in sync/filtering contexts) ---

export class CorpusPolicyError extends Error {
  constructor(
    message: string,
    public readonly cause?: 'permission-denied' | 'not-a-directory' | 'invalid-path' | 'symlink-rejected' | 'unknown'
  ) {
    super(message);
    this.name = 'CorpusPolicyError';
  }
}

// --- Semantic Search Error hierarchy (Effect TaggedError) ---

export class SemanticSearchError extends Schema.TaggedError<SemanticSearchError>()(
  'SemanticSearchError',
  { message: Schema.String },
) {}

export class ConfigurationError extends Schema.TaggedError<ConfigurationError>()(
  'ConfigurationError',
  { message: Schema.String, field: Schema.optional(Schema.String) },
) {}

export class ModelAssetError extends Schema.TaggedError<ModelAssetError>()(
  'ModelAssetError',
  { message: Schema.String, assetPath: Schema.optional(Schema.String) },
) {}

export class IndexCorruptionError extends Schema.TaggedError<IndexCorruptionError>()(
  'IndexCorruptionError',
  { message: Schema.String, manifestPath: Schema.optional(Schema.String) },
) {}

export class CrawlPolicyViolationError extends Schema.TaggedError<CrawlPolicyViolationError>()(
  'CrawlPolicyViolationError',
  { message: Schema.String, violatedPath: Schema.optional(Schema.String), reason: Schema.optional(Schema.String) },
) {}

export class UnsupportedFileError extends Schema.TaggedError<UnsupportedFileError>()(
  'UnsupportedFileError',
  { message: Schema.String, filePath: Schema.optional(Schema.String), extension: Schema.optional(Schema.String) },
) {}

// Convenience type for any semantic-search domain error
export type SemanticSearchDomainError =
  | SemanticSearchError
  | ConfigurationError
  | ModelAssetError
  | IndexCorruptionError
  | CrawlPolicyViolationError
  | UnsupportedFileError;
