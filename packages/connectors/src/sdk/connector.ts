import type { ConnectorManifest, ConnectorSession, ConnectorHealth } from '@srgnt/contracts';

export interface Connector {
  getManifest(): ConnectorManifest;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getHealth(): ConnectorHealth;
  isConnected(): boolean;
}

export abstract class BaseConnector implements Connector {
  protected manifest: ConnectorManifest;
  protected session?: ConnectorSession;
  protected health: ConnectorHealth;

  constructor(manifest: ConnectorManifest) {
    this.manifest = manifest;
    this.health = {
      status: 'disconnected',
      entityCounts: {},
    };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract refresh(): Promise<void>;

  getManifest(): ConnectorManifest {
    return this.manifest;
  }

  getHealth(): ConnectorHealth {
    return this.health;
  }

  isConnected(): boolean {
    return this.health.status === 'connected';
  }

  protected updateHealth(status: ConnectorHealth['status'], error?: string): void {
    this.health = {
      ...this.health,
      status,
      lastError: error,
      lastSyncAt: status === 'connected' ? new Date().toISOString() : this.health.lastSyncAt,
    };
  }
}

export interface ConnectorConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface SyncResult {
  success: boolean;
  entitiesAdded: number;
  entitiesUpdated: number;
  entitiesRemoved: number;
  error?: string;
}

export abstract class SyncableConnector extends BaseConnector {
  abstract sync(): Promise<SyncResult>;
}
