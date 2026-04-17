/**
 * Fred orchestrator interface - defines the contract for workflow invocation
 * and entitlement checking without direct workspace access.
 *
 * Fred operates in a restricted boundary: it receives minimized payloads,
 * never raw file content, and all operations require explicit user consent.
 */

import { Schema } from '@effect/schema';

/**
 * Workflow definition describing an available Fred workflow.
 */
export interface FredWorkflowDefinition {
  // Unique workflow identifier
  workflowId: string;
  // Human-readable workflow name
  name: string;
  // Workflow description
  description: string;
  // Required data access scope for this workflow
  requiredScope: 'read' | 'write' | 'admin';
  // Whether this workflow requires explicit user consent
  requiresConsent: boolean;
  // Maximum execution timeout in milliseconds
  timeoutMs: number;
}

/**
 * Fred workflow request - all operations require user consent.
 */
export interface FredWorkflowRequest {
  // Workflow identifier to invoke
  workflowId: string;
  // User initiating the workflow
  userId: string;
  // User consent flag - required, not optional
  userConsent: boolean;
  // Requested data access scope
  dataAccessScope: 'read' | 'write' | 'admin';
  // Optional resource identifier
  resourceId?: string;
  // Optional minimized payload (checksummed, not raw content)
  minimizedPayload?: {
    id: string;
    type: string;
    size: number;
    checksum: string;
  };
  // Dry run mode (no side effects)
  dryRun?: boolean;
  // Execution timeout override
  timeoutMs?: number;
}

/**
 * Fred workflow result containing operation outcome.
 */
export interface FredWorkflowResult {
  // Result description or serialized output
  result: string;
  // Confidence score (0-1)
  confidence: number;
  // List of artifact identifiers produced
  artifacts: string[];
  // Execution time in milliseconds
  executionTimeMs: number;
  // Result status
  status: 'success' | 'partial' | 'failed';
  // Error message if failed
  errorMessage?: string;
}

// Effect Schema for runtime validation

/**
 * Schema for FredWorkflowDefinition.
 */
export const SFredWorkflowDefinition = Schema.Struct({
  workflowId: Schema.String,
  name: Schema.String,
  description: Schema.String,
  requiredScope: Schema.Literal('read', 'write', 'admin'),
  requiresConsent: Schema.Boolean,
  timeoutMs: Schema.Number,
});

/**
 * Schema for FredWorkflowRequest.
 * userConsent is required (not optional).
 */
export const SFredWorkflowRequest = Schema.Struct({
  workflowId: Schema.String,
  userId: Schema.String,
  userConsent: Schema.Boolean, // required - not optional
  dataAccessScope: Schema.Literal('read', 'write', 'admin'),
  resourceId: Schema.optionalWith(Schema.String, { default: () => '' }),
  minimizedPayload: Schema.optionalWith(
    Schema.Struct({
      id: Schema.String,
      type: Schema.String,
      size: Schema.Number,
      checksum: Schema.String,
    }),
    { default: () => ({ id: '', type: '', size: 0, checksum: '' }) }
  ),
  dryRun: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  timeoutMs: Schema.optionalWith(Schema.Number, { default: () => 30000 }),
});

/**
 * Schema for FredWorkflowResult.
 */
export const SFredWorkflowResult = Schema.Struct({
  result: Schema.String,
  confidence: Schema.Number,
  artifacts: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  executionTimeMs: Schema.Number,
  status: Schema.Literal('success', 'partial', 'failed'),
  errorMessage: Schema.optionalWith(Schema.String, { default: () => '' }),
});

/**
 * IFredOrchestrator - Fred workflow orchestration interface.
 *
 * Fred operates within a strict boundary:
 * - Never receives raw workspace content
 * - All operations require explicit user consent
 * - Access is mediated through minimized payloads
 * - Entitlements are checked before every operation
 */
export interface IFredOrchestrator {
  /**
   * Execute a Fred workflow with the given request.
   * User consent must be provided - workflows without consent are rejected.
   */
  executeWorkflow(request: FredWorkflowRequest): Promise<FredWorkflowResult>;

  /**
   * Get list of all available workflows for the current context.
   */
  getAvailableWorkflows(): FredWorkflowDefinition[];

  /**
   * Return the current Fred connection status.
   */
  getStatus(): 'available' | 'degraded' | 'offline';
}
