import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SInstalledConnectorPackage,
  SConnectorPackageRegistry,
} from './package-registry.js';

describe('SInstalledConnectorPackage', () => {
  it('parses a valid installed connector package', () => {
    const valid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'verified',
      lifecycleState: 'installed',
      executionModel: 'worker',
    };
    const result = Schema.decodeUnknownSync(SInstalledConnectorPackage)(valid);
    expect(result.packageId).toBe('jira-connector@1.0.0');
    expect(result.connectorId).toBe('jira');
    expect(result.executionModel).toBe('worker');
  });

  it('parses with optional checksum', () => {
    const valid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      checksum: 'sha256:abc123',
      verificationStatus: 'verified',
      lifecycleState: 'installed',
      executionModel: 'worker',
    };
    const result = Schema.decodeUnknownSync(SInstalledConnectorPackage)(valid);
    expect(result.checksum).toBe('sha256:abc123');
  });

  it('parses with optional lastError', () => {
    const valid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'failed',
      lifecycleState: 'errored',
      lastError: 'Checksum verification failed',
      executionModel: 'worker',
    };
    const result = Schema.decodeUnknownSync(SInstalledConnectorPackage)(valid);
    expect(result.lastError).toBe('Checksum verification failed');
  });

  it('rejects missing required fields', () => {
    const invalid = {
      packageId: 'jira-connector@1.0.0',
      // missing connectorId
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'verified',
      lifecycleState: 'installed',
      executionModel: 'worker',
    };
    expect(() => Schema.decodeUnknownSync(SInstalledConnectorPackage)(invalid)).toThrow();
  });

  it('rejects malformed semver in packageVersion', () => {
    const invalid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: 'not-a-semver',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'verified',
      lifecycleState: 'installed',
      executionModel: 'worker',
    };
    expect(() => Schema.decodeUnknownSync(SInstalledConnectorPackage)(invalid)).toThrow();
  });

  it('rejects malformed sourceUrl', () => {
    const invalid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'not-a-url',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'verified',
      lifecycleState: 'installed',
      executionModel: 'worker',
    };
    expect(() => Schema.decodeUnknownSync(SInstalledConnectorPackage)(invalid)).toThrow();
  });
});

describe('SConnectorPackageRegistry', () => {
  it('parses a valid package registry with multiple packages', () => {
    const valid = {
      packages: [
        {
          packageId: 'jira-connector@1.0.0',
          connectorId: 'jira',
          packageVersion: '1.0.0',
          sdkVersion: '1.0.0',
          minHostVersion: '1.0.0',
          sourceUrl: 'https://example.com/jira-connector.tgz',
          installedAt: '2024-01-15T10:30:00.000Z',
          verificationStatus: 'verified',
          lifecycleState: 'installed',
          executionModel: 'worker',
        },
        {
          packageId: 'outlook-connector@2.1.0',
          connectorId: 'outlook',
          packageVersion: '2.1.0',
          sdkVersion: '1.0.0',
          minHostVersion: '1.0.0',
          sourceUrl: 'https://example.com/outlook-connector.tgz',
          installedAt: '2024-01-16T14:00:00.000Z',
          verificationStatus: 'unverified',
          lifecycleState: 'installed',
          executionModel: 'subprocess',
        },
      ],
    };
    const result = Schema.decodeUnknownSync(SConnectorPackageRegistry)(valid);
    expect(result.packages).toHaveLength(2);
  });

  it('parses an empty package registry', () => {
    const valid = { packages: [] };
    const result = Schema.decodeUnknownSync(SConnectorPackageRegistry)(valid);
    expect(result.packages).toHaveLength(0);
  });
});

describe('lifecycleState validation', () => {
  it.each(['installed', 'verified', 'activated', 'loaded', 'connected', 'errored'])(
    'accepts lifecycle state: %s',
    (state) => {
      const valid = {
        packageId: 'jira-connector@1.0.0',
        connectorId: 'jira',
        packageVersion: '1.0.0',
        sdkVersion: '1.0.0',
        minHostVersion: '1.0.0',
        sourceUrl: 'https://example.com/jira-connector.tgz',
        installedAt: '2024-01-15T10:30:00.000Z',
        verificationStatus: 'verified',
        lifecycleState: state,
        executionModel: 'worker',
      };
      const result = Schema.decodeUnknownSync(SInstalledConnectorPackage)(valid);
      expect(result.lifecycleState).toBe(state);
    },
  );

  it('rejects unknown lifecycle state', () => {
    const invalid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'verified',
      lifecycleState: 'unknown' as any,
      executionModel: 'worker',
    };
    expect(() => Schema.decodeUnknownSync(SInstalledConnectorPackage)(invalid)).toThrow();
  });
});

describe('verificationStatus validation', () => {
  it.each(['unverified', 'verified', 'failed'])(
    'accepts verificationStatus: %s',
    (status) => {
      const valid = {
        packageId: 'jira-connector@1.0.0',
        connectorId: 'jira',
        packageVersion: '1.0.0',
        sdkVersion: '1.0.0',
        minHostVersion: '1.0.0',
        sourceUrl: 'https://example.com/jira-connector.tgz',
        installedAt: '2024-01-15T10:30:00.000Z',
        verificationStatus: status,
        lifecycleState: 'installed',
        executionModel: 'worker',
      };
      const result = Schema.decodeUnknownSync(SInstalledConnectorPackage)(valid);
      expect(result.verificationStatus).toBe(status);
    },
  );

  it('rejects unknown verificationStatus', () => {
    const invalid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'unknown' as any,
      lifecycleState: 'installed',
      executionModel: 'worker',
    };
    expect(() => Schema.decodeUnknownSync(SInstalledConnectorPackage)(invalid)).toThrow();
  });
});

describe('executionModel validation', () => {
  it.each(['worker', 'subprocess'])(
    'accepts executionModel: %s',
    (model) => {
      const valid = {
        packageId: 'jira-connector@1.0.0',
        connectorId: 'jira',
        packageVersion: '1.0.0',
        sdkVersion: '1.0.0',
        minHostVersion: '1.0.0',
        sourceUrl: 'https://example.com/jira-connector.tgz',
        installedAt: '2024-01-15T10:30:00.000Z',
        verificationStatus: 'verified',
        lifecycleState: 'installed',
        executionModel: model,
      };
      const result = Schema.decodeUnknownSync(SInstalledConnectorPackage)(valid);
      expect(result.executionModel).toBe(model);
    },
  );

  it('rejects unknown executionModel', () => {
    const invalid = {
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceUrl: 'https://example.com/jira-connector.tgz',
      installedAt: '2024-01-15T10:30:00.000Z',
      verificationStatus: 'verified',
      lifecycleState: 'installed',
      executionModel: 'unknown' as any,
    };
    expect(() => Schema.decodeUnknownSync(SInstalledConnectorPackage)(invalid)).toThrow();
  });
});
