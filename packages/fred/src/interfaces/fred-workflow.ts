/**
 * Fred workflow interface - defines the contract for Fred premium workflow operations.
 */

import type { FredWorkflowDefinition } from '../schemas/fred-workflow.js';

/**
 * IFredWorkflow - Core Fred workflow operations interface.
 */
export interface IFredWorkflow {
  /**
   * Get the definition for a specific workflow.
   */
  getDefinition(workflowId: string): FredWorkflowDefinition;

  /**
   * Execute a workflow with the given context.
   * Returns the workflow result including artifacts and execution metadata.
   */
  execute(
    workflowId: string,
    context: Record<string, unknown>
  ): Promise<FredWorkflowResult>;

  /**
   * List all available workflows for the current user.
   * Returns only workflows the user is entitled to access.
   */
  listAvailableWorkflows(): FredWorkflowDefinition[];
}

/**
 * Result of a workflow execution.
 */
export interface FredWorkflowResult {
  result: string;
  confidence: number;
  artifacts: string[];
  executionTimeMs: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}
