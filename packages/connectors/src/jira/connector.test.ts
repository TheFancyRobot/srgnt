import { describe, it, expect, beforeEach } from 'vitest';
import { createJiraConnector, JiraConnectorImpl } from './connector.js';
import { jiraConnectorManifest, jiraFixtures } from './index.js';
import type { HostContext } from '../sdk/registry.js';

function fakeHost(): HostContext {
  return {
    capabilities: {
      http: { fetch: globalThis.fetch },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      crypto: { randomUUID: () => 'test-uuid' },
      workspace: { root: '/tmp/unused-workspace' },
    },
    connectorId: 'jira',
    sdkVersion: '0.1.0',
  };
}

describe('createJiraConnector', () => {
  it('returns a JiraConnectorImpl bound to the Jira manifest', async () => {
    const connector = await createJiraConnector(fakeHost());
    expect(connector).toBeInstanceOf(JiraConnectorImpl);
    expect(connector.getManifest()).toBe(jiraConnectorManifest);
  });

  it('starts disconnected with no lastError', async () => {
    const connector = await createJiraConnector(fakeHost());
    expect(connector.isConnected()).toBe(false);
    expect(connector.getHealth().status).toBe('disconnected');
    expect(connector.getHealth().lastError).toBeUndefined();
  });
});

describe('JiraConnectorImpl lifecycle', () => {
  let connector: JiraConnectorImpl;

  beforeEach(async () => {
    connector = await createJiraConnector(fakeHost());
  });

  it('transitions to connected after connect()', async () => {
    await connector.connect();
    expect(connector.isConnected()).toBe(true);
    expect(connector.getHealth().status).toBe('connected');
    expect(connector.getHealth().lastSyncAt).toBeDefined();
  });

  it('transitions back to disconnected after disconnect()', async () => {
    await connector.connect();
    await connector.disconnect();
    expect(connector.isConnected()).toBe(false);
    expect(connector.getHealth().status).toBe('disconnected');
  });

  it('refresh() keeps the connector connected', async () => {
    await connector.connect();
    await connector.refresh();
    expect(connector.isConnected()).toBe(true);
    expect(connector.getHealth().status).toBe('connected');
  });

  it('refresh() before connect() rejects with "Not connected"', async () => {
    await expect(connector.refresh()).rejects.toThrow(/Not connected/);
  });
});

describe('JiraConnectorImpl.sync', () => {
  it('connect + sync() reports one entity added per fixture issue', async () => {
    const connector = await createJiraConnector(fakeHost());
    await connector.connect();
    const result = await connector.sync();
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(jiraFixtures.issues.length);
    expect(result.entitiesUpdated).toBe(0);
    expect(result.entitiesRemoved).toBe(0);
  });

  it('sync() without connect() rejects with "Not connected"', async () => {
    const connector = await createJiraConnector(fakeHost());
    await expect(connector.sync()).rejects.toThrow(/Not connected/);
  });
});
