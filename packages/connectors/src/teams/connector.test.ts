import { describe, it, expect, beforeEach } from 'vitest';
import { createTeamsConnector, TeamsConnectorImpl } from './connector.js';
import { teamsConnectorManifest, teamsFixtures } from './index.js';
import type { HostContext } from '../sdk/registry.js';

function fakeHost(): HostContext {
  return {
    capabilities: {
      http: { fetch: globalThis.fetch },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      crypto: { randomUUID: () => 'test-uuid' },
      workspace: { root: '/tmp/unused-workspace' },
    },
    connectorId: 'teams',
    sdkVersion: '0.1.0',
  };
}

describe('createTeamsConnector', () => {
  it('returns a TeamsConnectorImpl bound to the Teams manifest', async () => {
    const connector = await createTeamsConnector(fakeHost());
    expect(connector).toBeInstanceOf(TeamsConnectorImpl);
    expect(connector.getManifest()).toBe(teamsConnectorManifest);
  });

  it('starts disconnected', async () => {
    const connector = await createTeamsConnector(fakeHost());
    expect(connector.isConnected()).toBe(false);
    expect(connector.getHealth().status).toBe('disconnected');
  });
});

describe('TeamsConnectorImpl lifecycle', () => {
  let connector: TeamsConnectorImpl;

  beforeEach(async () => {
    connector = await createTeamsConnector(fakeHost());
  });

  it('transitions to connected after connect()', async () => {
    await connector.connect();
    expect(connector.isConnected()).toBe(true);
    expect(connector.getHealth().status).toBe('connected');
  });

  it('transitions back to disconnected after disconnect()', async () => {
    await connector.connect();
    await connector.disconnect();
    expect(connector.isConnected()).toBe(false);
    expect(connector.getHealth().status).toBe('disconnected');
  });

  it('refresh() before connect() rejects with "Not connected"', async () => {
    await expect(connector.refresh()).rejects.toThrow(/Not connected/);
  });
});

describe('TeamsConnectorImpl.sync', () => {
  it('connect + sync() reports one entity added per fixture message', async () => {
    const connector = await createTeamsConnector(fakeHost());
    await connector.connect();
    const result = await connector.sync();
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(teamsFixtures.messages.length);
    expect(result.entitiesUpdated).toBe(0);
    expect(result.entitiesRemoved).toBe(0);
  });

  it('sync() without connect() rejects with "Not connected"', async () => {
    const connector = await createTeamsConnector(fakeHost());
    await expect(connector.sync()).rejects.toThrow(/Not connected/);
  });
});
