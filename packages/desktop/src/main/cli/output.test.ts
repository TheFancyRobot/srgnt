import { describe, expect, it } from 'vitest';
import { hostOnly, redactForCli, renderJson, renderText } from './output.js';

describe('redactForCli', () => {
  it('redacts token/apikey/secret pairs', () => {
    expect(redactForCli('Authorization token=abc123')).toBe('Authorization token=[redacted]');
    expect(redactForCli('api_key=secretValue')).toBe('api_key=[redacted]');
    expect(redactForCli('secret=superSecret more text')).toBe('secret=[redacted] more text');
  });

  it('redacts absolute filesystem paths and emails', () => {
    expect(redactForCli('failed at /home/matt/srgnt/foo/bar.ts')).toContain('[redacted-path]');
    expect(redactForCli('contact hello@example.com for help')).toContain('[redacted-email]');
  });

  it('passes through harmless text unchanged', () => {
    expect(redactForCli('package demo@1.0.0 installed')).toBe('package demo@1.0.0 installed');
  });
});

describe('hostOnly', () => {
  it('strips path, query, and fragment from a URL', () => {
    expect(hostOnly('https://example.com/path?q=1#frag')).toBe('https://example.com');
    expect(hostOnly('https://private.example.com:8443/foo')).toBe('https://private.example.com:8443');
  });

  it('returns a safe placeholder for malformed urls', () => {
    expect(hostOnly('not a url')).toBe('[redacted-url]');
  });
});

describe('renderJson / renderText', () => {
  it('renders install success as human-readable lines', () => {
    const rendered = renderText({
      kind: 'installed',
      packageId: 'demo@1.0.0',
      connectorId: 'demo',
      packageVersion: '1.0.0',
      verificationStatus: 'verified',
      lifecycleState: 'installed',
      checksum: 'abc123',
    });
    expect(rendered).toContain('installed demo (demo@1.0.0)');
    expect(rendered).toContain('checksum:');
  });

  it('renders install errors with redacted detail text', () => {
    const rendered = renderText({
      kind: 'install-error',
      code: 'CHECKSUM_MISMATCH',
      message: 'Package checksum did not match',
      details: 'token=abc123 found at /home/matt/srgnt/foo.ts',
    });
    expect(rendered).toContain('CHECKSUM_MISMATCH');
    expect(rendered).toContain('token=[redacted]');
    expect(rendered).toContain('[redacted-path]');
  });

  it('renders a compact list table', () => {
    const rendered = renderText({
      kind: 'list',
      packages: [
        {
          packageId: 'demo@1.0.0',
          connectorId: 'demo',
          packageVersion: '1.0.0',
          lifecycleState: 'installed',
          verificationStatus: 'verified',
          executionModel: 'worker',
        },
      ],
    });
    expect(rendered).toContain('CONNECTOR');
    expect(rendered).toContain('demo@1.0.0');
    expect(rendered).toContain('installed');
  });

  it('renders empty list with a helpful message', () => {
    const rendered = renderText({ kind: 'list', packages: [] });
    expect(rendered).toContain('no connector packages installed');
  });

  it('renders inspect output without secrets', () => {
    const rendered = renderText({
      kind: 'inspect',
      packageId: 'demo@1.0.0',
      connectorId: 'demo',
      packageVersion: '1.0.0',
      sdkVersion: '1.0.0',
      minHostVersion: '1.0.0',
      sourceHost: 'https://example.com',
      installedAt: '2026-04-19T00:00:00.000Z',
      lifecycleState: 'installed',
      verificationStatus: 'verified',
      executionModel: 'worker',
      checksum: 'abcd',
      lastError: 'token=abc123 boom',
    });
    expect(rendered).toContain('connector:         demo');
    expect(rendered).toContain('sourceHost:        https://example.com');
    expect(rendered).toContain('token=[redacted]');
  });

  it('renders json through JSON.stringify', () => {
    const rendered = renderJson({ kind: 'list', packages: [] });
    const parsed = JSON.parse(rendered);
    expect(parsed.kind).toBe('list');
  });
});
