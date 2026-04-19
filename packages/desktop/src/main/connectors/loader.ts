import {
  parseSync,
  SLoaderHandshakeResponse,
  SLoaderHandshakeFailure,
  type ConnectorPackageCapability,
  type InstalledConnectorPackage,
  type LoaderHandshakeRequest,
  type LoaderHandshakeResponse,
  type LoaderHandshakeFailure,
} from '@srgnt/contracts';

/**
 * Fail-closed loader boundary for third-party connector packages.
 *
 * Responsibilities:
 *   - Spawn an isolated runtime (worker/subprocess) per package. DEC-0016
 *     requires that third-party code never execute in Electron main.
 *   - Drive the loader handshake defined by `SLoaderHandshakeRequest` /
 *     `SLoaderHandshakeResponse`.
 *   - Validate that the reported identity, SDK range, and entrypoint shape
 *     match what the host expected. ANY mismatch MUST reject the load and
 *     leave the package disabled with a durable `lastError`.
 *
 * Non-responsibilities:
 *   - Fetching, verifying, or persisting package artifacts. Callers drive the
 *     install flow and pass in a `LoadTarget` for a package that already sits
 *     in the `installed` or `verified` state.
 *   - Long-running invocation of connector factory functions. The loader only
 *     proves that a package *can* be activated. The actual connector instance
 *     creation is delegated to the higher-level host that consumes the loaded
 *     runtime handle.
 *
 * Runtime abstraction:
 *   In order to keep the boundary testable, the loader accepts a `spawn`
 *   callback that returns a `LoaderRuntime`. Production callers inject a
 *   `node:worker_threads`-backed runtime; tests can inject a stub runtime that
 *   returns any handshake payload/failure mode required by the scenario.
 */

export interface LoaderRuntime {
  send(request: LoaderHandshakeRequest): Promise<LoaderHandshakeMessage>;
  terminate(): Promise<void>;
}

export type LoaderHandshakeMessage =
  | { kind: 'ok'; payload: LoaderHandshakeResponse }
  | { kind: 'fail'; payload: LoaderHandshakeFailure };

export type SpawnRuntime = (pkg: InstalledConnectorPackage) => Promise<LoaderRuntime>;

export interface LoadTarget {
  package: InstalledConnectorPackage;
  hostSdkVersion: string;
  grantedCapabilities: readonly ConnectorPackageCapability[];
}

export interface LoadedPackage {
  package: InstalledConnectorPackage;
  runtime: LoaderRuntime;
  handshake: LoaderHandshakeResponse;
}

export class LoaderRejectedError extends Error {
  public readonly code: LoaderHandshakeFailure['code'] | 'SPAWN_FAILED' | 'HANDSHAKE_TIMEOUT';

  constructor(
    code: LoaderRejectedError['code'],
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.code = code;
    this.name = 'LoaderRejectedError';
  }
}

export interface SafeLoaderOptions {
  spawn: SpawnRuntime;
  /** Millis. Defaults to 15s which is generous for cold worker boot. */
  handshakeTimeoutMs?: number;
}

export class SafePackageLoader {
  private readonly spawn: SpawnRuntime;
  private readonly handshakeTimeoutMs: number;

  constructor(options: SafeLoaderOptions) {
    this.spawn = options.spawn;
    this.handshakeTimeoutMs = options.handshakeTimeoutMs ?? 15000;
  }

