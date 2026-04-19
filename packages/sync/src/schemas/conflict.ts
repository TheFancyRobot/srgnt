import { Schema } from '@effect/schema';

/**
 * Effect Schema definitions for conflict records and related types.
 */

// Conflict type enum
export const SConflictType = Schema.Literal(
  'frontmatterField',
  'markdownBody',
  'fileDeleted',
  'fileCreatedBoth'
);
export type ConflictType = Schema.Schema.Type<typeof SConflictType>;

// Merge strategy enum
export const SMergeStrategy = Schema.Literal(
  'lastWriteWins',
  'fieldLevelMerge',
  'manualResolution'
);
export type MergeStrategy = Schema.Schema.Type<typeof SMergeStrategy>;

// Version info schema
export const SVersionInfo = Schema.Struct({
  id: Schema.String,
  lastModified: Schema.String,
  deviceId: Schema.String,
  contentHash: Schema.String,
  frontmatter: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  body: Schema.optional(Schema.String),
});

export type VersionInfo = Schema.Schema.Type<typeof SVersionInfo>;

// Conflict record schema
export const SConflictRecord = Schema.Struct({
  entityId: Schema.String,
  conflictType: SConflictType,
  localVersion: SVersionInfo,
  remoteVersion: SVersionInfo,
  resolution: Schema.optional(Schema.Literal('pending', 'local', 'remote', 'merged')),
  detectedAt: Schema.String,
  resolvedAt: Schema.optional(Schema.String),
  resolvedBy: Schema.optional(Schema.String),
});

export type ConflictRecord = Schema.Schema.Type<typeof SConflictRecord>;

// Merge result schema
export const SMergeResult = Schema.Struct({
  success: Schema.Boolean,
  mergedContent: Schema.optional(Schema.String),
  mergedFrontmatter: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  error: Schema.optional(Schema.String),
  requiresManualResolution: Schema.Boolean,
});

export type MergeResult = Schema.Schema.Type<typeof SMergeResult>;
