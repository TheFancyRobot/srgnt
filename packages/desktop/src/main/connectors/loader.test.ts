import { describe, it, expect, vi } from 'vitest';
import type {
  InstalledConnectorPackage,
  LoaderHandshakeFailure,
  LoaderHandshakeResponse,
} from '@srgnt/contracts';
import {
  LoaderRejectedError,
  SafePackageLoader,
  type LoaderHandshakeMessage,
  type LoaderRuntime,
  type SpawnRuntime,
} from './loader.js';

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

function validResponse(overrides: Partial<LoaderHandshakeResponse> = {}): LoaderHandshakeResponse {
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

function stubRuntime(message: LoaderHandshakeMessage | Promise<LoaderHandshakeMessage>): {
  runtime: LoaderRuntime;
  send: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn().mockImplementation(async () => message);
  const terminate = vi.fn().mockResolvedValue(undefined);
  return {
    runtime: { send, terminate },
    send,
    terminate,
  };
}

describe('SafePackageLoader', () => {
  it('loads a valid package through the fail-closed handshake', async () => {
    const pkg = samplePackage();
    const { runtime, send } = stubRuntime({ kind: 'ok', payload: validResponse() });
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);

    const loader = new SafePackageLoader({ spawn });
    const loaded = await loader.load({
      package: pkg,
      hostSdkVersion: '1.0.0',
      grantedCapabilities: ['http.fetch', 'logger', 'crypto.randomUUID', 'workspace.root'],
    });

    expect(loaded.package).toBe(pkg);
    expect(loaded.handshake.connectorId).toBe('jira');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('rejects when spawn throws', async () => {
    const spawn: SpawnRuntime = vi.fn().mockRejectedValue(new Error('worker boot failed'));
    const loader = new SafePackageLoader({ spawn });
    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch'],
      }),
    ).rejects.toMatchObject({
      name: 'LoaderRejectedError',
      code: 'SPAWN_FAILED',
    });
  });

  it('rejects when runtime reports a handshake failure', async () => {
    const failurePayload: LoaderHandshakeFailure = {
      protocolVersion: 1,
      code: 'ENTRYPOINT_MISSING',
      message: 'Entrypoint file not found',
    };
    const { runtime, terminate } = stubRuntime({ kind: 'fail', payload: failurePayload });
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);
    const loader = new SafePackageLoader({ spawn });

    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch'],
      }),
    ).rejects.toMatchObject({
      name: 'LoaderRejectedError',
      code: 'ENTRYPOINT_MISSING',
    });
    expect(terminate).toHaveBeenCalled();
  });

  it('rejects malformed handshake response payload as ENTRYPOINT_SHAPE_INVALID', async () => {
    const { runtime, terminate } = stubRuntime({ kind: 'ok', payload: { foo: 'bar' } as unknown as LoaderHandshakeResponse });
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);
    const loader = new SafePackageLoader({ spawn });

    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch'],
      }),
    ).rejects.toMatchObject({
      code: 'ENTRYPOINT_SHAPE_INVALID',
    });
    expect(terminate).toHaveBeenCalled();
  });

  it('rejects when connectorId mismatches', async () => {
    const response = validResponse({ connectorId: 'outlook' });
    const { runtime } = stubRuntime({ kind: 'ok', payload: response });
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);
    const loader = new SafePackageLoader({ spawn });
    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch', 'logger'],
      }),
    ).rejects.toMatchObject({ code: 'CONNECTOR_ID_MISMATCH' });
  });

  it('rejects when packageId mismatches', async () => {
    const response = validResponse({ packageId: 'jira-connector@2.0.0' });
    const { runtime } = stubRuntime({ kind: 'ok', payload: response });
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);
    const loader = new SafePackageLoader({ spawn });
    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch', 'logger'],
      }),
    ).rejects.toMatchObject({ code: 'PACKAGE_ID_MISMATCH' });
  });

  it('rejects when runtime requires a newer host SDK than available', async () => {
    const response = validResponse({ minHostVersion: '2.0.0' });
    const { runtime } = stubRuntime({ kind: 'ok', payload: response });
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);
    const loader = new SafePackageLoader({ spawn });
    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch', 'logger'],
      }),
    ).rejects.toMatchObject({ code: 'SDK_UNSUPPORTED' });
  });

  it('rejects when runtime claims a capability that was not granted', async () => {
    const response = validResponse({ activeCapabilities: ['http.fetch', 'workspace.root'] });
    const { runtime } = stubRuntime({ kind: 'ok', payload: response });
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);
    const loader = new SafePackageLoader({ spawn });
    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch'],
      }),
    ).rejects.toMatchObject({ code: 'CAPABILITY_DENIED' });
  });

  it('times out a hung handshake and terminates the runtime', async () => {
    const hung = new Promise<LoaderHandshakeMessage>(() => {}); // never resolves
    const { runtime, terminate } = stubRuntime(hung);
    const spawn: SpawnRuntime = vi.fn().mockResolvedValue(runtime);
    const loader = new SafePackageLoader({ spawn, handshakeTimeoutMs: 10 });

    await expect(
      loader.load({
        package: samplePackage(),
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch'],
      }),
    ).rejects.toMatchObject({ code: 'HANDSHAKE_TIMEOUT' });
    expect(terminate).toHaveBeenCalled();
  });

  it('refuses to load a package whose verificationStatus is failed', async () => {
    const pkg = samplePackage({ verificationStatus: 'failed', lifecycleState: 'errored', lastError: 'bad checksum' });
    const spawn: SpawnRuntime = vi.fn();
    const loader = new SafePackageLoader({ spawn });

    await expect(
      loader.load({
        package: pkg,
        hostSdkVersion: '1.0.0',
        grantedCapabilities: ['http.fetch'],
      }),
    ).rejects.toBeInstanceOf(LoaderRejectedError);
    expect(spawn).not.toHaveBeenCalled();
  });
});
