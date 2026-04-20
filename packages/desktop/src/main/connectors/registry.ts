import {
  type ConnectorPackageRegistry,
  type InstalledConnectorPackage,
  type ConnectorLifecycleState,
} from '@srgnt/contracts';

/**
 * Managed connector package registry — in-memory mirror of the durable
 * `DesktopSettings.connectors.installedPackages` record owned by desktop main.
 *
 * This registry is the single source of truth at runtime for:
 *   - which packages are currently installed on disk,
 *   - their current lifecycle state (installed/verified/activated/loaded/
 *     connected/errored),
 *   - last recorded error text (non-sensitive, safe for logs),
 *   - verification status derived from the install-time handshake.
 *
 * The registry intentionally does not load, execute, or otherwise touch
 * package artifacts — that responsibility belongs to the loader subsystem.
 * Keeping them separated means the registry can be exercised in tests without
 * requiring a real worker/subprocess boundary, and future restart-recovery
 * logic can reason purely about records.
 *
 * Persistence is handled via an injected `persist` callback the host supplies
 * (normally `writeDesktopSettings`). This avoids coupling the registry to
 * Electron's `app` or to filesystem side effects directly.
 */

export type PersistCallback = (next: ConnectorPackageRegistry) => Promise<void>;

export interface ManagedPackageRegistryOptions {
  initial?: ConnectorPackageRegistry;
  persist?: PersistCallback;
}

export class ManagedPackageRegistry {
  private packages = new Map<string, InstalledConnectorPackage>();
  private persist?: PersistCallback;

  constructor(options: ManagedPackageRegistryOptions = {}) {
    this.persist = options.persist;
    const initial = options.initial?.packages ?? [];
    for (const pkg of initial) {
      this.packages.set(pkg.packageId, pkg);
    }
  }

  size(): number {
    return this.packages.size;
  }

  list(): InstalledConnectorPackage[] {
    return Array.from(this.packages.values());
  }

  get(packageId: string): InstalledConnectorPackage | undefined {
    return this.packages.get(packageId);
  }

  getByConnectorId(connectorId: string): InstalledConnectorPackage | undefined {
    for (const pkg of this.packages.values()) {
      if (pkg.connectorId === connectorId) {
        return pkg;
      }
    }
    return undefined;
  }

  snapshot(): ConnectorPackageRegistry {
    return { packages: this.list() };
  }

  async upsert(pkg: InstalledConnectorPackage): Promise<InstalledConnectorPackage> {
    this.packages.set(pkg.packageId, pkg);
    await this.flush();
    return pkg;
  }

  async remove(packageId: string): Promise<boolean> {
    const existed = this.packages.delete(packageId);
    if (existed) {
      await this.flush();
    }
    return existed;
  }

  /**
   * Updates the lifecycle state of a package and optionally its `lastError`.
   * Returns the updated record, or undefined if the package is not tracked.
   *
   * The caller is responsible for enforcing legal state transitions; the
   * registry itself deliberately does not police transitions because the host
   * coordinates activation/loading/connection across async boundaries.
   */
  async setLifecycleState(
    packageId: string,
    lifecycleState: ConnectorLifecycleState,
    lastError?: string,
  ): Promise<InstalledConnectorPackage | undefined> {
    const existing = this.packages.get(packageId);
    if (!existing) return undefined;

    const next: InstalledConnectorPackage = {
      ...existing,
      lifecycleState,
      // Only overwrite lastError if the caller explicitly passed one (including
      // empty string to clear). Keeping the value sticky across state updates
      // lets `errored -> installed` recovery retain the last failure for
      // diagnostics until a successful handshake.
      ...(lastError !== undefined ? { lastError: lastError || undefined } : {}),
    };

    this.packages.set(packageId, next);
    await this.flush();
    return next;
  }

  async clearLastError(packageId: string): Promise<InstalledConnectorPackage | undefined> {
    const existing = this.packages.get(packageId);
    if (!existing) return undefined;
    const next: InstalledConnectorPackage = { ...existing };
    delete (next as { lastError?: string }).lastError;
    this.packages.set(packageId, next);
    await this.flush();
    return next;
  }

  private async flush(): Promise<void> {
    if (!this.persist) return;
    await this.persist(this.snapshot());
  }
}
