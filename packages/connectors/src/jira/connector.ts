import { BaseConnector, SyncableConnector } from '../sdk/connector.js';
import type { SyncResult } from '../sdk/connector.js';
import {
  BuiltInConnectorRegistry,
  type HostContext,
} from '../sdk/registry.js';
import { jiraConnectorManifest, jiraFixtures, mapJiraIssueToTask } from './index.js';

export class JiraConnectorImpl extends BaseConnector implements SyncableConnector {
  private connected = false;

  async connect(): Promise<void> {
    this.updateHealth('connecting');
    await new Promise((r) => setTimeout(r, 10));
    this.updateHealth('connected');
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.updateHealth('disconnected');
    this.connected = false;
  }

  async refresh(): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    this.updateHealth('refreshing');
    await new Promise((r) => setTimeout(r, 10));
    this.updateHealth('connected');
  }

  async sync(): Promise<SyncResult> {
    await this.refresh();
    const tasks = jiraFixtures.issues.map(mapJiraIssueToTask);
    return {
      success: true,
      entitiesAdded: tasks.length,
      entitiesUpdated: 0,
      entitiesRemoved: 0,
    };
  }
}

// Factory function for Jira connector
export async function createJiraConnector(_host: HostContext): Promise<JiraConnectorImpl> {
  return new JiraConnectorImpl(jiraConnectorManifest);
}

// Register Jira connector with the built-in registry
BuiltInConnectorRegistry.register({
  manifest: jiraConnectorManifest,
  factory: createJiraConnector,
  lifecycleState: 'installed',
});
