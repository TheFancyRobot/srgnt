import { describe, expect, it } from 'vitest';
import type { DesktopSettings } from '@srgnt/contracts';
import { defaultDesktopSettings, mergeDesktopSettings } from '../settings.js';
import { runInspect, runInstall, runList, runRemove } from './commands.js';
import type { FetchFn } from './fetch.js';

const fixedNow = '2026-04-19T12:00:00.000Z';

function validPayload(id = 'demo', version = '1.0.0', overrides: Record<string, unknown> = {}) {
  return {
    manifest: {
      id,
      name: id,
      version,
      description: `${id} connector`,
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
    ...overrides,
  };
}

function createFakeSettingsStore(initial?: DesktopSettings) {
  let state: DesktopSettings = initial ? mergeDesktopSettings(initial) : mergeDesktopSettings(defaultDesktopSettings);
  return {
    loadSettings: async () => state,
    persistSettings: async (next: DesktopSettings) => {
      state = mergeDesktopSettings(next);
    },
    peek: () => state,
  };
}

function fakeFetch(map: Record<string, { ok: boolean; status?: number; body: string }>): FetchFn {
  return async (url: string) => {
    const entry = map[url];
    if (!entry) throw new Error(`unexpected fetch ${url}`);
    return {
      ok: entry.ok,
      status: entry.status ?? (entry.ok ? 200 : 500),
      text: async () => entry.body,
    };
  };
}

describe('runInstall', () => {
  it('persists a verified installed-connector-package record', async () => {
    const store = createFakeSettingsStore();
    const url = 'https://example.com/demo.json';
    const result = await runInstall(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
        fetch: fakeFetch({ [url]: { ok: true, body: JSON.stringify(validPayload()) } }),
      },
      { packageUrl: url },
    );

    expect(result.kind).toBe('installed');
    if (result.kind !== 'installed') return;
    expect(result.packageId).toBe('demo@1.0.0');
    expect(result.verificationStatus).toBe('verified');
    expect(result.lifecycleState).toBe('installed');

    const persisted = store.peek();
    expect(persisted.connectors.installedPackages.packages).toHaveLength(1);
    const record = persisted.connectors.installedPackages.packages[0];
    expect(record.packageId).toBe('demo@1.0.0');
    expect(record.installedAt).toBe(fixedNow);
    expect(record.sourceUrl).toBe(url);
    expect(record.checksum).toBeDefined();
  });

  it('returns a structured error for connector-id mismatch', async () => {
    const store = createFakeSettingsStore();
    const url = 'https://example.com/demo.json';
    const result = await runInstall(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
        fetch: fakeFetch({ [url]: { ok: true, body: JSON.stringify(validPayload('real-id')) } }),
      },
      { packageUrl: url, expectedConnectorId: 'something-else' },
    );

    expect(result.kind).toBe('install-error');
    if (result.kind !== 'install-error') return;
    expect(result.code).toBe('CONNECTOR_ID_MISMATCH');
    expect(store.peek().connectors.installedPackages.packages).toHaveLength(0);
  });

  it('returns a structured error for a checksum mismatch', async () => {
    const store = createFakeSettingsStore();
    const url = 'https://example.com/demo.json';
    const result = await runInstall(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
        fetch: fakeFetch({ [url]: { ok: true, body: JSON.stringify(validPayload()) } }),
      },
      { packageUrl: url, expectedChecksum: 'deadbeef' },
    );

    expect(result.kind).toBe('install-error');
    if (result.kind !== 'install-error') return;
    expect(result.code).toBe('CHECKSUM_MISMATCH');
    expect(store.peek().connectors.installedPackages.packages).toHaveLength(0);
  });

  it('upserts an existing package and refreshes checksum/sdk version', async () => {
    const store = createFakeSettingsStore();
    const url = 'https://example.com/demo.json';

    // install v1
    await runInstall(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
        fetch: fakeFetch({ [url]: { ok: true, body: JSON.stringify(validPayload()) } }),
      },
      { packageUrl: url },
    );
    // re-install same id with new sdk version
    const body2 = JSON.stringify(validPayload('demo', '1.0.0', {
      runtime: { sdkVersion: '1.1.0', minHostVersion: '1.0.0', entrypoint: 'default', executionModel: 'worker', capabilities: ['logger'] },
    }));
    const result = await runInstall(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => '2026-04-20T00:00:00.000Z',
        fetch: fakeFetch({ [url]: { ok: true, body: body2 } }),
      },
      { packageUrl: url },
    );

    expect(result.kind).toBe('installed');
    const persisted = store.peek().connectors.installedPackages.packages;
    expect(persisted).toHaveLength(1);
    expect(persisted[0].sdkVersion).toBe('1.1.0');
    // installedAt stays as original
    expect(persisted[0].installedAt).toBe(fixedNow);
  });
});

