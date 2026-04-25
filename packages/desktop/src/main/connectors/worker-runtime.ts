import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import type {
  InstalledConnectorPackage,
  LoaderHandshakeRequest,
} from '@srgnt/contracts';
import type { LoaderRuntime, LoaderHandshakeMessage, SpawnRuntime } from './loader.js';

/**
 * Token and workspace context needed by the worker runtime to inject into
 * the HostContext. Retrieved by the main process at spawn time (DEC-0017:
 * token lives in OS keychain, only the main process can fetch it).
 */
export interface WorkerSpawnContext {
  /** Jira API token from OS keychain (undefined if not yet configured) */
  token?: string;
  /** Workspace root path for markdown file persistence */
  workspaceRoot: string;
}

export interface CreateWorkerSpawnOptions {
  /**
   * Absolute path to the worker entrypoint JS file. Defaults to the bundled
   * path next to the compiled main entry: `dist/main/connector-runtime-worker.js`.
   */
  workerEntryPath?: string;
  /**
   * Optional override for the package artifact root directory. Used by tests
   * to point at fixture packages.
   */
  resolvePackageEntry?: (pkg: InstalledConnectorPackage) => string;
  /**
   * Called at spawn time to get the token + workspace context. Main process
   * fetches the Jira token from OS keychain here (DEC-0017 boundary).
   * Credentials must NEVER be stored in the package record or serialized.
   */
  getSpawnContext?: (pkg: InstalledConnectorPackage) => Promise<WorkerSpawnContext>;
}

export function createWorkerSpawn(options: CreateWorkerSpawnOptions = {}): SpawnRuntime {
  const workerEntryPath = options.workerEntryPath
    ?? path.join(__dirname, 'connector-runtime-worker.js');

  return async function workerSpawn(pkg: InstalledConnectorPackage): Promise<LoaderRuntime> {
    const packageEntry = options.resolvePackageEntry?.(pkg);

    // Resolve token + workspace at spawn time (DEC-0017: fetch from keychain here)
    const spawnContext = options.getSpawnContext
      ? await options.getSpawnContext(pkg)
      : { workspaceRoot: process.cwd() };

    const worker = new Worker(workerEntryPath, {
      workerData: {
        packageId: pkg.packageId,
        connectorId: pkg.connectorId,
        packageEntry,
        token: spawnContext.token,
        workspaceRoot: spawnContext.workspaceRoot,
      },
      // Keep the worker sandboxed: no stdin sharing, no env leakage.
      env: {},
      // Default resource limits keep a crashing package from taking down host.
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 64,
      },
    });

    return {
      async send(request: LoaderHandshakeRequest): Promise<LoaderHandshakeMessage> {
        return new Promise<LoaderHandshakeMessage>((resolve, reject) => {
          const onMessage = (value: unknown): void => {
            cleanup();
            if (!value || typeof value !== 'object') {
              reject(new Error('Worker sent a non-object handshake message'));
              return;
            }
            const candidate = value as { kind?: unknown };
            if (candidate.kind !== 'ok' && candidate.kind !== 'fail') {
              reject(new Error('Worker sent an unrecognised handshake message kind'));
              return;
            }
            resolve(value as LoaderHandshakeMessage);
          };

          const onError = (error: Error): void => {
            cleanup();
            reject(error);
          };

          const onExit = (code: number): void => {
            cleanup();
            if (code !== 0) {
              reject(new Error(`Worker exited with code ${code} before handshake completed`));
            }
          };

          const cleanup = (): void => {
            worker.off('message', onMessage);
            worker.off('error', onError);
            worker.off('exit', onExit);
          };

          worker.once('message', onMessage);
          worker.once('error', onError);
          worker.once('exit', onExit);
          worker.postMessage({ kind: 'handshake', request });
        });
      },
      async terminate(): Promise<void> {
        try {
          await worker.terminate();
        } catch {
          // best-effort termination
        }
      },
    };
  };
}

/**
 * Null spawn used when no third-party packages are expected (or when the
 * worker script is not available). Always rejects with a deterministic error
 * so the loader moves the record into `errored` instead of silently failing.
 */
export const nullSpawn: SpawnRuntime = async () => {
  throw new Error('Connector package host is not configured with an active spawn runtime');
};
