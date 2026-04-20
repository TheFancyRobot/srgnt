import type {
  ConnectorPackageRegistry,
  DesktopSettings,
  InstalledConnectorPackage,
} from '@srgnt/contracts';
import { ManagedPackageRegistry, sanitizeErrorMessage } from '../connectors/index.js';
import {
  fetchAndValidatePackage,
  type FetchFn,
  type FetchedPackage,
} from './fetch.js';
import { CliError } from './workspace.js';
import {
  hostOnly,
  type InspectErrorResult,
  type InspectResult,
  type InstallErrorResult,
  type InstallSuccessResult,
  type ListResult,
  type RemoveErrorResult,
  type RemoveSuccessResult,
} from './output.js';

/**
 * Dependencies injected into each command so tests can exercise the full CLI
 * surface without touching disk, network, or the workspace filesystem.
 */
export interface CommandDeps {
  loadSettings(): Promise<DesktopSettings>;
  persistSettings(next: DesktopSettings): Promise<void>;
  now(): string; // ISO timestamp, injectable for deterministic tests
  fetch?: FetchFn;
}

export interface InstallArgs {
  packageUrl: string;
  expectedConnectorId?: string;
  expectedChecksum?: string;
}

export interface RemoveArgs {
  packageId: string;
}

export interface InspectArgs {
  packageId: string;
}

/**
 * Install a connector package from an explicit URL/reference. Verifies the
 * remote payload, persists a durable record, and lets the Electron main boot
 * the isolated runtime on next activate — the CLI does NOT spin up a worker
 * itself (CLI runs outside Electron and cannot own the runtime boundary).
 */
export async function runInstall(deps: CommandDeps, args: InstallArgs): Promise<InstallSuccessResult | InstallErrorResult> {
  try {
    const fetched = await fetchAndValidatePackage({
      packageUrl: args.packageUrl,
      expectedConnectorId: args.expectedConnectorId,
      expectedChecksum: args.expectedChecksum,
      fetch: deps.fetch,
    });

    const settings = await deps.loadSettings();
    const registry = new ManagedPackageRegistry({ initial: settings.connectors.installedPackages });
    const packageId = derivePackageId(fetched);

    const existing = registry.get(packageId);
    if (existing) {
      // Re-install path: upsert preserves installedAt so operators can replace
      // a corrupted install without rewriting history.
      const next = upsertRecord(existing, fetched, args.packageUrl);
      await registry.upsert(next);
    } else {
      const record = buildRecord(fetched, packageId, args.packageUrl, deps.now());
      await registry.upsert(record);
    }

    const nextSettings: DesktopSettings = {
      ...settings,
      connectors: {
        ...settings.connectors,
        installedPackages: registry.snapshot(),
      },
    };
    await deps.persistSettings(nextSettings);

    const finalRecord = registry.get(packageId);
    if (!finalRecord) {
      return {
        kind: 'install-error',
        code: 'INSTALL_PERSIST_FAILED',
        message: `Package ${packageId} was not persisted after install.`,
      };
    }

    return {
      kind: 'installed',
      packageId: finalRecord.packageId,
      connectorId: finalRecord.connectorId,
      packageVersion: finalRecord.packageVersion,
      verificationStatus: finalRecord.verificationStatus,
      lifecycleState: finalRecord.lifecycleState,
      checksum: finalRecord.checksum ?? '',
    };
  } catch (error) {
    if (error instanceof CliError) {
      return {
        kind: 'install-error',
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: 'install-error',
      code: 'INSTALL_FAILED',
      message,
    };
  }
}

export async function runRemove(deps: CommandDeps, args: RemoveArgs): Promise<RemoveSuccessResult | RemoveErrorResult> {
  const settings = await deps.loadSettings();
  const registry = new ManagedPackageRegistry({ initial: settings.connectors.installedPackages });
  const record = registry.get(args.packageId);

  if (!record) {
    return {
      kind: 'remove-error',
      code: 'PACKAGE_NOT_FOUND',
      message: `No installed package with id ${args.packageId}`,
    };
  }

  const removed = await registry.remove(args.packageId);
  if (!removed) {
    return {
      kind: 'remove-error',
      code: 'REMOVE_FAILED',
      message: `Failed to remove package ${args.packageId}`,
    };
  }

  const nextSettings: DesktopSettings = {
    ...settings,
    connectors: {
      ...settings.connectors,
      installedPackages: registry.snapshot(),
    },
  };
  await deps.persistSettings(nextSettings);

  return {
    kind: 'removed',
    packageId: record.packageId,
    connectorId: record.connectorId,
  };
}

export async function runList(deps: CommandDeps): Promise<ListResult> {
  const settings = await deps.loadSettings();
  const pkgs: readonly InstalledConnectorPackage[] = settings.connectors.installedPackages.packages;
  return {
    kind: 'list',
    packages: pkgs.map((pkg) => ({
      packageId: pkg.packageId,
      connectorId: pkg.connectorId,
      packageVersion: pkg.packageVersion,
      lifecycleState: pkg.lifecycleState,
      verificationStatus: pkg.verificationStatus,
      executionModel: pkg.executionModel,
      lastError: pkg.lastError ? sanitizeErrorMessage(pkg.lastError) : undefined,
    })),
  };
}

export async function runInspect(deps: CommandDeps, args: InspectArgs): Promise<InspectResult | InspectErrorResult> {
  const settings = await deps.loadSettings();
  const packages = settings.connectors.installedPackages.packages;
  const record = packages.find((pkg) => pkg.packageId === args.packageId || pkg.connectorId === args.packageId);

  if (!record) {
    return {
      kind: 'inspect-error',
      code: 'PACKAGE_NOT_FOUND',
      message: `No installed package matches id ${args.packageId}`,
    };
  }

  return {
    kind: 'inspect',
    packageId: record.packageId,
    connectorId: record.connectorId,
    packageVersion: record.packageVersion,
    sdkVersion: record.sdkVersion,
    minHostVersion: record.minHostVersion,
    sourceHost: hostOnly(record.sourceUrl),
    installedAt: record.installedAt,
    lifecycleState: record.lifecycleState,
    verificationStatus: record.verificationStatus,
    executionModel: record.executionModel,
    checksum: record.checksum,
    lastError: record.lastError ? sanitizeErrorMessage(record.lastError) : undefined,
  };
}

function derivePackageId(fetched: FetchedPackage): string {
  return `${fetched.manifest.id}@${fetched.manifest.version}`;
}

function buildRecord(
  fetched: FetchedPackage,
  packageId: string,
  sourceUrl: string,
  nowIso: string,
): InstalledConnectorPackage {
  return {
    packageId,
    connectorId: fetched.manifest.id,
    packageVersion: fetched.packageVersion,
    sdkVersion: fetched.sdkVersion,
    minHostVersion: fetched.minHostVersion,
    sourceUrl,
    installedAt: nowIso,
    checksum: fetched.checksum,
    verificationStatus: 'verified',
    lifecycleState: 'installed',
    executionModel: fetched.executionModel,
  };
}

function upsertRecord(
  existing: InstalledConnectorPackage,
  fetched: FetchedPackage,
  sourceUrl: string,
): InstalledConnectorPackage {
  return {
    ...existing,
    sourceUrl,
    checksum: fetched.checksum,
    sdkVersion: fetched.sdkVersion,
    minHostVersion: fetched.minHostVersion,
    packageVersion: fetched.packageVersion,
    executionModel: fetched.executionModel,
    verificationStatus: 'verified',
    lifecycleState: 'installed',
    lastError: undefined,
  };
}

export type { ConnectorPackageRegistry };
