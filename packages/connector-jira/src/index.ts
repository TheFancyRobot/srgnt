// Jira connector package — Phase 20 compatible { manifest, runtime, factory } shape

// Re-export data layer
export { jiraFixtures, loadJiraFixtures, mapJiraIssueToTask, mapJiraPersonToPerson } from './data.js';
export { jiraConnectorManifest } from './data.js';
export type { JiraIssue, JiraFixture } from './data.js';

// Re-export connector implementation
export { JiraConnectorImpl, createJiraConnector } from './connector.js';

// Phase 20 package runtime shape
import type { ConnectorPackageRuntime } from '@srgnt/contracts';
import type { ConnectorPackage } from '@srgnt/connectors';
import { createJiraConnector } from './connector.js';
import { jiraConnectorManifest } from './data.js';

export const jiraConnectorRuntime: ConnectorPackageRuntime = {
  sdkVersion: '1.0.0',
  minHostVersion: '1.0.0',
  entrypoint: 'createJiraConnector',
  capabilities: ['http.fetch', 'logger', 'crypto.randomUUID', 'workspace.root'],
  executionModel: 'worker', // DEC-0016: external packages use worker
};

export const jiraConnectorPackage: ConnectorPackage = {
  manifest: jiraConnectorManifest,
  factory: createJiraConnector,
  runtime: jiraConnectorRuntime,
};

// Named aliases for backwards compatibility with existing test imports
export const factory = createJiraConnector;
export const manifest = jiraConnectorManifest;
export const runtime = jiraConnectorRuntime;

export default jiraConnectorPackage;
