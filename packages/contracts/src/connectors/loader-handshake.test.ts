import { describe, it, expect } from 'vitest';
import { Schema } from '@effect/schema';
import {
  SLoaderHandshakeRequest,
  SLoaderHandshakeResponse,
  SLoaderHandshakeFailure,
} from './loader-handshake.js';

describe('SLoaderHandshakeRequest', () => {
  it('parses a valid handshake request', () => {
    const request = {
      protocolVersion: 1,
      expectedConnectorId: 'jira',
      expectedPackageId: 'jira-connector@1.0.0',
      hostSdkVersion: '1.0.0',
      grantedCapabilities: ['http.fetch', 'logger'],
    };
    const parsed = Schema.decodeUnknownSync(SLoaderHandshakeRequest)(request);
    expect(parsed.expectedConnectorId).toBe('jira');
    expect(parsed.grantedCapabilities).toHaveLength(2);
  });

  it('rejects non-literal protocolVersion', () => {
    const request = {
      protocolVersion: 2,
      expectedConnectorId: 'jira',
      expectedPackageId: 'jira-connector@1.0.0',
      hostSdkVersion: '1.0.0',
      grantedCapabilities: [],
    };
    expect(() => Schema.decodeUnknownSync(SLoaderHandshakeRequest)(request)).toThrow();
  });

  it('rejects unknown capability', () => {
    const request = {
      protocolVersion: 1,
      expectedConnectorId: 'jira',
      expectedPackageId: 'jira-connector@1.0.0',
      hostSdkVersion: '1.0.0',
      grantedCapabilities: ['fs.readFile'],
    };
    expect(() => Schema.decodeUnknownSync(SLoaderHandshakeRequest)(request)).toThrow();
  });
});

describe('SLoaderHandshakeResponse', () => {
  it('parses a valid handshake response', () => {
    const response = {
      protocolVersion: 1,
      connectorId: 'jira',
      packageId: 'jira-connector@1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      activeCapabilities: ['http.fetch'],
      entrypoint: 'default',
    };
    const parsed = Schema.decodeUnknownSync(SLoaderHandshakeResponse)(response);
    expect(parsed.connectorId).toBe('jira');
    expect(parsed.entrypoint).toBe('default');
  });

  it('rejects entrypoint containing whitespace', () => {
    const response = {
      protocolVersion: 1,
      connectorId: 'jira',
      packageId: 'jira-connector@1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      activeCapabilities: [],
      entrypoint: 'bad entry',
    };
    expect(() => Schema.decodeUnknownSync(SLoaderHandshakeResponse)(response)).toThrow();
  });

  it('rejects malformed sdkVersion', () => {
    const response = {
      protocolVersion: 1,
      connectorId: 'jira',
      packageId: 'jira-connector@1.0.0',
      sdkVersion: 'v1',
      minHostVersion: '1.0.0',
      activeCapabilities: [],
      entrypoint: 'default',
    };
    expect(() => Schema.decodeUnknownSync(SLoaderHandshakeResponse)(response)).toThrow();
  });
});

describe('SLoaderHandshakeFailure', () => {
  it.each([
    'ENTRYPOINT_MISSING',
    'ENTRYPOINT_SHAPE_INVALID',
    'SDK_UNSUPPORTED',
    'CONNECTOR_ID_MISMATCH',
    'PACKAGE_ID_MISMATCH',
    'CAPABILITY_DENIED',
    'RUNTIME_CRASH',
  ] as const)('accepts failure code %s', (code) => {
    const failure = {
      protocolVersion: 1,
      code,
      message: 'example failure',
    };
    const parsed = Schema.decodeUnknownSync(SLoaderHandshakeFailure)(failure);
    expect(parsed.code).toBe(code);
  });

  it('rejects unknown failure code', () => {
    const failure = {
      protocolVersion: 1,
      code: 'UNKNOWN_CODE',
      message: 'example',
    };
    expect(() => Schema.decodeUnknownSync(SLoaderHandshakeFailure)(failure)).toThrow();
  });
});