describe('runRemove', () => {
  it('removes an installed package', async () => {
    const store = createFakeSettingsStore({
      ...defaultDesktopSettings,
      connectors: {
        ...defaultDesktopSettings.connectors,
        installedPackages: {
          packages: [
            {
              packageId: 'demo@1.0.0',
              connectorId: 'demo',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://example.com/demo.json',
              installedAt: fixedNow,
              verificationStatus: 'verified',
              lifecycleState: 'installed',
              executionModel: 'worker',
            },
          ],
        },
      },
    });

    const result = await runRemove(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
      },
      { packageId: 'demo@1.0.0' },
    );

    expect(result.kind).toBe('removed');
    expect(store.peek().connectors.installedPackages.packages).toHaveLength(0);
  });

  it('returns a structured error when the package is not found', async () => {
    const store = createFakeSettingsStore();
    const result = await runRemove(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
      },
      { packageId: 'missing@1.0.0' },
    );

    expect(result.kind).toBe('remove-error');
    if (result.kind !== 'remove-error') return;
    expect(result.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('removes packages that are in an errored state (broken packages stay inspectable+removable)', async () => {
    const store = createFakeSettingsStore({
      ...defaultDesktopSettings,
      connectors: {
        ...defaultDesktopSettings.connectors,
        installedPackages: {
          packages: [
            {
              packageId: 'broken@1.0.0',
              connectorId: 'broken',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://example.com/broken.json',
              installedAt: fixedNow,
              verificationStatus: 'verified',
              lifecycleState: 'errored',
              lastError: 'handshake timeout',
              executionModel: 'worker',
            },
          ],
        },
      },
    });

    const result = await runRemove(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
      },
      { packageId: 'broken@1.0.0' },
    );

    expect(result.kind).toBe('removed');
    expect(store.peek().connectors.installedPackages.packages).toHaveLength(0);
  });
});

describe('runList', () => {
  it('lists installed packages with lifecycle + verification state', async () => {
    const store = createFakeSettingsStore({
      ...defaultDesktopSettings,
      connectors: {
        ...defaultDesktopSettings.connectors,
        installedPackages: {
          packages: [
            {
              packageId: 'demo@1.0.0',
              connectorId: 'demo',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://example.com/demo.json',
              installedAt: fixedNow,
              verificationStatus: 'verified',
              lifecycleState: 'installed',
              executionModel: 'worker',
            },
            {
              packageId: 'broken@1.0.0',
              connectorId: 'broken',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://example.com/broken.json',
              installedAt: fixedNow,
              verificationStatus: 'verified',
              lifecycleState: 'errored',
              lastError: 'handshake timeout',
              executionModel: 'worker',
            },
          ],
        },
      },
    });

    const result = await runList({
      loadSettings: store.loadSettings,
      persistSettings: store.persistSettings,
      now: () => fixedNow,
    });

    expect(result.kind).toBe('list');
    expect(result.packages).toHaveLength(2);
    const lifecycles = result.packages.map((p) => p.lifecycleState).sort();
    expect(lifecycles).toEqual(['errored', 'installed']);
  });

  it('returns an empty list when there are no installed packages', async () => {
    const store = createFakeSettingsStore();
    const result = await runList({
      loadSettings: store.loadSettings,
      persistSettings: store.persistSettings,
      now: () => fixedNow,
    });
    expect(result.kind).toBe('list');
    expect(result.packages).toEqual([]);
  });
});

describe('runInspect', () => {
  it('returns a detailed inspect payload with host-only source URL', async () => {
    const store = createFakeSettingsStore({
      ...defaultDesktopSettings,
      connectors: {
        ...defaultDesktopSettings.connectors,
        installedPackages: {
          packages: [
            {
              packageId: 'demo@1.0.0',
              connectorId: 'demo',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://private.example.com/path/with/secret?token=abc123',
              installedAt: fixedNow,
              verificationStatus: 'verified',
              lifecycleState: 'installed',
              executionModel: 'worker',
              checksum: 'abc123',
            },
          ],
        },
      },
    });

    const result = await runInspect(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
      },
      { packageId: 'demo@1.0.0' },
    );

    expect(result.kind).toBe('inspect');
    if (result.kind !== 'inspect') return;
    expect(result.packageId).toBe('demo@1.0.0');
    expect(result.sourceHost).toBe('https://private.example.com');
    // Critically, token must NOT appear anywhere in the returned payload
    expect(JSON.stringify(result)).not.toContain('token=');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('allows looking up by connector id', async () => {
    const store = createFakeSettingsStore({
      ...defaultDesktopSettings,
      connectors: {
        ...defaultDesktopSettings.connectors,
        installedPackages: {
          packages: [
            {
              packageId: 'demo@1.0.0',
              connectorId: 'demo',
              packageVersion: '1.0.0',
              sdkVersion: '1.0.0',
              minHostVersion: '1.0.0',
              sourceUrl: 'https://example.com/demo.json',
              installedAt: fixedNow,
              verificationStatus: 'verified',
              lifecycleState: 'installed',
              executionModel: 'worker',
            },
          ],
        },
      },
    });

    const result = await runInspect(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
      },
      { packageId: 'demo' },
    );

    expect(result.kind).toBe('inspect');
  });

  it('returns a structured error when the package is not found', async () => {
    const store = createFakeSettingsStore();
    const result = await runInspect(
      {
        loadSettings: store.loadSettings,
        persistSettings: store.persistSettings,
        now: () => fixedNow,
      },
      { packageId: 'missing' },
    );
    expect(result.kind).toBe('inspect-error');
    if (result.kind !== 'inspect-error') return;
    expect(result.code).toBe('PACKAGE_NOT_FOUND');
  });
});
