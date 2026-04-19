import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SVerificationStatus,
  SInstallCommandInput,
  SInstallCommandSuccess,
  SInstallCommandError,
  SInstallCommandOutput,
  SInstalledPackageSummary,
  SInspectCommandOutput,
  SRemoveCommandSuccess,
  SRemoveCommandError,
  SRemoveCommandOutput,
} from './installed-package.js';

describe('SVerificationStatus', () => {
  it('accepts every documented verification state', () => {
    for (const status of ['unverified', 'verifying', 'verified', 'invalid', 'expired']) {
      expect(Schema.decodeUnknownSync(SVerificationStatus)(status)).toBe(status);
    }
  });

  it('rejects an unknown verification status', () => {
    expect(() => Schema.decodeUnknownSync(SVerificationStatus)('corrupted')).toThrow();
  });
});

describe('SInstallCommandInput', () => {
  it('parses minimal input with only packageUrl', () => {
    const parsed = Schema.decodeUnknownSync(SInstallCommandInput)({
      packageUrl: 'https://example.com/pkg.json',
    });
    expect(parsed.packageUrl).toBe('https://example.com/pkg.json');
    expect(parsed.expectedConnectorId).toBeUndefined();
  });

  it('accepts the optional expectedConnectorId', () => {
    const parsed = Schema.decodeUnknownSync(SInstallCommandInput)({
      packageUrl: 'https://example.com/pkg.json',
      expectedConnectorId: 'jira',
    });
    expect(parsed.expectedConnectorId).toBe('jira');
  });

  it('rejects input missing packageUrl', () => {
    expect(() => Schema.decodeUnknownSync(SInstallCommandInput)({})).toThrow();
  });
});

describe('SInstallCommandOutput', () => {
  const successPayload = {
    packageId: 'jira@1.0.0',
    connectorId: 'jira',
    installedAt: '2026-04-19T00:00:00.000Z',
    installPath: '/workspace/connectors/jira',
  };

  const errorPayload = {
    code: 'CHECKSUM_MISMATCH',
    message: 'sha256 did not match',
  };

  it('parses the success arm of the union', () => {
    const parsed = Schema.decodeUnknownSync(SInstallCommandOutput)(successPayload);
    expect(parsed).toEqual(successPayload);
  });

  it('parses the success shape directly', () => {
    expect(Schema.decodeUnknownSync(SInstallCommandSuccess)(successPayload)).toEqual(successPayload);
  });

  it('parses the error arm of the union', () => {
    const parsed = Schema.decodeUnknownSync(SInstallCommandOutput)(errorPayload);
    expect(parsed).toEqual(errorPayload);
  });

  it('parses an error with optional details', () => {
    const parsed = Schema.decodeUnknownSync(SInstallCommandError)({
      ...errorPayload,
      details: 'expected abc, got def',
    });
    expect(parsed.details).toBe('expected abc, got def');
  });

  it('rejects a success payload missing installPath', () => {
    const { installPath: _omitted, ...rest } = successPayload;
    expect(() => Schema.decodeUnknownSync(SInstallCommandSuccess)(rest)).toThrow();
  });
});

describe('SInstalledPackageSummary', () => {
  it('parses a full summary row', () => {
    const parsed = Schema.decodeUnknownSync(SInstalledPackageSummary)({
      packageId: 'jira@1.0.0',
      connectorId: 'jira',
      packageVersion: '1.0.0',
      installedAt: '2026-04-19T00:00:00.000Z',
      lifecycleState: 'installed',
      verificationStatus: 'verified',
    });
    expect(parsed.lifecycleState).toBe('installed');
    expect(parsed.verificationStatus).toBe('verified');
  });

  it('rejects an unknown lifecycle state', () => {
    expect(() =>
      Schema.decodeUnknownSync(SInstalledPackageSummary)({
        packageId: 'jira@1.0.0',
        connectorId: 'jira',
        packageVersion: '1.0.0',
        installedAt: '2026-04-19T00:00:00.000Z',
        lifecycleState: 'phantom',
        verificationStatus: 'verified',
      }),
    ).toThrow();
  });
});

describe('SInspectCommandOutput', () => {
  const base = {
    packageId: 'jira@1.0.0',
    connectorId: 'jira',
    packageVersion: '1.0.0',
    sdkVersion: '0.1.0',
    minHostVersion: '0.1.0',
    packageUrl: 'https://example.com/pkg.json',
    installPath: '/workspace/connectors/jira',
    installedAt: '2026-04-19T00:00:00.000Z',
    verificationStatus: 'verified',
    lifecycleState: 'loaded',
    entrypoint: 'connectorPackage',
    executionModel: 'worker',
  } as const;

  it('parses without optional fields', () => {
    const parsed = Schema.decodeUnknownSync(SInspectCommandOutput)(base);
    expect(parsed.lastVerifiedAt).toBeUndefined();
    expect(parsed.lastError).toBeUndefined();
  });

  it('accepts optional lastVerifiedAt and lastError', () => {
    const parsed = Schema.decodeUnknownSync(SInspectCommandOutput)({
      ...base,
      lastVerifiedAt: '2026-04-19T00:01:00.000Z',
      lastError: 'handshake rejected',
    });
    expect(parsed.lastVerifiedAt).toBe('2026-04-19T00:01:00.000Z');
    expect(parsed.lastError).toBe('handshake rejected');
  });

  it('accepts the subprocess execution model', () => {
    const parsed = Schema.decodeUnknownSync(SInspectCommandOutput)({
      ...base,
      executionModel: 'subprocess',
    });
    expect(parsed.executionModel).toBe('subprocess');
  });

  it('rejects an unsupported execution model', () => {
    expect(() =>
      Schema.decodeUnknownSync(SInspectCommandOutput)({
        ...base,
        executionModel: 'thread',
      }),
    ).toThrow();
  });
});

describe('SRemoveCommandOutput', () => {
  const success = {
    packageId: 'jira@1.0.0',
    connectorId: 'jira',
    removedAt: '2026-04-19T00:00:00.000Z',
    cleanupPaths: ['/workspace/connectors/jira'],
  };

  const error = {
    code: 'NOT_FOUND',
    message: 'package is not installed',
  };

  it('parses success with an empty cleanupPaths array', () => {
    const parsed = Schema.decodeUnknownSync(SRemoveCommandSuccess)({
      ...success,
      cleanupPaths: [],
    });
    expect(parsed.cleanupPaths).toEqual([]);
  });

  it('parses the success arm of the union', () => {
    const parsed = Schema.decodeUnknownSync(SRemoveCommandOutput)(success);
    expect(parsed).toEqual(success);
  });

  it('parses the error arm of the union', () => {
    const parsed = Schema.decodeUnknownSync(SRemoveCommandOutput)(error);
    expect(parsed).toEqual(error);
  });

  it('rejects an error payload missing message', () => {
    expect(() => Schema.decodeUnknownSync(SRemoveCommandError)({ code: 'NOT_FOUND' })).toThrow();
  });
});
