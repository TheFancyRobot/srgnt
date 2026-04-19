import { Schema } from '@effect/schema';

/**
 * Schema for YAML frontmatter classification metadata references.
 * These are optional fields that sync tooling can use to track classification
 * without requiring earlier phases to add new frontmatter fields.
 */

// Classification metadata embedded in frontmatter for sync tooling reference
export const SFrontmatterClassificationMeta = Schema.Struct({
  // Optional classification hint for sync tooling
  classification: Schema.optional(Schema.String),
  // Optional sync eligibility override
  syncEligibility: Schema.optional(Schema.Literal('syncSafe', 'encryptedOnly', 'localOnly', 'rebuildable')),
  // Whether this file contains sensitive content requiring extra care
  containsSensitiveContent: Schema.optional(Schema.Boolean),
});

export type FrontmatterClassificationMeta = Schema.Schema.Type<typeof SFrontmatterClassificationMeta>;

// Schema for a frontmatter block with classification metadata
export const SFrontmatterBlock = Schema.Struct({
  // Standard frontmatter fields that carry classification info
  title: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  created: Schema.optional(Schema.String),
  updated: Schema.optional(Schema.String),
  // Classification metadata for sync tooling
  srgntClass: Schema.optional(SFrontmatterClassificationMeta),
});

export type FrontmatterBlock = Schema.Schema.Type<typeof SFrontmatterBlock>;
