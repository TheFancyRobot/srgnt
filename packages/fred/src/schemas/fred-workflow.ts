/**
 * Effect Schema definitions for Fred workflow validation.
 */

import { Schema } from '@effect/schema';

/**
 * Data access scope for workflow steps.
 */
export const SDataAccessScope = Schema.Literal(
  'read',
  'write',
  'admin'
);
export type DataAccessScope = Schema.Schema.Type<typeof SDataAccessScope>;

/**
 * Fred workflow step definition.
 */
export const SFredWorkflowStep = Schema.Struct({
  stepId: Schema.String,
  action: Schema.String,
  dataAccessScope: SDataAccessScope,
  expectedOutput: Schema.String,
});

export type FredWorkflowStep = Schema.Schema.Type<typeof SFredWorkflowStep>;

/**
 * Fred workflow entitlement level.
 */
export const SFredEntitlement = Schema.Literal(
  'free',
  'premium',
  'enterprise'
);
export type FredEntitlement = Schema.Schema.Type<typeof SFredEntitlement>;

/**
 * Fred workflow definition.
 */
export const SFredWorkflowDefinition = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  steps: Schema.Array(SFredWorkflowStep),
  entitlement: SFredEntitlement,
});

export type FredWorkflowDefinition = Schema.Schema.Type<typeof SFredWorkflowDefinition>;

/**
 * Fred workflow execution context.
 */
export const SFredWorkflowContext = Schema.Struct({
  userId: Schema.String,
  userConsent: Schema.Boolean, // required, not optional
  workflowId: Schema.String,
  dataAccessScope: SDataAccessScope,
  parameters: Schema.optionalWith(
    Schema.Record({ key: Schema.String, value: Schema.String }),
    { default: () => ({}) }
  ),
});

export type FredWorkflowContext = Schema.Schema.Type<typeof SFredWorkflowContext>;

/**
 * Fred workflow result.
 */
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
