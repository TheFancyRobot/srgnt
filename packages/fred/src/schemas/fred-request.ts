import { Schema } from '@effect/schema';

/**
 * Effect Schema definitions for Fred workflow request/response validation.
 */

// Data access scope enum
export const SDataAccessScope = Schema.Literal(
  'read',
  'write',
  'admin'
);
export type DataAccessScope = Schema.Schema.Type<typeof SDataAccessScope>;

// Minimized payload schema
export const SMinimizedPayload = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  size: Schema.Number,
  checksum: Schema.String,
  fields: Schema.Array(Schema.String),
});

export type MinimizedPayload = Schema.Schema.Type<typeof SMinimizedPayload>;

// Fred workflow request schema
export const SFredWorkflowRequest = Schema.Struct({
  workflowId: Schema.String,
  userId: Schema.String,
  userConsent: Schema.Boolean, // required, not optional
  dataAccessScope: SDataAccessScope,
  resourceId: Schema.optionalWith(Schema.String, { default: () => '' }),
  minimizedPayload: Schema.optionalWith(SMinimizedPayload, { default: () => ({ id: '', type: '', size: 0, checksum: '', fields: [] }) }),
  dryRun: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  timeoutMs: Schema.optionalWith(Schema.Number, { default: () => 30000 }),
});

export type FredWorkflowRequest = Schema.Schema.Type<typeof SFredWorkflowRequest>;

// Fred workflow result schema
export const SFredWorkflowResult = Schema.Struct({
  result: Schema.String,
  confidence: Schema.Number,
  artifacts: Schema.optionalWith(
    Schema.Array(Schema.String),
    { default: () => [] }
  ),
  executionTimeMs: Schema.Number,
  status: Schema.Literal('success', 'partial', 'failed'),
  errorMessage: Schema.optionalWith(Schema.String, { default: () => '' }),
});

export type FredWorkflowResult = Schema.Schema.Type<typeof SFredWorkflowResult>;
