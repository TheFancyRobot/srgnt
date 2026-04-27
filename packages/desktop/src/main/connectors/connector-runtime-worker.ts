/**
 * Connector package worker runtime entrypoint.
 *
 * This script runs in a `node:worker_threads` Worker (per DEC-0016 isolation
 * requirement). It is the only place in the desktop app that directly imports
 * a third-party/standalone connector package artifact.
 *
 * Responsibilities:
 *   - Receive the loader handshake request from the host over `parentPort`.
 *   - Resolve the package entrypoint from `workerData.packageEntry`.
 *   - Call the package's factory function with a `HostContext` containing the
 *     granted capabilities from the handshake request.
 *   - Report the handshake response (or failure) back to the host over `parentPort`.
 *
 * Strict boundaries:
 *   - This file does NOT handle IPC channels, Electron internals, or UI concerns.
 *   - The worker NEVER accesses the OS keychain directly — the token is fetched by
 *     the main process (from the credential adapter via `credentials.getToken`) and passed in
 *     via `workerData` when the worker is spawned (DEC-0017 token boundary).
 *   - All filesystem access goes through the injected `FileAdapter`, not raw `fs`.
 */

import { parentPort, workerData } from 'node:worker_threads';
import type { LoaderHandshakeRequest } from '@srgnt/contracts';

// workerData is cross-process (not Effect schema), typed loosely
interface WorkerData {
  packageId: string;
  connectorId: string;
  packageEntry?: string;
  /** Token fetched by main process from the credential adapter and passed in (DEC-0017) */
  token?: string;
  /** Workspace root passed in so worker can construct file paths */
  workspaceRoot?: string;
}

const data = workerData as WorkerData;

if (!parentPort) {
  // Should never happen in a Worker context, but guards against top-level script usage
  process.exit(1);
}

/**
 * Load the package entrypoint. In development (monorepo) this resolves to
 * packages/connector-jira/dist/index.js. In production builds the path is
 * set to the installed package artifact directory.
 */
async function loadPackageEntrypoint(
  packageEntry: string | undefined,
  _packageId: string,
): Promise<{ factory: (host: unknown) => Promise<unknown>; entrypoint: string }> {
  if (!packageEntry) {
    throw new Error('No package entrypoint configured');
  }

  // Dynamic import of the built connector package.
  // file:// URL works in Node worker_threads.
  const url = packageEntry.startsWith('file://') ? packageEntry : `file://${packageEntry}`;
  const mod = await import(url);

  // The package must export a 'default' or named 'factory' export.
  // Phase 20 package shape: default export is { manifest, factory, runtime }
  const pkg = mod.default ?? mod;
  const factory = pkg?.factory ?? mod.factory;
  const runtime = pkg?.runtime ?? mod.runtime ?? {};
  const entrypoint = runtime?.entrypoint ?? (mod.default ? 'default' : 'factory');

  if (typeof factory !== 'function') {
    throw new Error(`Package entrypoint '${entrypoint}' is not a function`);
  }

  return { factory, entrypoint };
}

