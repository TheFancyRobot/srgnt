/**
 * Fred data accessor interface - defines the contract for scoped data access
 * within the Fred system. Fred never receives raw full workspace access;
 * all data operations are mediated through minimized payloads.
 *
 * This interface enforces the principle of least privilege: callers receive
 * only the metadata needed to operate, never the actual content.
 */

import { Schema } from '@effect/schema';

/**
 * Data access scope levels - controls what data a Fred operation can access.
 */
export type DataAccessScope = 'read' | 'write' | 'admin';

/**
 * Request-scoped context declaration for Fred payload assembly.
 * Describes exactly which entity and fields may be considered.
 */
export interface FredRequestContext {
  // Requested access scope for the workflow
  scope: DataAccessScope;
  // Target entity or aggregate identifier
  entityId: string;
  // Explicit field allow-list for minimization
  fields: string[];
  // Optional justification shown in audit trails
  rationale?: string;
}

/**
 * Minimized payload - metadata-only representation of a data entity.
 * Never contains raw workspace content; only identifiers and checksums.
 */
export interface MinimizedPayload {
  // Unique entity identifier
  id: string;
  // Entity type (e.g., 'markdown-file', 'run-history')
  type: string;
  // Size in bytes (metadata only, not content size)
  size: number;
  // Integrity checksum for verification
  checksum: string;
  // Explicitly approved fields included in the payload
  fields: string[];
}

/**
 * IFredDataAccessor - Scoped data access interface for Fred operations.
 *
 * Fred operates in a restricted boundary:
 * - Never receives raw full workspace access
 * - All data is accessed through minimized payloads
 * - Scope determines the level of access (read < write < admin)
 * - Access is request-scoped and classification-aware
 */
export interface IFredDataAccessor {
  /**
   * Request context for a specific workflow.
   * Implementations must validate scope, consent, and classification boundaries.
   */
  requestContext(context: FredRequestContext): Promise<FredRequestContext>;

  /**
   * Build the minimized payload for an approved request context.
   * Returns the Fred-safe payload with redaction already applied.
   */
  getMinimizedPayload(context: FredRequestContext): Promise<MinimizedPayload>;
}

// Effect Schema for runtime validation

/**
 * Schema for DataAccessScope.
 */
export const SDataAccessScope = Schema.Literal('read', 'write', 'admin');

/**
 * Schema for FredRequestContext.
 */
export const SFredRequestContext = Schema.Struct({
  scope: SDataAccessScope,
  entityId: Schema.String,
  fields: Schema.Array(Schema.String),
  rationale: Schema.optionalWith(Schema.String, { default: () => '' }),
});

/**
 * Schema for MinimizedPayload.
 */
export const SMinimizedPayload = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  size: Schema.Number,
  checksum: Schema.String,
  fields: Schema.Array(Schema.String),
});