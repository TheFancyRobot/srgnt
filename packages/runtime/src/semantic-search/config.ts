import { Schema } from '@effect/schema';

const defaultSemanticSearchExclusions = ['.agent-vault', '.command-center', '.srgnt-semantic-search'];

export const SemanticSearchConfigSchema = Schema.Struct({
  workspaceRoot: Schema.String,
  indexRoot: Schema.String,
  modelAssetPath: Schema.String,
  chunkSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), { default: () => 1000 }),
  overlap: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.nonNegative()), { default: () => 200 }),
  batchSize: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), { default: () => 32 }),
  exclusions: Schema.optionalWith(Schema.Array(Schema.String), { default: () => defaultSemanticSearchExclusions }),
});

export type SemanticSearchConfig = Schema.Schema.Type<typeof SemanticSearchConfigSchema>;

export const CorpusPolicyConfigSchema = Schema.Struct({
  workspaceRoot: Schema.String,
  exclusions: Schema.optionalWith(Schema.Array(Schema.String), { default: () => defaultSemanticSearchExclusions }),
  maxFileSizeBytes: Schema.optionalWith(Schema.Number.pipe(Schema.int(), Schema.positive()), { default: () => 5 * 1024 * 1024 }),
  acceptedExtensions: Schema.optionalWith(Schema.Array(Schema.String), { default: () => ['.md', '.markdown'] }),
});

export type CorpusPolicyConfig = Schema.Schema.Type<typeof CorpusPolicyConfigSchema>;
