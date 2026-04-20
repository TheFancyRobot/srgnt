import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SConnectorPackageManifest,
  SConnectorPackageRuntime,
  SConnectorLifecycleState,
} from './package-runtime.js';

describe('SConnectorPackageRuntime', () => {
  it('parses a valid runtime manifest', () => {
    const valid = {
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      entrypoint: 'createConnector',
      capabilities: ['http.fetch', 'workspace.root'],
      executionModel: 'worker',
    };
    const result = Schema.decodeUnknownSync(SConnectorPackageRuntime)(valid);
    expect(result.sdkVersion).toBe('1.0.0');
    expect(result.executionModel).toBe('worker');
  });

  it('rejects malformed sdkVersion', () => {
    const invalid = {
      sdkVersion: 'not-a-semver',
      minHostVersion: '1.0.0',
      entrypoint: 'createConnector',
      capabilities: [],
      executionModel: 'subprocess',
    };
    expect(() => Schema.decodeUnknownSync(SConnectorPackageRuntime)(invalid)).toThrow();
  });

  it('rejects malformed entrypoint', () => {
    const invalid = {
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      entrypoint: '',
      capabilities: [],
      executionModel: 'worker',
    };
    expect(() => Schema.decodeUnknownSync(SConnectorPackageRuntime)(invalid)).toThrow();
  });

  it('rejects undeclared capabilities outside the host contract', () => {
    const invalid = {
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      entrypoint: 'createConnector',
      capabilities: ['fs.readFile'],
      executionModel: 'worker',
    };
    expect(() => Schema.decodeUnknownSync(SConnectorPackageRuntime)(invalid)).toThrow();
  });

  it('rejects invalid executionModel', () => {
    const invalid = {
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      entrypoint: 'createConnector',
      capabilities: [],
      executionModel: 'invalid-model' as any,
    };
    expect(() => Schema.decodeUnknownSync(SConnectorPackageRuntime)(invalid)).toThrow();
  });
});

describe('SConnectorPackageManifest', () => {
  it('keeps runtime metadata separate from connector identity manifest', () => {
    const parsed = Schema.decodeUnknownSync(SConnectorPackageManifest)({
      manifest: {
        id: 'jira',
        name: 'Jira Connector',
        version: '1.0.0',
        description: 'Sync Jira issues',
        provider: 'atlassian-jira',
        authType: 'oauth2',
        capabilities: [],
      },
      runtime: {
        sdkVersion: '1.0.0',
        minHostVersion: '1.0.0',
        entrypoint: 'createConnector',
        capabilities: ['logger'],
        executionModel: 'subprocess',
      },
    });

    expect(parsed.manifest.id).toBe('jira');
    expect(parsed.runtime.executionModel).toBe('subprocess');
  });
});

describe('SConnectorLifecycleState', () => {
  it.each(['installed', 'verified', 'activated', 'loaded', 'connected', 'errored'])(
    'accepts lifecycle state: %s',
    (state) => {
      const result = Schema.decodeUnknownSync(SConnectorLifecycleState)(state);
      expect(result).toBe(state);
    },
  );

  it('rejects unknown lifecycle state', () => {
    expect(() => Schema.decodeUnknownSync(SConnectorLifecycleState)('unknown')).toThrow();
  });
});
