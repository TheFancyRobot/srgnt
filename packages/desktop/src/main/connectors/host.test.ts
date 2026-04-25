import { describe, it, expect, vi } from 'vitest';
import type { InstalledConnectorPackage, LoaderHandshakeResponse } from '@srgnt/contracts';
import { ConnectorPackageHost, sanitizeErrorMessage, DEFAULT_CAPABILITIES } from './host.js';
import type { LoaderHandshakeMessage, SpawnRuntime } from './loader.js';

function samplePackage(overrides: Partial<InstalledConnectorPackage> = {}): InstalledConnectorPackage {
  return {
    packageId: 'jira-connector@1.0.0',
    connectorId: 'jira',
    packageVersion: '1.0.0',
    sdkVersion: '1.0.0',
    minHostVersion: '1.0.0',
    sourceUrl: 'https://example.com/jira-connector.tgz',
    installedAt: '2026-04-19T00:00:00.000Z',
    verificationStatus: 'verified',
    lifecycleState: 'installed',
    executionModel: 'worker',
    ...overrides,
  };
}

function validHandshake(overrides: Partial<LoaderHandshakeResponse> = {}): LoaderHandshakeResponse {
  return {
    protocolVersion: 1,
    connectorId: 'jira',
    packageId: 'jira-connector@1.0.0',
    sdkVersion: '1.0.0',
    minHostVersion: '1.0.0',
    activeCapabilities: ['http.fetch', 'logger'],
    entrypoint: 'default',
    ...overrides,
  };
}

function buildSpawn(message: LoaderHandshakeMessage | Error): { spawn: SpawnRuntime; terminate: ReturnType<typeof vi.fn> } {
  const terminate = vi.fn().mockResolvedValue(undefined);
  const spawn: SpawnRuntime = vi.fn().mockImplementation(async () => {
    if (message instanceof Error) throw message;
    return {
      send: vi.fn().mockResolvedValue(message),
      terminate,
    };
  });
  return { spawn, terminate };
}

