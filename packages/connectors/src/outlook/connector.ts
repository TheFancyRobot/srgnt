import { BaseConnector, SyncableConnector } from '../sdk/connector.js';
import type { SyncResult } from '../sdk/connector.js';
import {
  BuiltInConnectorRegistry,
  type HostContext,
} from '../sdk/registry.js';
import { outlookConnectorManifest, outlookFixtures, mapOutlookEventToEvent } from './index.js';

export class OutlookConnectorImpl extends BaseConnector implements SyncableConnector {
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
    const events = outlookFixtures.events.map(mapOutlookEventToEvent);
    return {
      success: true,
      entitiesAdded: events.length,
      entitiesUpdated: 0,
      entitiesRemoved: 0,
    };
  }
}

// Factory function for Outlook connector
export async function createOutlookConnector(_host: HostContext): Promise<OutlookConnectorImpl> {
  return new OutlookConnectorImpl(outlookConnectorManifest);
}

// Register Outlook connector with the built-in registry
BuiltInConnectorRegistry.register({
  manifest: outlookConnectorManifest,
  factory: createOutlookConnector,
  lifecycleState: 'installed',
});
