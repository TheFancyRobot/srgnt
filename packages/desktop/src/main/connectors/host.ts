import type {
  ConnectorPackageCapability,
  ConnectorPackageRegistry,
  InstalledConnectorPackage,
} from '@srgnt/contracts';
import { ManagedPackageRegistry, type PersistCallback } from './registry.js';
import {
  LoaderRejectedError,
  SafePackageLoader,
  type LoadedPackage,
  type SafeLoaderOptions,
  type SpawnRuntime,
} from './loader.js';

/**
 * `ConnectorPackageHost` is the privileged desktop-main component that owns
 * the connector package lifecycle: register install records, activate
 * packages, drive the fail-closed loader boundary, and clean up on uninstall.
 *
 * Renderer/preload never see a `LoadedPackage` or `LoaderRuntime`. They only
 * receive the high-level derived state returned from `describe*` helpers,
 * which enforces DEC-0016 isolation at the IPC boundary.
 *
 * The host accepts its dependencies via the constructor so tests can inject
 * stub loaders without touching Electron or worker_threads.
 */

export interface ConnectorPackageHostOptions {
  initialRegistry?: ConnectorPackageRegistry;
  persistRegistry?: PersistCallback;
  spawnRuntime: SpawnRuntime;
  hostSdkVersion: string;
  grantedCapabilities?: readonly ConnectorPackageCapability[];
  loader?: Partial<SafeLoaderOptions>;
  /**
   * Called when a loaded package reports it has crashed after handshake. The
   * host will move the record into `errored` and terminate the runtime.
   */
  onRuntimeCrash?: (packageId: string, reason: string) => void;
}

export interface HighLevelPackageState {
  packageId: string;
  connectorId: string;
  lifecycleState: InstalledConnectorPackage['lifecycleState'];
  verificationStatus: InstalledConnectorPackage['verificationStatus'];
  executionModel: InstalledConnectorPackage['executionModel'];
  packageVersion: InstalledConnectorPackage['packageVersion'];
  sdkVersion: InstalledConnectorPackage['sdkVersion'];
  lastError?: string;
}

const DEFAULT_CAPABILITIES: readonly ConnectorPackageCapability[] = [
  'http.fetch',
  'logger',
  'crypto.randomUUID',
  'workspace.root',
  'credentials.getToken', // token retrieval via privileged host boundary (DEC-0017)
  'files', // filesystem adapter for markdown persistence (Phase 21)
];

// Re-exported for use in tests
export { DEFAULT_CAPABILITIES };

export class ConnectorPackageHost {
  private readonly registry: ManagedPackageRegistry;
  private readonly loader: SafePackageLoader;
  private readonly hostSdkVersion: string;
  private readonly grantedCapabilities: readonly ConnectorPackageCapability[];
  private readonly onRuntimeCrash?: (packageId: string, reason: string) => void;

  private readonly loaded = new Map<string, LoadedPackage>();

  constructor(options: ConnectorPackageHostOptions) {
    this.registry = new ManagedPackageRegistry({
      initial: options.initialRegistry,
      persist: options.persistRegistry,
    });
    this.loader = new SafePackageLoader({
      spawn: options.spawnRuntime,
      handshakeTimeoutMs: options.loader?.handshakeTimeoutMs,
    });
    this.hostSdkVersion = options.hostSdkVersion;
    this.grantedCapabilities = options.grantedCapabilities ?? DEFAULT_CAPABILITIES;
    this.onRuntimeCrash = options.onRuntimeCrash;
  }

  // ---------------------------------------------------------------------------
  // Registry surface — the only persistent state observers see.
  // ---------------------------------------------------------------------------

  listPackages(): InstalledConnectorPackage[] {
    return this.registry.list();
  }

  describePackage(packageId: string): HighLevelPackageState | undefined {
    const pkg = this.registry.get(packageId);
    if (!pkg) return undefined;
    return projectHighLevelState(pkg);
  }

  describeAll(): HighLevelPackageState[] {
    return this.registry.list().map(projectHighLevelState);
  }

  hasPackage(packageId: string): boolean {
    return this.registry.get(packageId) !== undefined;
  }