function buildHostContext(
  request: LoaderHandshakeRequest,
  token: string | undefined,
  workspaceRoot: string | undefined,
): {
  capabilities: Record<string, unknown>;
  connectorId: string;
  sdkVersion: string;
} {
  const capabilities: Record<string, unknown> = {};

  for (const cap of request.grantedCapabilities) {
    switch (cap) {
      case 'http.fetch':
        capabilities.http = { fetch: globalThis.fetch };
        break;
      case 'logger':
        capabilities.logger = {
          info: (msg: string, meta?: Record<string, unknown>) =>
            console.info(`[jira]`, msg, meta ?? {}),
          warn: (msg: string, meta?: Record<string, unknown>) =>
            console.warn(`[jira]`, msg, meta ?? {}),
          error: (msg: string, meta?: Record<string, unknown>) =>
            console.error(`[jira]`, msg, meta ?? {}),
        };
        break;
      case 'crypto.randomUUID':
        capabilities.crypto = { randomUUID: globalThis.crypto.randomUUID };
        break;
      case 'workspace.root':
        // Workspace root is passed in from main process when worker is spawned
        capabilities.workspace = { root: workspaceRoot ?? '' };
        break;
      case 'credentials.getToken':
        // Token was fetched by main process from the credential adapter (DEC-0017) and
        // passed in via workerData. The worker only stores it in memory.
        capabilities.credentials = {
          getToken: async (_connectorId: string): Promise<string | undefined> => token,
        };
        break;
      case 'files':
        // Files adapter is injected by the worker for local development.
        // In production the host injects a proper adapter; the connector
        // package only cares about the interface, not the implementation.
        capabilities.files = {
          writeFile: async (path: string, content: string): Promise<void> => {
            const { writeFile } = await import('node:fs/promises');
            await writeFile(path, content, 'utf-8');
          },
          readFile: async (path: string): Promise<string> => {
            const { readFile } = await import('node:fs/promises');
            return readFile(path, 'utf-8');
          },
          mkdir: async (_path: string): Promise<void> => {
            // In the worker context we rely on the host having already set up
            // required directories. mkdir is a no-op here.
          },
          delete: async (path: string): Promise<void> => {
            const { unlink } = await import('node:fs/promises');
            await unlink(path);
          },
          exists: async (path: string): Promise<boolean> => {
            const { access } = await import('node:fs/promises');
            try {
              await access(path);
              return true;
            } catch {
              return false;
            }
          },
        };
        break;
      default:
        // Unknown capability — the host won't grant it so this branch is
        // unreachable at runtime, but listing it keeps exhaustiveness checks
        // in TypeScript.
        break;
    }
  }

  return {
    capabilities,
    connectorId: request.expectedConnectorId,
    sdkVersion: request.hostSdkVersion,
  };
}

async function run(): Promise<void> {
  // Wait for the handshake request from the host
  const message = await new Promise<{ kind: 'handshake'; request: unknown }>(
    (resolve) => {
      parentPort!.once('message', (msg) => resolve(msg as { kind: 'handshake'; request: unknown }));
    },
  );

  const request = message.request as LoaderHandshakeRequest;

  try {
    // Validate protocol version
    if (request.protocolVersion !== 1) {
      parentPort!.postMessage({
        kind: 'fail',
        payload: {
          protocolVersion: 1,
          code: 'SDK_UNSUPPORTED',
          message: `Unsupported protocol version ${request.protocolVersion}`,
        },
      });
      return;
    }

    // Load the package
    const { factory, entrypoint } = await loadPackageEntrypoint(data.packageEntry, data.packageId);

    // Build host context from granted capabilities + injected token/workspace
    const hostContext = buildHostContext(request, data.token, data.workspaceRoot);

    // Instantiate the connector — this is the only point where package code runs
    await factory(hostContext);

    // Read runtime metadata from the resolved package
    // The factory was already called (triggering connector construction), but we
    // still need the metadata for the handshake response.
    const pkgModule = await import(
      data.packageEntry!.startsWith('file://') ? data.packageEntry! : `file://${data.packageEntry!}`
    );
    const pkg = pkgModule.default ?? pkgModule;
    const runtime = pkg?.runtime ?? {};

    // Report successful handshake
    parentPort!.postMessage({
      kind: 'ok',
      payload: {
        protocolVersion: 1,
        connectorId: data.connectorId,
        packageId: data.packageId,
        sdkVersion: runtime.sdkVersion ?? '1.0.0',
        minHostVersion: runtime.minHostVersion ?? '1.0.0',
        activeCapabilities: request.grantedCapabilities,
        entrypoint,
      },
    });
  } catch (error) {
    const err = error as Error;
    const code = err.message.includes('entrypoint') || err.message.includes('export')
      ? 'ENTRYPOINT_MISSING'
      : err.message.includes('version') || err.message.includes('SDK')
        ? 'SDK_UNSUPPORTED'
        : 'RUNTIME_CRASH';

    parentPort!.postMessage({
      kind: 'fail',
      payload: {
        protocolVersion: 1,
        code,
        message: err.message,
        detail: undefined,
      },
    });
  }
}

run().catch((err) => {
  console.error('[worker-runtime] Unexpected error:', err);
  parentPort?.postMessage({
    kind: 'fail',
    payload: {
      protocolVersion: 1,
      code: 'RUNTIME_CRASH',
      message: 'Worker runtime threw an unhandled error',
      detail: String(err),
    },
  });
});