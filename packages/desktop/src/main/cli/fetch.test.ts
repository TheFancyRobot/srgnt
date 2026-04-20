import { describe, expect, it } from 'vitest';
import { fetchAndValidatePackage, sha256, type FetchFn } from './fetch.js';
import { CliError } from './workspace.js';

function fakeFetch(map: Record<string, { ok: boolean; status?: number; body: string }>): FetchFn {
  return async (url: string) => {
    const entry = map[url];
    if (!entry) {
      throw new Error(`unexpected fetch: ${url}`);
    }
    return {
      ok: entry.ok,
      status: entry.status ?? (entry.ok ? 200 : 500),
      text: async () => entry.body,
    };
  };
}

const validManifestPayload = {
  manifest: {
    id: 'demo-connector',
    name: 'Demo',
    version: '1.0.0',
    description: 'Demo connector',
    provider: 'demo',
    authType: 'none',
    config: { authType: 'none', timeout: 5000, retryAttempts: 1 },
    capabilities: [{ capability: 'read', supportedOperations: ['getItem'] }],
    entityTypes: ['Task'],
    freshnessThresholdMs: 60000,
    metadata: {},
  },
  runtime: {
    sdkVersion: '1.0.0',
    minHostVersion: '1.0.0',
    entrypoint: 'default',
    executionModel: 'worker',
    capabilities: ['http.fetch', 'logger'],
  },
};

describe('fetchAndValidatePackage', () => {
  it('downloads and validates a well-formed package', async () => {
    const url = 'https://example.com/demo-connector.json';
    const body = JSON.stringify(validManifestPayload);
    const fetched = await fetchAndValidatePackage({
      packageUrl: url,
      fetch: fakeFetch({ [url]: { ok: true, body } }),
    });
    expect(fetched.manifest.id).toBe('demo-connector');
    expect(fetched.packageVersion).toBe('1.0.0');
    expect(fetched.executionModel).toBe('worker');
    expect(fetched.capabilities).toContain('http.fetch');
    expect(fetched.checksum).toBe(sha256(body));
  });

  it('rejects non-https URLs unless localhost', async () => {
    await expect(
      fetchAndValidatePackage({
        packageUrl: 'http://evil.example.com/pkg.json',
        fetch: fakeFetch({}),
      }),
    ).rejects.toMatchObject({ code: 'PACKAGE_URL_INSECURE' });
  });

  it('accepts http://localhost URLs (dev registry)', async () => {
    const url = 'http://localhost:4311/packages/demo.json';
    const body = JSON.stringify(validManifestPayload);
    const fetched = await fetchAndValidatePackage({
      packageUrl: url,
      fetch: fakeFetch({ [url]: { ok: true, body } }),
    });
    expect(fetched.manifest.id).toBe('demo-connector');
  });

  it('rejects packages whose connectorId does not match the expected id', async () => {
    const url = 'https://example.com/demo.json';
    const body = JSON.stringify(validManifestPayload);
    await expect(
      fetchAndValidatePackage({
        packageUrl: url,
        expectedConnectorId: 'something-else',
        fetch: fakeFetch({ [url]: { ok: true, body } }),
      }),
    ).rejects.toMatchObject({ code: 'CONNECTOR_ID_MISMATCH' });
  });

  it('rejects when the checksum does not match', async () => {
    const url = 'https://example.com/demo.json';
    const body = JSON.stringify(validManifestPayload);
    await expect(
      fetchAndValidatePackage({
        packageUrl: url,
        expectedChecksum: 'deadbeef',
        fetch: fakeFetch({ [url]: { ok: true, body } }),
      }),
    ).rejects.toMatchObject({ code: 'CHECKSUM_MISMATCH' });
  });

  it('rejects non-2xx fetch responses', async () => {
    const url = 'https://example.com/missing.json';
    await expect(
      fetchAndValidatePackage({
        packageUrl: url,
        fetch: fakeFetch({ [url]: { ok: false, status: 404, body: '' } }),
      }),
    ).rejects.toMatchObject({ code: 'PACKAGE_DOWNLOAD_FAILED' });
  });

  it('rejects malformed JSON', async () => {
    const url = 'https://example.com/broken.json';
    await expect(
      fetchAndValidatePackage({
        packageUrl: url,
        fetch: fakeFetch({ [url]: { ok: true, body: 'not json' } }),
      }),
    ).rejects.toMatchObject({ code: 'PACKAGE_PAYLOAD_INVALID' });
  });

  it('rejects manifests that fail the contract schema', async () => {
    const url = 'https://example.com/bad.json';
    await expect(
      fetchAndValidatePackage({
        packageUrl: url,
        fetch: fakeFetch({ [url]: { ok: true, body: JSON.stringify({ manifest: { id: '' } }) } }),
      }),
    ).rejects.toMatchObject({ code: 'MANIFEST_INVALID' });
  });

  it('rejects unrecognised capabilities', async () => {
    const url = 'https://example.com/badcap.json';
    const body = JSON.stringify({
      ...validManifestPayload,
      runtime: {
        ...validManifestPayload.runtime,
        capabilities: ['http.fetch', 'fs.write-everything'],
      },
    });
    await expect(
      fetchAndValidatePackage({
        packageUrl: url,
        fetch: fakeFetch({ [url]: { ok: true, body } }),
      }),
    ).rejects.toMatchObject({ code: 'MANIFEST_INVALID' });
  });

  it('allows runtime metadata to be omitted and uses defaults', async () => {
    const url = 'https://example.com/manifest-only.json';
    const body = JSON.stringify({ manifest: validManifestPayload.manifest });
    const fetched = await fetchAndValidatePackage({
      packageUrl: url,
      fetch: fakeFetch({ [url]: { ok: true, body } }),
    });
    expect(fetched.sdkVersion).toBe('1.0.0');
    expect(fetched.minHostVersion).toBe('1.0.0');
    expect(fetched.entrypoint).toBe('default');
    expect(fetched.executionModel).toBe('worker');
    expect(fetched.capabilities).toEqual([]);
  });

  it('throws CliError specifically so callers can map to structured output', async () => {
    const url = 'https://example.com/bad.json';
    try {
      await fetchAndValidatePackage({
        packageUrl: url,
        fetch: fakeFetch({ [url]: { ok: false, status: 500, body: '' } }),
      });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
    }
  });
});