  async registerInstalledPackage(pkg: InstalledConnectorPackage): Promise<InstalledConnectorPackage> {
    return this.registry.upsert(pkg);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle: activate -> load -> connect. All fail closed.
  // ---------------------------------------------------------------------------

  /**
   * Activate + load a package through the isolated runtime boundary. Returns
   * the high-level state after the attempt. On failure the registry record is
   * set to `errored` with a safe-to-log `lastError` and the method throws a
   * `LoaderRejectedError` so callers can surface the failure to CLI/IPC.
   */
  async activateAndLoad(packageId: string): Promise<HighLevelPackageState> {
    const pkg = this.registry.get(packageId);
    if (!pkg) {
      throw new LoaderRejectedError('PACKAGE_ID_MISMATCH', `Package ${packageId} is not registered`);
    }

    // Transition to `activated` before we spawn anything so diagnostics can
    // tell the difference between "never attempted" and "attempted to load".
    await this.registry.setLifecycleState(packageId, 'activated', '');

    try {
      const loaded = await this.loader.load({
        package: pkg,
        hostSdkVersion: this.hostSdkVersion,
        grantedCapabilities: this.grantedCapabilities,
      });
      this.loaded.set(packageId, loaded);
      const updated = await this.registry.setLifecycleState(packageId, 'loaded', '');
      return projectHighLevelState(updated ?? pkg);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const detail = (error as { detail?: string }).detail;
      const combined = detail ? `${message}: ${detail}` : message;
      await this.registry.setLifecycleState(packageId, 'errored', sanitizeErrorMessage(combined));
      throw error;
    }
  }

  /**
   * Mark a loaded package as connected. Requires the package to be in the
   * `loaded` state; otherwise throws a `LoaderRejectedError` so callers get a
   * structured code they can present to CLI/IPC.
   */
  async markConnected(packageId: string): Promise<HighLevelPackageState> {
    const pkg = this.registry.get(packageId);
    if (!pkg || !this.loaded.has(packageId)) {
      throw new LoaderRejectedError('PACKAGE_ID_MISMATCH', `Package ${packageId} is not loaded`);
    }
    const updated = await this.registry.setLifecycleState(packageId, 'connected', '');
    return projectHighLevelState(updated ?? pkg);
  }

  /**
   * Report a runtime crash after handshake. The host tears down the runtime,
   * removes the in-memory loaded handle, and moves the record into `errored`
   * so restart recovery does NOT auto-reactivate a broken package.
   */
  async reportRuntimeCrash(packageId: string, reason: string): Promise<void> {
    const loaded = this.loaded.get(packageId);
    this.loaded.delete(packageId);
    if (loaded) {
      try {
        await loaded.runtime.terminate();
      } catch {
        // Terminate is best-effort; continue reporting the crash.
      }
    }
    await this.registry.setLifecycleState(packageId, 'errored', sanitizeErrorMessage(reason));
    this.onRuntimeCrash?.(packageId, reason);
  }

  /**
   * Uninstall cleanup: terminate the runtime handle (if any), remove the
   * record from the durable registry, and clear in-memory state. Callers are
   * responsible for deleting on-disk artifacts themselves; this method is the
   * runtime-state side of uninstall only.
   */
  async uninstall(packageId: string): Promise<boolean> {
    const loaded = this.loaded.get(packageId);
    this.loaded.delete(packageId);
    if (loaded) {
      try {
        await loaded.runtime.terminate();
      } catch {
        // best effort
      }
    }
    return this.registry.remove(packageId);
  }

  /**
   * Restart recovery entry point. Runs when desktop main boots and the
   * registry already has records. Packages in `loaded` or `connected` states
   * are reset to `installed` so they require a fresh handshake before they
   * can re-activate. Packages in `errored` states stay in `errored` until a
   * caller explicitly re-activates them — this prevents tight restart loops
   * for broken third-party packages.
   */
  async applyRestartRecovery(): Promise<void> {
    const mutations: Promise<unknown>[] = [];
    for (const pkg of this.registry.list()) {
      if (pkg.lifecycleState === 'loaded' || pkg.lifecycleState === 'connected' || pkg.lifecycleState === 'activated') {
        mutations.push(this.registry.setLifecycleState(pkg.packageId, 'installed'));
      }
    }
    await Promise.all(mutations);
  }

  /**
   * Expose the internal registry for tests and integration glue that needs to
   * inspect the full durable record (not just the high-level projection).
   */
  internalRegistry(): ManagedPackageRegistry {
    return this.registry;
  }

  internalLoadedHandle(packageId: string): LoadedPackage | undefined {
    return this.loaded.get(packageId);
  }
}

export function projectHighLevelState(pkg: InstalledConnectorPackage): HighLevelPackageState {
  return {
    packageId: pkg.packageId,
    connectorId: pkg.connectorId,
    lifecycleState: pkg.lifecycleState,
    verificationStatus: pkg.verificationStatus,
    executionModel: pkg.executionModel,
    packageVersion: pkg.packageVersion,
    sdkVersion: pkg.sdkVersion,
    lastError: pkg.lastError,
  };
}

/**
 * Keep logged error messages safe for local logs and bug reports. Drops
 * anything that looks like a token or absolute filesystem path. Callers that
 * need full-fidelity error reporting should consult the raw thrown error
 * before it reaches the registry.
 */
export function sanitizeErrorMessage(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
  return trimmed
    .replace(/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/(?:[A-Za-z]:)?[\\/](?:[A-Za-z0-9._-]+[\\/]){1,}[A-Za-z0-9._-]+/g, '[redacted-path]')
    .replace(/(token|secret|api[_-]?key)=[^\s]+/gi, '$1=[redacted]');
}
