/**
 * Tests for Jira connector sync — live path, fixture fallback, and token mediation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJiraConnector, JiraConnectorImpl } from './connector.js';
import { jiraConnectorManifest, jiraFixtures } from './data.js';
import type { HostContext } from '@srgnt/connectors';
import type { JiraConnectorSettings } from '@srgnt/contracts';

function fakeHost(tokenToReturn?: string | undefined): HostContext {
  return {
    capabilities: {
      http: { fetch: globalThis.fetch },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      crypto: { randomUUID: () => 'test-uuid' },
      workspace: { root: '/tmp/unused-workspace' },
      credentials: tokenToReturn !== undefined
        ? { getToken: async () => tokenToReturn }
        : undefined,
    },
    connectorId: 'jira',
    sdkVersion: '0.1.0',
  };
}

const minimalSettings: JiraConnectorSettings = {
  connectorId: 'jira',
  siteUrl: 'https://example.atlassian.net',
  accountEmail: 'user@example.com',
  scopeMode: 'projects',
  projectKeys: ['PROJ'],
};

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

describe('JiraConnectorImpl.sync — fixture fallback', () => {
  it('falls back to fixture data when no settings are configured', async () => {
    const connector = await createJiraConnector(fakeHost());
    await connector.connect();
    const result = await connector.sync();
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(jiraFixtures.issues.length);
  });

  it('falls back to fixture data when host has no credentials capability', async () => {
    const connector = await createJiraConnector(fakeHost(undefined));
    await connector.connect();
    connector.setSettings(minimalSettings);
    const result = await connector.sync();
    // No credentials capability → falls back to fixtures
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(jiraFixtures.issues.length);
  });

  it('falls back to fixture data when credentials.getToken returns empty string', async () => {
    const connector = await createJiraConnector(fakeHost(''));
    await connector.connect();
    connector.setSettings(minimalSettings);
    const result = await connector.sync();
    // Empty token → falls back to fixtures
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(jiraFixtures.issues.length);
  });

  it('sync() without connect() rejects with "Not connected"', async () => {
    const connector = await createJiraConnector(fakeHost());
    await expect(connector.sync()).rejects.toThrow(/Not connected/);
  });

  it('falls back to fixture data when getToken returns undefined even with settings', async () => {
    const connector = await createJiraConnector(fakeHost(undefined));
    await connector.connect();
    connector.setSettings(minimalSettings);
    const result = await connector.sync();
    // undefined token → fixture fallback
    expect(result.success).toBe(true);
    expect(result.entitiesAdded).toBe(jiraFixtures.issues.length);
  });
});

describe('JiraConnectorImpl.sync — live credential path', () => {
  it('returns live data (not fixture fallback) when getToken returns a non-empty token', async () => {
    // Mock fetch so the live Jira API call succeeds with a distinguishable result
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify({
        issues: [
          {
            id: '99999', key: 'LIVE-1', self: '', expand: '',
            fields: {
              summary: 'Live issue from mock server',
              description: null,
              status: { name: 'To Do', id: '1' },
              priority: { name: 'Low', id: '5' },
              assignee: null,
              creator: { accountId: 'u1', displayName: 'U', emailAddress: 'u@x.com', active: true },
              reporter: { accountId: 'u1', displayName: 'U', emailAddress: 'u@x.com', active: true },
              created: '2024-01-01', updated: '2024-01-02',
              project: { id: '1', key: 'LIVE', name: 'Live Project' },
              issuetype: { id: '1', name: 'Task', subtask: false },
              labels: [], fixVersions: [],
            },
          },
        ],
        total: 1, startAt: 0, maxResults: 100, names: {}, schemas: {},
      })),
    });
    const originalFetch = globalThis.fetch;
    // @ts-expect-error — replacing global fetch for test
    globalThis.fetch = mockFetch;

    try {
      const getTokenMock = vi.fn().mockResolvedValue('valid-token-from-keychain');
      const host: HostContext = {
        capabilities: {
          http: { fetch: mockFetch },
          logger: { info: () => {}, warn: () => {}, error: () => {} },
          crypto: { randomUUID: () => 'test-uuid' },
          workspace: { root: '/tmp/unused-workspace' },
          credentials: { getToken: getTokenMock },
        },
        connectorId: 'jira',
        sdkVersion: '0.1.0',
      };

      const connector = await createJiraConnector(host);
      await connector.connect();
      connector.setSettings(minimalSettings);

      const result = await connector.sync();

      // Live data should return 1 entity (from mock), not 3 (fixture count)
      expect(result.success).toBe(true);
      expect(result.entitiesAdded).not.toBe(jiraFixtures.issues.length); // 3 != 1
      expect(result.entitiesAdded).toBe(1); // from the mock
      expect(getTokenMock).toHaveBeenCalledWith('jira');
      expect(mockFetch).toHaveBeenCalled(); // real HTTP call was made
    } finally {
      // @ts-expect-error — restore global fetch
      globalThis.fetch = originalFetch;
    }
  });
});