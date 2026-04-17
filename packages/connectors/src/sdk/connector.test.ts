import { describe, it, expect, beforeEach } from 'vitest';
import type { ConnectorManifest, ConnectorHealth } from '@srgnt/contracts';
import { BaseConnector, SyncableConnector } from './connector.js';

// --- Test doubles ---

const testManifest: ConnectorManifest = {
  id: 'test-connector',
  name: 'Test Connector',
  version: '1.0.0',
  description: 'A test connector',
  provider: 'test',
  authType: 'none',
  capabilities: [
    { capability: 'read', supportedOperations: ['get'] },
    { capability: 'write', supportedOperations: ['create', 'update'] },
  ],
  entityTypes: ['Task', 'Person'],
  freshnessThresholdMs: 300000,
};

class ConcreteConnector extends BaseConnector {
  constructor(manifest: ConnectorManifest) {
    super(manifest);
  }

  async connect(): Promise<void> {
    (this as any).updateHealth('connected');
  }

  async disconnect(): Promise<void> {
    (this as any).updateHealth('disconnected');
  }

  async refresh(): Promise<void> {
    (this as any).updateHealth('connected');
  }
}

class FailingConnector extends BaseConnector {
  constructor(manifest: ConnectorManifest) {
    super(manifest);
  }

  async connect(): Promise<void> {
    (this as any).updateHealth('error', 'Connection refused');
    throw new Error('Connection refused');
  }

  async disconnect(): Promise<void> {
    (this as any).updateHealth('disconnected');
  }

  async refresh(): Promise<void> {
    (this as any).updateHealth('connected');
  }
}

class ConcreteSyncable extends SyncableConnector {
  constructor(manifest: ConnectorManifest) {
    super(manifest);
  }

  async connect(): Promise<void> {
    (this as any).updateHealth('connected');
  }

  async disconnect(): Promise<void> {
    (this as any).updateHealth('disconnected');
  }

  async refresh(): Promise<void> {
    (this as any).updateHealth('connected');
  }

  async sync() {
    return {
      success: true,
      entitiesAdded: 5,
      entitiesUpdated: 2,
      entitiesRemoved: 1,
    };
  }
}

// --- BaseConnector tests ---

describe('BaseConnector', () => {
  let connector: ConcreteConnector;

  beforeEach(() => {
    connector = new ConcreteConnector(testManifest);
  });

  describe('construction', () => {
    it('stores the manifest', () => {
      expect(connector.getManifest()).toEqual(testManifest);
    });

    it('starts with disconnected health status', () => {
      const health = connector.getHealth();
      expect(health.status).toBe('disconnected');
    });

    it('starts with empty entity counts', () => {
      const health = connector.getHealth();
      expect(health.entityCounts).toEqual({});
    });

    it('starts with no lastError', () => {
      const health = connector.getHealth();
      expect(health.lastError).toBeUndefined();
    });

    it('starts with no lastSyncAt', () => {
      const health = connector.getHealth();
      expect(health.lastSyncAt).toBeUndefined();
    });
  });

  describe('isConnected', () => {
    it('returns false when status is disconnected', () => {
      expect(connector.isConnected()).toBe(false);
    });

    it('returns true when status is connected', async () => {
      await connector.connect();
      expect(connector.isConnected()).toBe(true);
    });

    it('returns false after disconnect', async () => {
      await connector.connect();
      await connector.disconnect();
      expect(connector.isConnected()).toBe(false);
    });
  });

  describe('connect / disconnect lifecycle', () => {
    it('transitions health to connected on connect', async () => {
      await connector.connect();
      const health = connector.getHealth();
      expect(health.status).toBe('connected');
    });

    it('sets lastSyncAt on connect', async () => {
      await connector.connect();
      const health = connector.getHealth();
      expect(health.lastSyncAt).toBeDefined();
      // ISO date string
      expect(health.lastSyncAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('transitions health to disconnected on disconnect', async () => {
      await connector.connect();
      await connector.disconnect();
      expect(connector.getHealth().status).toBe('disconnected');
    });

    it('preserves lastSyncAt through disconnect', async () => {
      await connector.connect();
      const syncAt = connector.getHealth().lastSyncAt;
      await connector.disconnect();
      expect(connector.getHealth().lastSyncAt).toBe(syncAt);
    });
  });

  describe('refresh', () => {
    it('transitions to connected on refresh', async () => {
      await connector.refresh();
      expect(connector.isConnected()).toBe(true);
    });

    it('updates lastSyncAt on refresh', async () => {
      await connector.connect();
      const firstSync = connector.getHealth().lastSyncAt;
      // Advance time slightly (updateHealth uses Date.now internally)
      await new Promise((r) => setTimeout(r, 2));
      await connector.refresh();
      const secondSync = connector.getHealth().lastSyncAt;
      expect(secondSync).not.toBe(firstSync);
    });
  });

  describe('error handling', () => {
    it('reports error status when connect fails', async () => {
      const failing = new FailingConnector(testManifest);
      await expect(failing.connect()).rejects.toThrow('Connection refused');
      expect(failing.getHealth().status).toBe('error');
      expect(failing.getHealth().lastError).toBe('Connection refused');
    });

    it('is not connected after failed connect', async () => {
      const failing = new FailingConnector(testManifest);
      try { await failing.connect(); } catch {}
      expect(failing.isConnected()).toBe(false);
    });
  });

  describe('getManifest', () => {
    it('returns the same manifest object passed to constructor', () => {
      const manifest = connector.getManifest();
      expect(manifest.id).toBe('test-connector');
      expect(manifest.name).toBe('Test Connector');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.provider).toBe('test');
    });

    it('preserves capabilities', () => {
      const manifest = connector.getManifest();
      expect(manifest.capabilities).toHaveLength(2);
      expect(manifest.capabilities[0].capability).toBe('read');
      expect(manifest.capabilities[1].capability).toBe('write');
    });

    it('preserves entity types', () => {
      const manifest = connector.getManifest();
      expect(manifest.entityTypes).toEqual(['Task', 'Person']);
    });
  });

  describe('getHealth', () => {
    it('returns current health snapshot', async () => {
      await connector.connect();
      const health = connector.getHealth();
      expect(health.status).toBe('connected');
      expect(typeof health.entityCounts).toBe('object');
    });
  });
});

// --- SyncableConnector tests ---

describe('SyncableConnector', () => {
  let syncable: ConcreteSyncable;

  beforeEach(() => {
    syncable = new ConcreteSyncable(testManifest);
  });

  it('extends BaseConnector', () => {
    expect(syncable).toBeInstanceOf(BaseConnector);
  });

  it('has a sync method', () => {
    expect(typeof syncable.sync).toBe('function');
  });

  it('returns a sync result with expected shape', async () => {
    const result = await syncable.sync();
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(5);
    expect(result.entitiesUpdated).toBe(2);
    expect(result.entitiesRemoved).toBe(1);
  });

  it('can connect, sync, and disconnect', async () => {
    await syncable.connect();
    expect(syncable.isConnected()).toBe(true);

    const result = await syncable.sync();
    expect(result.success).toBe(true);

    await syncable.disconnect();
    expect(syncable.isConnected()).toBe(false);
  });
});