  /**
   * Boot an isolated runtime for the target package and walk it through the
   * loader handshake. Returns the loaded package on success. Throws a
   * `LoaderRejectedError` on ANY failure — the caller is responsible for
   * moving the registry record into `errored` with the error code/message.
   */
  async load(target: LoadTarget): Promise<LoadedPackage> {
    // 1. Fail closed on malformed package records BEFORE we spawn anything.
    this.assertInstallableRecord(target.package);

    // 2. Spawn the isolated runtime. Any throw here is treated as a spawn
    //    failure; the package never reaches the handshake stage.
    let runtime: LoaderRuntime;
    try {
      runtime = await this.spawn(target.package);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new LoaderRejectedError('SPAWN_FAILED', 'Failed to spawn isolated connector runtime', reason);
    }

    // 3. Send the handshake request with a timeout so a hung runtime cannot
    //    wedge the host forever.
    const request: LoaderHandshakeRequest = {
      protocolVersion: 1,
      expectedConnectorId: target.package.connectorId,
      expectedPackageId: target.package.packageId,
      hostSdkVersion: target.hostSdkVersion,
      grantedCapabilities: [...target.grantedCapabilities],
    };

    let message: LoaderHandshakeMessage;
    try {
      message = await withTimeout(
        runtime.send(request),
        this.handshakeTimeoutMs,
        () => new LoaderRejectedError('HANDSHAKE_TIMEOUT', 'Loader handshake timed out before runtime responded'),
      );
    } catch (error) {
      await safeTerminate(runtime);
      if (error instanceof LoaderRejectedError) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      throw new LoaderRejectedError('RUNTIME_CRASH', 'Runtime rejected the handshake before completion', reason);
    }

    // 4. Drive fail-closed validation of the handshake response.
    if (message.kind === 'fail') {
      await safeTerminate(runtime);
      let validated: LoaderHandshakeFailure;
      try {
        validated = parseSync(SLoaderHandshakeFailure, message.payload);
      } catch {
        throw new LoaderRejectedError('RUNTIME_CRASH', 'Runtime returned a malformed failure payload');
      }
      throw new LoaderRejectedError(validated.code, validated.message, validated.detail);
    }

    let response: LoaderHandshakeResponse;
    try {
      response = parseSync(SLoaderHandshakeResponse, message.payload);
    } catch {
      await safeTerminate(runtime);
      throw new LoaderRejectedError('ENTRYPOINT_SHAPE_INVALID', 'Runtime returned a malformed handshake response');
    }

    this.assertIdentityMatches(target, response);
    this.assertCapabilitiesAreSubset(target, response);

    return { package: target.package, runtime, handshake: response };
  }

  private assertInstallableRecord(pkg: InstalledConnectorPackage): void {
    if (pkg.verificationStatus === 'failed') {
      throw new LoaderRejectedError('SDK_UNSUPPORTED', 'Package verification previously failed; refusing to load', pkg.lastError);
    }

    if (pkg.lifecycleState === 'errored' && pkg.verificationStatus !== 'verified') {
      throw new LoaderRejectedError('SDK_UNSUPPORTED', 'Package is in an errored state without fresh verification', pkg.lastError);
    }
  }

  private assertIdentityMatches(target: LoadTarget, response: LoaderHandshakeResponse): void {
    if (response.connectorId !== target.package.connectorId) {
      throw new LoaderRejectedError(
        'CONNECTOR_ID_MISMATCH',
        `Runtime reported connectorId=${response.connectorId} but package is ${target.package.connectorId}`,
      );
    }
    if (response.packageId !== target.package.packageId) {
      throw new LoaderRejectedError(
        'PACKAGE_ID_MISMATCH',
        `Runtime reported packageId=${response.packageId} but package is ${target.package.packageId}`,
      );
    }

    // The reported minimum host SDK version must not exceed what the host
    // actually runs. We compare as simple semver tuples; malformed versions
    // would have been rejected already by schema decoding.
    if (semverGreaterThan(response.minHostVersion, target.hostSdkVersion)) {
      throw new LoaderRejectedError(
        'SDK_UNSUPPORTED',
        `Package requires host SDK >= ${response.minHostVersion} but host is ${target.hostSdkVersion}`,
      );
    }
  }

  private assertCapabilitiesAreSubset(target: LoadTarget, response: LoaderHandshakeResponse): void {
    const granted = new Set(target.grantedCapabilities);
    for (const cap of response.activeCapabilities) {
      if (!granted.has(cap)) {
        throw new LoaderRejectedError(
          'CAPABILITY_DENIED',
          `Runtime claimed capability ${cap} that was not granted by host`,
        );
      }
    }
  }
}

async function safeTerminate(runtime: LoaderRuntime): Promise<void> {
  try {
    await runtime.terminate();
  } catch {
    // swallow — we're already on the error path.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  if (ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function semverGreaterThan(a: string, b: string): boolean {
  const parseParts = (version: string): number[] => version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const partsA = parseParts(a);
  const partsB = parseParts(b);
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index += 1) {
    const left = partsA[index] ?? 0;
    const right = partsB[index] ?? 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}
