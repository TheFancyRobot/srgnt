import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  parseSync,
  SConnectorManifest,
  type ConnectorManifest,
} from '@srgnt/contracts';

export interface ConnectorDefinition {
  manifest: ConnectorManifest;
  packageUrl?: string;
  entityCounts?: Record<string, number>;
}

export interface RegistryConnectorResponse {
  manifest: ConnectorManifest;
  packagePath?: string;
  packageUrl?: string;
  entityCounts?: Record<string, number>;
}

export interface RegistryCatalogResponse {
  connectors: RegistryConnectorResponse[];
}

export interface ParseConnectorCatalogOptions {
  /** Base URL used when parsing an HTTP catalog response with packagePath entries. */
  baseUrl?: string;
  /** Directory containing catalog.json and packages/*.json when parsing a disk catalog. */
  sourcePath?: string;
}

export function parseConnectorCatalogPayload(
  rawPayload: unknown,
  options: ParseConnectorCatalogOptions = {},
): Record<string, ConnectorDefinition> {
  const parsedPayload = rawPayload as RegistryCatalogResponse;
  const entries = Array.isArray(parsedPayload?.connectors) ? parsedPayload.connectors : [];
  const nextDefinitions: Record<string, ConnectorDefinition> = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const manifest = parseSync(SConnectorManifest, entry.manifest);
    const packageUrl = resolveConnectorPackageUrl(entry, options);

    nextDefinitions[manifest.id] = {
      manifest,
      packageUrl,
      entityCounts: entry.entityCounts,
    };
  }

  return nextDefinitions;
}

export function resolveConnectorPackageUrl(
  entry: Pick<RegistryConnectorResponse, 'packagePath' | 'packageUrl'>,
  options: ParseConnectorCatalogOptions = {},
): string | undefined {
  if (entry.packageUrl) {
    return entry.packageUrl;
  }

  if (!entry.packagePath) {
    return undefined;
  }

  if (options.sourcePath) {
    return pathToFileURL(resolveDiskPackagePath(options.sourcePath, entry.packagePath)).toString();
  }

  if (!options.baseUrl) {
    return undefined;
  }

  return new URL(entry.packagePath, options.baseUrl).toString();
}

export function resolveDiskPackagePath(sourcePath: string, packagePath: string): string {
  const normalized = packagePath.split('?')[0] ?? packagePath;
  const registryPackagePrefix = '/connectors/packages/';

  if (normalized.startsWith(registryPackagePrefix)) {
    return path.join(sourcePath, 'packages', normalized.slice(registryPackagePrefix.length));
  }

  if (normalized.startsWith('/')) {
    return path.join(sourcePath, normalized.slice(1));
  }

  return path.resolve(sourcePath, normalized);
}

export async function chooseConnectorDefinitions(options: {
  loadDisk: () => Promise<Record<string, ConnectorDefinition>>;
  fetchRemote?: () => Promise<Record<string, ConnectorDefinition>>;
  buildBuiltins: () => Record<string, ConnectorDefinition>;
  warn?: (message: string, error?: unknown) => void;
}): Promise<Record<string, ConnectorDefinition>> {
  const diskDefinitions = await options.loadDisk().catch((error) => {
    options.warn?.('[main] connector local catalog load failed', error);
    return {};
  });
  if (Object.keys(diskDefinitions).length > 0) {
    return diskDefinitions;
  }

  if (options.fetchRemote) {
    try {
      const remoteDefinitions = await options.fetchRemote();
      if (Object.keys(remoteDefinitions).length > 0) {
        return remoteDefinitions;
      }
      throw new Error('Empty catalog payload.');
    } catch (error) {
      options.warn?.('[main] connector catalog fetch failed, using built-in catalog', error);
    }
  }

  return options.buildBuiltins();
}