describe('ConnectorPackageHost lifecycle', () => {
  it('registers an installed package and projects safe high-level state', async () => {
    const { spawn } = buildSpawn({ kind: 'ok', payload: validHandshake() });
    const host = new ConnectorPackageHost({
      spawnRuntime: spawn,
      hostSdkVersion: '1.0.0',
    });

    await host.registerInstalledPackage(samplePackage());
    const state = host.describePackage('jira-connector@1.0.0');
    expect(state).toMatchObject({
      packageId: 'jira-connector@1.0.0',
      connectorId: 'jira',
      lifecycleState: 'installed',
    });
    // High-level state must NOT leak sourceUrl or installedAt.
    expect(state).not.toHaveProperty('sourceUrl');
    expect(state).not.toHaveProperty('installedAt');
  });

  it('persists lifecycle transitions through the persist callback', async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const { spawn } = buildSpawn({ kind: 'ok', payload: validHandshake() });
    const host = new ConnectorPackageHost({
      persistRegistry: persist,
      spawnRuntime: spawn,
      hostSdkVersion: '1.0.0',
    });

    await host.registerInstalledPackage(samplePackage());
    await host.activateAndLoad('jira-connector@1.0.0');

    // First persist for register, then activate -> activated, then activate -> loaded
    const states = persist.mock.calls.map((call) => call[0].packages[0]?.lifecycleState);
    expect(states).toEqual(['installed', 'activated', 'loaded']);
  });

  it('moves a package to errored and keeps sanitised lastError on handshake failure', async () => {
    const { spawn } = buildSpawn({
      kind: 'fail',
      payload: { protocolVersion: 1, code: 'ENTRYPOINT_MISSING', message: 'missing entry in /home/u/.srgnt/packages/foo.js' },
    });
    const host = new ConnectorPackageHost({ spawnRuntime: spawn, hostSdkVersion: '1.0.0' });
    await host.registerInstalledPackage(samplePackage());

    await expect(host.activateAndLoad('jira-connector@1.0.0')).rejects.toMatchObject({
      code: 'ENTRYPOINT_MISSING',
    });

    const state = host.describePackage('jira-connector@1.0.0');
    expect(state?.lifecycleState).toBe('errored');
    expect(state?.lastError).toBeTruthy();
    // Path should be redacted from error text.
    expect(state?.lastError).not.toContain('/home/u');
  });

  it('uninstall removes registry record and terminates loaded runtime', async () => {
    const { spawn, terminate } = buildSpawn({ kind: 'ok', payload: validHandshake() });
    const host = new ConnectorPackageHost({ spawnRuntime: spawn, hostSdkVersion: '1.0.0' });
    await host.registerInstalledPackage(samplePackage());
    await host.activateAndLoad('jira-connector@1.0.0');

    const removed = await host.uninstall('jira-connector@1.0.0');
    expect(removed).toBe(true);
    expect(terminate).toHaveBeenCalled();
    expect(host.describePackage('jira-connector@1.0.0')).toBeUndefined();
  });

  it('uninstall is safe to call while the package is unloaded', async () => {
    const { spawn, terminate } = buildSpawn({ kind: 'ok', payload: validHandshake() });
    const host = new ConnectorPackageHost({ spawnRuntime: spawn, hostSdkVersion: '1.0.0' });
    await host.registerInstalledPackage(samplePackage());

    const removed = await host.uninstall('jira-connector@1.0.0');
    expect(removed).toBe(true);
    expect(terminate).not.toHaveBeenCalled();
  });

  it('markConnected transitions a loaded package to connected', async () => {
    const { spawn } = buildSpawn({ kind: 'ok', payload: validHandshake() });
    const host = new ConnectorPackageHost({ spawnRuntime: spawn, hostSdkVersion: '1.0.0' });
    await host.registerInstalledPackage(samplePackage());
    await host.activateAndLoad('jira-connector@1.0.0');
    const state = await host.markConnected('jira-connector@1.0.0');
    expect(state.lifecycleState).toBe('connected');
  });

  it('DEFAULT_CAPABILITIES includes credentials.getToken and files', () => {
    // The host uses DEFAULT_CAPABILITIES as grantedCapabilities unless overridden.
    // Verify the defaults include all Phase 21 required capabilities.
    expect(DEFAULT_CAPABILITIES).toContain('credentials.getToken');
    expect(DEFAULT_CAPABILITIES).toContain('files');
    expect(DEFAULT_CAPABILITIES).toContain('http.fetch');
    expect(DEFAULT_CAPABILITIES).toContain('workspace.root');
  });

  it('markConnected refuses if the package is not loaded', async () => {
    const { spawn } = buildSpawn({ kind: 'ok', payload: validHandshake() });
    const host = new ConnectorPackageHost({ spawnRuntime: spawn, hostSdkVersion: '1.0.0' });
    await host.registerInstalledPackage(samplePackage());
    await expect(host.markConnected('jira-connector@1.0.0')).rejects.toMatchObject({
      code: 'PACKAGE_ID_MISMATCH',
    });
  });

  it('reportRuntimeCrash moves the package to errored and terminates runtime', async () => {
    const { spawn, terminate } = buildSpawn({ kind: 'ok', payload: validHandshake() });
    const onRuntimeCrash = vi.fn();
    const host = new ConnectorPackageHost({
      spawnRuntime: spawn,
      hostSdkVersion: '1.0.0',
      onRuntimeCrash,
    });
    await host.registerInstalledPackage(samplePackage());
    await host.activateAndLoad('jira-connector@1.0.0');

    await host.reportRuntimeCrash('jira-connector@1.0.0', 'abort(sig=9) token=super-secret');
    expect(terminate).toHaveBeenCalled();
    const state = host.describePackage('jira-connector@1.0.0');
    expect(state?.lifecycleState).toBe('errored');
    expect(state?.lastError).toContain('token=[redacted]');
    expect(onRuntimeCrash).toHaveBeenCalled();
  });

  it('applyRestartRecovery moves loaded/connected/activated packages back to installed', async () => {
    const host = new ConnectorPackageHost({
      initialRegistry: {
        packages: [
          samplePackage({ packageId: 'a@1.0.0', connectorId: 'alpha', lifecycleState: 'connected' }),
          samplePackage({ packageId: 'b@1.0.0', connectorId: 'bravo', lifecycleState: 'loaded' }),
          samplePackage({ packageId: 'c@1.0.0', connectorId: 'charlie', lifecycleState: 'activated' }),
          samplePackage({ packageId: 'd@1.0.0', connectorId: 'delta', lifecycleState: 'errored', lastError: 'previous boom' }),
          samplePackage({ packageId: 'e@1.0.0', connectorId: 'echo', lifecycleState: 'installed' }),
        ],
      },
      spawnRuntime: vi.fn(),
      hostSdkVersion: '1.0.0',
    });

    await host.applyRestartRecovery();
    expect(host.describePackage('a@1.0.0')?.lifecycleState).toBe('installed');
    expect(host.describePackage('b@1.0.0')?.lifecycleState).toBe('installed');
    expect(host.describePackage('c@1.0.0')?.lifecycleState).toBe('installed');
    expect(host.describePackage('d@1.0.0')?.lifecycleState).toBe('errored');
    expect(host.describePackage('d@1.0.0')?.lastError).toBe('previous boom');
    expect(host.describePackage('e@1.0.0')?.lifecycleState).toBe('installed');
  });

  it('activateAndLoad refuses to load a record that was never registered', async () => {
    const host = new ConnectorPackageHost({ spawnRuntime: vi.fn(), hostSdkVersion: '1.0.0' });
    await expect(host.activateAndLoad('ghost@0.0.1')).rejects.toMatchObject({
      code: 'PACKAGE_ID_MISMATCH',
    });
  });

  it('spawn failures leave the registry in errored with a safe lastError', async () => {
    const spawn: SpawnRuntime = vi.fn().mockRejectedValue(new Error('worker boot failed /tmp/x token=abc'));
    const host = new ConnectorPackageHost({ spawnRuntime: spawn, hostSdkVersion: '1.0.0' });
    await host.registerInstalledPackage(samplePackage());
    await expect(host.activateAndLoad('jira-connector@1.0.0')).rejects.toMatchObject({ code: 'SPAWN_FAILED' });
    const state = host.describePackage('jira-connector@1.0.0');
    expect(state?.lifecycleState).toBe('errored');
    expect(state?.lastError).toContain('[redacted-path]');
    expect(state?.lastError).toContain('token=[redacted]');
  });
});

describe('sanitizeErrorMessage', () => {
  it('redacts emails, paths, and token-like values', () => {
    const raw = 'Failed at /home/user/.srgnt/package.js for a@b.com token=xyz';
    const sanitized = sanitizeErrorMessage(raw);
    expect(sanitized).toContain('[redacted-email]');
    expect(sanitized).toContain('[redacted-path]');
    expect(sanitized).toContain('token=[redacted]');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeErrorMessage('')).toBe('');
  });

  it('truncates very long messages to keep logs bounded', () => {
    const raw = 'a'.repeat(800);
    expect(sanitizeErrorMessage(raw).length).toBeLessThanOrEqual(401);
  });
});
