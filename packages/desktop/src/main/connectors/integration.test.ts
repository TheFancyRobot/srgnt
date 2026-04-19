import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  InstalledConnectorPackage,
  LoaderHandshakeResponse,
} from '@srgnt/contracts';
import { ConnectorPackageHost } from './host.js';
import type { LoaderHandshakeMessage, SpawnRuntime } from './loader.js';
import {
  defaultDesktopSettings,
  mergeDesktopSettings,
  readDesktopSettings,
  writeDesktopSettings,
} from '../settings.js';

const tempPaths: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempPaths.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((entry) => fs.rm(entry, { recursive: true, force: true })));
});

function samplePackage(overrides: Partial<InstalledConnectorPackage> = {}): InstalledConnectorPackage {
  return {
    packageId: 'custom-connector@1.0.0',
    connectorId: 'custom',
    packageVersion: '1.0.0',
    sdkVersion: '1.0.0',
    minHostVersion: '1.0.0',
    sourceUrl: 'https://example.com/custom-connector.tgz',
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
    connectorId: 'custom',
    packageId: 'custom-connector@1.0.0',
    sdkVersion: '1.0.0',
    minHostVersion: '1.0.0',
    activeCapabilities: ['http.fetch', 'logger'],
    entrypoint: 'default',
    ...overrides,
  };
}

function buildSpawn(message: LoaderHandshakeMessage): { spawn: SpawnRuntime; terminate: ReturnType<typeof vi.fn> } {
  const terminate = vi.fn().mockResolvedValue(undefined);
  const spawn: SpawnRuntime = vi.fn().mockResolvedValue({
    send: vi.fn().mockResolvedValue(message),
    terminate,
  });
  return { spawn, terminate };
}

describe('ConnectorPackageHost <-> settings persistence', () => {
  it('persists installed packages through writeDesktopSettings', async () => {
    const workspaceRoot = await makeTempDir('srgnt-host-persist-');
    // Simulate the main-process persistRegistry callback.
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({ kind: 'ok', payload: validHandshake() }).spawn,
      hostSdkVersion: '1.0.0',
      persistRegistry: async (snapshot) => {
        const next = mergeDesktopSettings({
          ...defaultDesktopSettings,
          connectors: {
            ...defaultDesktopSettings.connectors,
            installedPackages: snapshot,
          },
        });
        await writeDesktopSettings(workspaceRoot, next);
      },
    });

    await host.registerInstalledPackage(samplePackage());
    const read = await readDesktopSettings(workspaceRoot);
    expect(read.connectors.installedPackages.packages).toHaveLength(1);
    expect(read.connectors.installedPackages.packages[0].packageId).toBe('custom-connector@1.0.0');
  });

  it('uninstall flushes the removal to disk', async () => {
    const workspaceRoot = await makeTempDir('srgnt-host-uninstall-');
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({ kind: 'ok', payload: validHandshake() }).spawn,
      hostSdkVersion: '1.0.0',
      persistRegistry: async (snapshot) => {
        const next = mergeDesktopSettings({
          ...defaultDesktopSettings,
          connectors: {
            ...defaultDesktopSettings.connectors,
            installedPackages: snapshot,
          },
        });
        await writeDesktopSettings(workspaceRoot, next);
      },
    });

    await host.registerInstalledPackage(samplePackage());
    await host.uninstall('custom-connector@1.0.0');

    const read = await readDesktopSettings(workspaceRoot);
    expect(read.connectors.installedPackages.packages).toHaveLength(0);
  });

  it('seeds from persisted settings on restart and downgrades loaded/connected records to installed', async () => {
    const workspaceRoot = await makeTempDir('srgnt-host-restart-');
    // Pretend a previous run left a package in `connected` state on disk.
    const seeded = mergeDesktopSettings({
      ...defaultDesktopSettings,
      connectors: {
        ...defaultDesktopSettings.connectors,
        installedPackages: {
          packages: [
            samplePackage({ lifecycleState: 'connected' }),
            samplePackage({ packageId: 'broken@1.0.0', connectorId: 'broken', lifecycleState: 'errored', lastError: 'prev boom' }),
          ],
        },
      },
    });
    await writeDesktopSettings(workspaceRoot, seeded);

    // Simulate a fresh boot that reads settings and seeds the host.
    const persisted = await readDesktopSettings(workspaceRoot);
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({ kind: 'ok', payload: validHandshake() }).spawn,
      hostSdkVersion: '1.0.0',
      initialRegistry: persisted.connectors.installedPackages,
    });
    await host.applyRestartRecovery();

    expect(host.describePackage('custom-connector@1.0.0')?.lifecycleState).toBe('installed');
    expect(host.describePackage('broken@1.0.0')?.lifecycleState).toBe('errored');
    expect(host.describePackage('broken@1.0.0')?.lastError).toBe('prev boom');
  });
});

describe('high-level state exposed to renderer does not leak executable details', () => {
  it('describeAll omits sourceUrl, installedAt, minHostVersion', () => {
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({ kind: 'ok', payload: validHandshake() }).spawn,
      hostSdkVersion: '1.0.0',
      initialRegistry: {
        packages: [samplePackage()],
      },
    });

    const states = host.describeAll();
    expect(states).toHaveLength(1);
    const state = states[0];
    expect(state).not.toHaveProperty('sourceUrl');
    expect(state).not.toHaveProperty('installedAt');
    expect(state).not.toHaveProperty('minHostVersion');
    expect(state.packageId).toBe('custom-connector@1.0.0');
  });
});
