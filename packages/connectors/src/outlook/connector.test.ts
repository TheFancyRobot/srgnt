import { describe, it, expect, beforeEach } from 'vitest';
import { createOutlookConnector, OutlookConnectorImpl } from './connector.js';
import { outlookConnectorManifest, outlookFixtures } from './index.js';
import type { HostContext } from '../sdk/registry.js';

function fakeHost(): HostContext {
  return {
    capabilities: {
      http: { fetch: globalThis.fetch },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      crypto: { randomUUID: () => 'test-uuid' },
      workspace: { root: '/tmp/unused-workspace' },
    },
    connectorId: 'outlook',
    sdkVersion: '0.1.0',
  };
}

describe('createOutlookConnector', () => {
  it('returns an OutlookConnectorImpl bound to the Outlook manifest', async () => {
    const connector = await createOutlookConnector(fakeHost());
    expect(connector).toBeInstanceOf(OutlookConnectorImpl);
    expect(connector.getManifest()).toBe(outlookConnectorManifest);
  });

  it('starts disconnected', async () => {
    const connector = await createOutlookConnector(fakeHost());
    expect(connector.isConnected()).toBe(false);
    expect(connector.getHealth().status).toBe('disconnected');
  });
});

describe('OutlookConnectorImpl lifecycle', () => {
  let connector: OutlookConnectorImpl;

  beforeEach(async () => {
    connector = await createOutlookConnector(fakeHost());
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

describe('OutlookConnectorImpl.sync', () => {
  it('connect + sync() reports one entity added per fixture event', async () => {
    const connector = await createOutlookConnector(fakeHost());
    await connector.connect();
    const result = await connector.sync();
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(outlookFixtures.events.length);
    expect(result.entitiesUpdated).toBe(0);
    expect(result.entitiesRemoved).toBe(0);
  });

  it('sync() without connect() rejects with "Not connected"', async () => {
    const connector = await createOutlookConnector(fakeHost());
    await expect(connector.sync()).rejects.toThrow(/Not connected/);
  });
});
