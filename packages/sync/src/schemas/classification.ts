import { Schema } from '@effect/schema';

/**
 * Data classification levels aligned with product security requirements.
 */
export const SDataClassification = Schema.Literal('public', 'internal', 'confidential', 'secret');
export type DataClassification = Schema.Schema.Type<typeof SDataClassification>;

/**
 * Sync eligibility determines whether and how a data class can be synchronized.
 */
export const SSyncEligibility = Schema.Literal('syncSafe', 'encryptedOnly', 'localOnly', 'rebuildable');
export type SyncEligibility = Schema.Schema.Type<typeof SSyncEligibility>;

/**
 * Storage format for a data class.
 */
export const SStorageFormat = Schema.Literal(
  'markdown-file',
  'yaml-frontmatter',
  'json-structured',
  'derived-index',
  'secure-storage',
  'log-file',
  'binary-cache'
);
export type StorageFormat = Schema.Schema.Type<typeof SStorageFormat>;

/**
 * Whether a data class is the authoritative source or derived/rebuildable.
 */
export const SAuthoritative = Schema.Literal('authoritative', 'derived', 'cache');
export type Authoritative = Schema.Schema.Type<typeof SAuthoritative>;

/**
 * Schema for a single entry in the data classification matrix.
 */
export const SDataClassEntry = Schema.Struct({
  name: Schema.String,
  format: SStorageFormat,
  classification: SDataClassification,
  eligibility: SSyncEligibility,
  authoritative: SAuthoritative,
  rationale: Schema.String,
});

export type DataClassEntry = Schema.Schema.Type<typeof SDataClassEntry>;

/**
 * Full classification matrix as an array of entries.
 */
export const SClassificationMatrix = Schema.Array(SDataClassEntry);
export type ClassificationMatrix = Schema.Schema.Type<typeof SClassificationMatrix>;

/**
 * Classification matrix covering all local data classes in the product.
 * Each entry defines format, sensitivity, sync eligibility, and authority status.
 */
export const classificationMatrix: ClassificationMatrix = [
  {
    name: 'workspace-markdown-files',
    format: 'markdown-file',
    classification: 'internal',
    eligibility: 'syncSafe',
    authoritative: 'authoritative',
    rationale: 'Primary user content stored as markdown. Workspace is the authoritative store.',
  },
  {
    name: 'yaml-frontmatter',
    format: 'yaml-frontmatter',
    classification: 'internal',
    eligibility: 'syncSafe',
    authoritative: 'authoritative',
    rationale: 'Metadata embedded in markdown files. Tied to the file content.',
  },
  {
    name: 'dataview-indexes',
    format: 'derived-index',
    classification: 'internal',
    eligibility: 'rebuildable',
    authoritative: 'derived',
    rationale: 'Derived indexes computed from markdown files. Rebuildable from source markdown.',
  },
  {
    name: 'connector-credentials',
    format: 'secure-storage',
    classification: 'secret',
    eligibility: 'localOnly',
    authoritative: 'authoritative',
    rationale: 'OAuth tokens and API keys stored in OS secure storage. Must never leave device.',
  },
  {
    name: 'crash-logs',
    format: 'log-file',
    classification: 'internal',
    eligibility: 'localOnly',
    authoritative: 'derived',
    rationale: 'Local crash diagnostics. Per telemetry policy (DEC-0012), not synced remotely.',
  },
  {
    name: 'user-settings',
    format: 'json-structured',
    classification: 'internal',
    eligibility: 'syncSafe',
    authoritative: 'authoritative',
    rationale: 'UI preferences, layouts, feature flags. Can sync with encryption at rest.',
  },
  {
    name: 'run-history',
    format: 'json-structured',
    classification: 'internal',
    eligibility: 'encryptedOnly',
    authoritative: 'authoritative',
    rationale: 'Execution metadata for runs. May contain sensitive context, requires encryption.',
  },
  {
    name: 'approval-records',
    format: 'json-structured',
    classification: 'confidential',
    eligibility: 'encryptedOnly',
    authoritative: 'authoritative',
    rationale: 'Human approval decisions for workflow steps. Must be encrypted in transit and at rest.',
  },
  {
    name: 'artifact-cache',
    format: 'binary-cache',
    classification: 'internal',
    eligibility: 'rebuildable',
    authoritative: 'derived',
    rationale: 'Cached generated artifacts. Rebuildable from source content.',
  },
  {
    name: 'connector-install-metadata',
    format: 'json-structured',
    classification: 'internal',
    eligibility: 'syncSafe',
    authoritative: 'authoritative',
    rationale: 'Connector installation state without secrets. Can sync with standard protections.',
  },
  {
    name: 'terminal-session-transcripts',
    format: 'log-file',
    classification: 'confidential',
    eligibility: 'localOnly',
    authoritative: 'derived',
    rationale: 'Session transcripts may contain sensitive command output. Local-only by default.',
  },
  {
    name: 'ai-request-payloads',
    format: 'json-structured',
    classification: 'confidential',
    eligibility: 'encryptedOnly',
    authoritative: 'derived',
    rationale: 'Fred/AI request metadata. May contain sensitive context. Requires encryption.',
  },
];
