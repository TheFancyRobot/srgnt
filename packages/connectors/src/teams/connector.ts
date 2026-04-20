import { BaseConnector, SyncableConnector } from '../sdk/connector.js';
import type { SyncResult } from '../sdk/connector.js';
import {
  BuiltInConnectorRegistry,
  type HostContext,
} from '../sdk/registry.js';
import { teamsConnectorManifest, teamsFixtures, mapTeamsMessageToMessage } from './index.js';

export class TeamsConnectorImpl extends BaseConnector implements SyncableConnector {
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
    const messages = teamsFixtures.messages.map(mapTeamsMessageToMessage);
    return {
      success: true,
      entitiesAdded: messages.length,
      entitiesUpdated: 0,
      entitiesRemoved: 0,
    };
  }
}

// Factory function for Teams connector
export async function createTeamsConnector(_host: HostContext): Promise<TeamsConnectorImpl> {
  return new TeamsConnectorImpl(teamsConnectorManifest);
}

// Register Teams connector with the built-in registry
BuiltInConnectorRegistry.register({
  manifest: teamsConnectorManifest,
  factory: createTeamsConnector,
  lifecycleState: 'installed',
});
