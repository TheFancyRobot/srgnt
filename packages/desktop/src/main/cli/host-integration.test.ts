import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LoaderHandshakeResponse } from '@srgnt/contracts';
import { runCli } from './index.js';
import { loadWorkspaceSettings } from './workspace.js';
import { ConnectorPackageHost } from '../connectors/index.js';
import type { SpawnRuntime, LoaderHandshakeMessage } from '../connectors/loader.js';

/**
 * End-to-end coverage that ties the CLI together with the `ConnectorPackageHost`
 * from Step 04. The CLI writes a durable package record; the host (in a later
 * Electron boot) activates and loads it through the isolated worker boundary.
 *
 * These tests exercise the hand-off by running the CLI against a temp
 * workspace, then re-loading the persisted settings through the host exactly
 * the way the main process does at startup. This proves that:
 *   - a CLI-installed package activates through the handshake on success;
 *   - a CLI-installed package fails closed on package-id mismatch;
 *   - uninstall via CLI clears the host-side record on next boot.
 */

const tempDirs: string[] = [];

async function makeWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-cli-host-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

function demoPayload(id = 'demo', version = '1.0.0') {
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
  };
}

function validHandshake(overrides: Partial<LoaderHandshakeResponse> = {}): LoaderHandshakeResponse {
  return {
    protocolVersion: 1,
    connectorId: 'demo',
    packageId: 'demo@1.0.0',
    sdkVersion: '1.0.0',
    minHostVersion: '1.0.0',
    activeCapabilities: ['http.fetch', 'logger'],
    entrypoint: 'default',
    ...overrides,
  };
}

function buildSpawn(message: LoaderHandshakeMessage): SpawnRuntime {
  return vi.fn().mockResolvedValue({
    send: vi.fn().mockResolvedValue(message),
    terminate: vi.fn().mockResolvedValue(undefined),
  });
}

async function installDemoViaCli(workspace: string): Promise<void> {
  const url = 'https://example.com/demo.json';
  const body = JSON.stringify(demoPayload());
  const code = await runCli({
    argv: ['install', url, '--workspace', workspace, '--json'],
    env: {},
    fetch: async (u) => ({ ok: u === url, status: 200, text: async () => body }),
    stdout: () => {},
    stderr: () => {},
    now: () => '2026-04-19T00:00:00.000Z',
  });
  expect(code).toBe(0);
}

describe('CLI -> ConnectorPackageHost handoff', () => {
  it('CLI-installed packages activate through the handshake on next boot', async () => {
    const workspace = await makeWorkspace();
    await installDemoViaCli(workspace);

    const persisted = await loadWorkspaceSettings(workspace);
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({ kind: 'ok', payload: validHandshake() }),
      hostSdkVersion: '1.0.0',
      initialRegistry: persisted.connectors.installedPackages,
    });
    await host.applyRestartRecovery();

    const state = await host.activateAndLoad('demo@1.0.0');
    expect(state.lifecycleState).toBe('loaded');
  });

  it('fail-closed when worker reports a different package id (CONNECTOR_ID_MISMATCH)', async () => {
    const workspace = await makeWorkspace();
    await installDemoViaCli(workspace);

    const persisted = await loadWorkspaceSettings(workspace);
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({
        kind: 'ok',
        payload: validHandshake({ connectorId: 'imposter' }),
      }),
      hostSdkVersion: '1.0.0',
      initialRegistry: persisted.connectors.installedPackages,
    });

    await expect(host.activateAndLoad('demo@1.0.0')).rejects.toMatchObject({
      name: 'LoaderRejectedError',
      code: 'CONNECTOR_ID_MISMATCH',
    });
    expect(host.describePackage('demo@1.0.0')?.lifecycleState).toBe('errored');
  });

  it('fail-closed when worker spawn itself throws (simulated broken package artifact)', async () => {
    const workspace = await makeWorkspace();
    await installDemoViaCli(workspace);

    const persisted = await loadWorkspaceSettings(workspace);
    const host = new ConnectorPackageHost({
      spawnRuntime: vi.fn().mockRejectedValue(new Error('worker entrypoint missing')),
      hostSdkVersion: '1.0.0',
      initialRegistry: persisted.connectors.installedPackages,
    });

    await expect(host.activateAndLoad('demo@1.0.0')).rejects.toMatchObject({
      name: 'LoaderRejectedError',
      code: 'SPAWN_FAILED',
    });
    const desc = host.describePackage('demo@1.0.0');
    expect(desc?.lifecycleState).toBe('errored');
    // error text must be safe to surface: no raw stack, no path leak
    expect(desc?.lastError).toBeDefined();
    expect(desc?.lastError).toContain('Failed to spawn');
  });

  it('fail-closed on incompatible host SDK (package demands newer host than running)', async () => {
    const workspace = await makeWorkspace();
    await installDemoViaCli(workspace);

    const persisted = await loadWorkspaceSettings(workspace);
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({
        kind: 'ok',
        payload: validHandshake({ minHostVersion: '99.0.0' }),
      }),
      hostSdkVersion: '1.0.0',
      initialRegistry: persisted.connectors.installedPackages,
    });

    await expect(host.activateAndLoad('demo@1.0.0')).rejects.toMatchObject({
      code: 'SDK_UNSUPPORTED',
    });
    expect(host.describePackage('demo@1.0.0')?.lifecycleState).toBe('errored');
  });

  it('uninstall via CLI leaves the host with no record on next boot', async () => {
    const workspace = await makeWorkspace();
    await installDemoViaCli(workspace);

    const removeCode = await runCli({
      argv: ['remove', 'demo@1.0.0', '--workspace', workspace, '--json'],
      env: {},
      stdout: () => {},
      stderr: () => {},
    });
    expect(removeCode).toBe(0);

    const persisted = await loadWorkspaceSettings(workspace);
    const host = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({ kind: 'ok', payload: validHandshake() }),
      hostSdkVersion: '1.0.0',
      initialRegistry: persisted.connectors.installedPackages,
    });
    expect(host.listPackages()).toHaveLength(0);
  });

  it('restart recovery does NOT auto-activate a previously broken CLI-installed package', async () => {
    const workspace = await makeWorkspace();
    await installDemoViaCli(workspace);

    const persisted = await loadWorkspaceSettings(workspace);
    const host1 = new ConnectorPackageHost({
      spawnRuntime: vi.fn().mockRejectedValue(new Error('boom')),
      hostSdkVersion: '1.0.0',
      initialRegistry: persisted.connectors.installedPackages,
      persistRegistry: async () => {},
    });
    await expect(host1.activateAndLoad('demo@1.0.0')).rejects.toBeInstanceOf(Error);
    expect(host1.describePackage('demo@1.0.0')?.lifecycleState).toBe('errored');

    // Simulate a fresh boot — host seeded from the "errored" record.
    const rebootState = {
      packages: host1.listPackages(),
    };
    const host2 = new ConnectorPackageHost({
      spawnRuntime: buildSpawn({ kind: 'ok', payload: validHandshake() }),
      hostSdkVersion: '1.0.0',
      initialRegistry: rebootState,
    });
    await host2.applyRestartRecovery();
    // restart recovery MUST leave errored records alone — no tight restart loop.
    expect(host2.describePackage('demo@1.0.0')?.lifecycleState).toBe('errored');
  });
});
