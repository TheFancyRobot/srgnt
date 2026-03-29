import { describe, it, expect } from 'vitest';
import { parseSync } from '../shared-schemas.js';
import {
  SConnectorManifest,
  SConnectorCapability,
  SConnectorAuthType,
  SConnectorConfig,
  SConnectorCapabilityDef,
  SConnectorEntityMapping,
  SConnectorStatus,
  SConnectorHealth,
  SConnectorSession,
} from './manifest.js';

describe('SConnectorCapability', () => {
  it('accepts valid capabilities', () => {
    expect(() => parseSync(SConnectorCapability, 'query')).not.toThrow();
    expect(() => parseSync(SConnectorCapability, 'read')).not.toThrow();
    expect(() => parseSync(SConnectorCapability, 'write')).not.toThrow();
    expect(() => parseSync(SConnectorCapability, 'subscribe')).not.toThrow();
    expect(() => parseSync(SConnectorCapability, 'delete')).not.toThrow();
  });

  it('rejects invalid capabilities', () => {
    expect(() => parseSync(SConnectorCapability, 'invalid')).toThrow();
  });
});

describe('SConnectorAuthType', () => {
  it('accepts valid auth types', () => {
    const types = ['none', 'api_key', 'oauth2', 'basic', 'bearer'] as const;
    for (const type of types) {
      expect(() => parseSync(SConnectorAuthType, type)).not.toThrow();
    }
  });

  it('rejects invalid auth types', () => {
    expect(() => parseSync(SConnectorAuthType, 'invalid')).toThrow();
  });
});

describe('SConnectorConfig', () => {
  it('validates minimal config', () => {
    const config = {};
    const parsed = parseSync(SConnectorConfig, config);
    expect(parsed.authType).toBe('none');
    expect(parsed.timeout).toBe(30000);
  });

  it('accepts valid url', () => {
    const config = { baseUrl: 'https://api.example.com' };
    expect(() => parseSync(SConnectorConfig, config)).not.toThrow();
  });

  it('rejects invalid url', () => {
    const config = { baseUrl: 'not-a-url' };
    expect(() => parseSync(SConnectorConfig, config)).toThrow();
  });

  it('applies defaults correctly', () => {
    const config = { authType: 'oauth2' as const };
    const parsed = parseSync(SConnectorConfig, config);
    expect(parsed.authType).toBe('oauth2');
    expect(parsed.timeout).toBe(30000);
    expect(parsed.retryAttempts).toBe(3);
  });
});

describe('SConnectorCapabilityDef', () => {
  it('validates a minimal capability def', () => {
    const def = { capability: 'read' as const, supportedOperations: ['list', 'get'] };
    expect(() => parseSync(SConnectorCapabilityDef, def)).not.toThrow();
  });

  it('validates with rate limit', () => {
    const def = {
      capability: 'read' as const,
      supportedOperations: ['list'],
      rateLimit: { requests: 100, windowMs: 60000 },
    };
    expect(() => parseSync(SConnectorCapabilityDef, def)).not.toThrow();
  });
});

describe('SConnectorEntityMapping', () => {
  it('validates a minimal mapping', () => {
    const mapping = { canonicalType: 'Task', providerType: 'Issue' };
    expect(() => parseSync(SConnectorEntityMapping, mapping)).not.toThrow();
  });
});

describe('SConnectorManifest', () => {
  it('validates a minimal manifest', () => {
    const manifest = {
      id: 'jira-connector',
      name: 'Jira Connector',
      version: '1.0.0',
      description: 'Connector for Jira',
      provider: 'atlassian',
      authType: 'oauth2',
      capabilities: [],
    };
    expect(() => parseSync(SConnectorManifest, manifest)).not.toThrow();
  });

  it('rejects invalid semver', () => {
    const manifest = {
      id: 'jira-connector',
      name: 'Jira Connector',
      version: 'invalid',
      description: 'Connector for Jira',
      provider: 'atlassian',
      authType: 'oauth2',
    };
    expect(() => parseSync(SConnectorManifest, manifest)).toThrow();
  });

  it('applies defaults', () => {
    const manifest = {
      id: 'jira-connector',
      name: 'Jira Connector',
      version: '1.0.0',
      description: 'Connector for Jira',
      provider: 'atlassian',
      authType: 'none',
      capabilities: [],
    };
    const parsed = parseSync(SConnectorManifest, manifest);
    expect(parsed.config.authType).toBe('none');
    expect(parsed.entityTypes).toEqual([]);
    expect(parsed.freshnessThresholdMs).toBe(300000);
  });
});

describe('SConnectorStatus', () => {
  it('accepts valid statuses', () => {
    const statuses = ['disconnected', 'connecting', 'connected', 'error', 'refreshing'] as const;
    for (const status of statuses) {
      expect(() => parseSync(SConnectorStatus, status)).not.toThrow();
    }
  });

  it('rejects invalid status', () => {
    expect(() => parseSync(SConnectorStatus, 'invalid')).toThrow();
  });
});

describe('SConnectorHealth', () => {
  it('validates minimal health', () => {
    const health = { status: 'connected' as const };
    expect(() => parseSync(SConnectorHealth, health)).not.toThrow();
  });

  it('validates full health', () => {
    const health = {
      status: 'connected' as const,
      lastSyncAt: '2024-03-25T10:00:00Z',
      entityCounts: { Task: 10, Event: 5 },
    };
    expect(() => parseSync(SConnectorHealth, health)).not.toThrow();
  });
});

describe('SConnectorSession', () => {
  it('validates a minimal session', () => {
    const session = {
      connectorId: 'jira-connector',
      authType: 'oauth2' as const,
      authenticatedAt: '2024-03-25T10:00:00Z',
    };
    expect(() => parseSync(SConnectorSession, session)).not.toThrow();
  });

  it('validates session with expiration', () => {
    const session = {
      connectorId: 'jira-connector',
      authType: 'bearer' as const,
      authenticatedAt: '2024-03-25T10:00:00Z',
      expiresAt: '2024-03-26T10:00:00Z',
    };
    expect(() => parseSync(SConnectorSession, session)).not.toThrow();
  });
});
