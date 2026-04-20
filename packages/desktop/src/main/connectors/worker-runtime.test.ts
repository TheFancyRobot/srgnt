import { afterAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  InstalledConnectorPackage,
  LoaderHandshakeRequest,
} from '@srgnt/contracts';
import { createWorkerSpawn, nullSpawn } from './worker-runtime.js';

function samplePackage(overrides: Partial<InstalledConnectorPackage> = {}): InstalledConnectorPackage {
  return {
    packageId: 'example@1.0.0',
    connectorId: 'example',
    packageVersion: '1.0.0',
    sdkVersion: '0.1.0',
    minHostVersion: '0.1.0',
    sourceUrl: 'https://example.com/pkg.json',
    installedAt: '2026-04-19T00:00:00.000Z',
    verificationStatus: 'verified',
    lifecycleState: 'installed',
    executionModel: 'worker',
    ...overrides,
  };
}

function sampleRequest(): LoaderHandshakeRequest {
  return {
    protocolVersion: 1,
    expectedConnectorId: 'example',
    expectedPackageId: 'example@1.0.0',
    hostSdkVersion: '0.1.0',
    grantedCapabilities: ['http.fetch', 'logger'],
  };
}

describe('nullSpawn', () => {
  it('rejects with a deterministic configuration error', async () => {
    await expect(nullSpawn(samplePackage())).rejects.toThrow(
      /Connector package host is not configured with an active spawn runtime/,
    );
  });
});

describe('createWorkerSpawn', () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srgnt-worker-runtime-'));

  function writeWorker(name: string, body: string): string {
    const p = path.join(fixtureDir, `${name}.mjs`);
    fs.writeFileSync(p, body);
    return p;
  }

  afterAll(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  const okWorker = (() =>
    writeWorker(
      'worker-ok',
      `
import { parentPort, workerData } from 'node:worker_threads';
parentPort.once('message', () => {
  parentPort.postMessage({
    kind: 'ok',
    payload: {
      protocolVersion: 1,
      connectorId: workerData.connectorId,
      packageId: workerData.packageId,
      sdkVersion: '0.1.0',
      minHostVersion: '0.1.0',
      activeCapabilities: [],
      entrypoint: 'connectorPackage',
    },
  });
});
`,
    ))();

  const failWorker = (() =>
    writeWorker(
      'worker-fail',
      `
import { parentPort } from 'node:worker_threads';
parentPort.once('message', () => {
  parentPort.postMessage({
    kind: 'fail',
    payload: {
      protocolVersion: 1,
      code: 'ENTRYPOINT_MISSING',
      message: 'no default export',
    },
  });
});
`,
    ))();

  const nonObjectWorker = (() =>
    writeWorker(
      'worker-nonobject',
      `
import { parentPort } from 'node:worker_threads';
parentPort.once('message', () => {
  parentPort.postMessage('just-a-string');
});
`,
    ))();

  const badKindWorker = (() =>
    writeWorker(
      'worker-badkind',
      `
import { parentPort } from 'node:worker_threads';
parentPort.once('message', () => {
  parentPort.postMessage({ kind: 'definitely-not-a-real-kind' });
});
`,
    ))();

  const exitBeforeHandshakeWorker = (() =>
    writeWorker(
      'worker-exit',
      `
process.exit(7);
`,
    ))();

  it('round-trips an ok handshake payload', async () => {
    const spawn = createWorkerSpawn({ workerEntryPath: okWorker });
    const runtime = await spawn(samplePackage());
    try {
      const message = await runtime.send(sampleRequest());
      expect(message.kind).toBe('ok');
      if (message.kind === 'ok') {
        expect(message.payload.connectorId).toBe('example');
        expect(message.payload.packageId).toBe('example@1.0.0');
        expect(message.payload.entrypoint).toBe('connectorPackage');
      }
    } finally {
      await runtime.terminate();
    }
  });

  it('forwards a fail handshake payload', async () => {
    const spawn = createWorkerSpawn({ workerEntryPath: failWorker });
    const runtime = await spawn(samplePackage());
    try {
      const message = await runtime.send(sampleRequest());
      expect(message.kind).toBe('fail');
      if (message.kind === 'fail') {
        expect(message.payload.code).toBe('ENTRYPOINT_MISSING');
      }
    } finally {
      await runtime.terminate();
    }
  });

  it('rejects a non-object handshake message', async () => {
    const spawn = createWorkerSpawn({ workerEntryPath: nonObjectWorker });
    const runtime = await spawn(samplePackage());
    try {
      await expect(runtime.send(sampleRequest())).rejects.toThrow(
        /non-object handshake message/,
      );
    } finally {
      await runtime.terminate();
    }
  });

  it('rejects an unknown handshake message kind', async () => {
    const spawn = createWorkerSpawn({ workerEntryPath: badKindWorker });
    const runtime = await spawn(samplePackage());
    try {
      await expect(runtime.send(sampleRequest())).rejects.toThrow(
        /unrecognised handshake message kind/,
      );
    } finally {
      await runtime.terminate();
    }
  });

  it('rejects when the worker exits with non-zero before handshake', async () => {
    const spawn = createWorkerSpawn({ workerEntryPath: exitBeforeHandshakeWorker });
    const runtime = await spawn(samplePackage());
    await expect(runtime.send(sampleRequest())).rejects.toThrow(
      /Worker exited with code 7 before handshake completed/,
    );
  });

  it('terminate() resolves even when the worker is still idle', async () => {
    const spawn = createWorkerSpawn({ workerEntryPath: okWorker });
    const runtime = await spawn(samplePackage());
    await expect(runtime.terminate()).resolves.toBeUndefined();
  });

  it('passes resolvePackageEntry output into workerData so the worker can observe it', async () => {
    const echoWorker = writeWorker(
      'worker-echo-entry',
      `
import { parentPort, workerData } from 'node:worker_threads';
parentPort.once('message', () => {
  parentPort.postMessage({
    kind: 'ok',
    payload: {
      protocolVersion: 1,
      connectorId: workerData.connectorId,
      packageId: workerData.packageId,
      sdkVersion: '0.1.0',
      minHostVersion: '0.1.0',
      activeCapabilities: [],
      entrypoint: workerData.packageEntry ?? 'missing',
    },
  });
});
`,
    );
    const spawn = createWorkerSpawn({
      workerEntryPath: echoWorker,
      resolvePackageEntry: (pkg) => `/fake/entry/for/${pkg.packageId}`,
    });
    const runtime = await spawn(samplePackage());
    try {
      const message = await runtime.send(sampleRequest());
      expect(message.kind).toBe('ok');
      if (message.kind === 'ok') {
        expect(message.payload.entrypoint).toBe('/fake/entry/for/example@1.0.0');
      }
    } finally {
      await runtime.terminate();
    }
  });
});
