import { createHash } from 'node:crypto';
import {
  parseSync,
  SConnectorManifest,
  SConnectorPackageCapability,
  type ConnectorManifest,
  type ConnectorPackageCapability,
} from '@srgnt/contracts';
import { CliError } from './workspace.js';

/**
 * Abstract fetch boundary so tests can inject stub responses without network
 * access. The production callsite uses the global `fetch` implementation.
 */
export type FetchFn = (url: string) => Promise<FetchResult>;

export interface FetchResult {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

/**
 * Validated remote package payload. Fields not in the manifest (sdk version,
 * entrypoint, execution model) may be embedded in the package JSON for the CLI
 * v1 flow; callers should supply explicit defaults when they are absent.
 */
export interface FetchedPackage {
  manifest: ConnectorManifest;
  rawText: string;
  rawPayload: unknown;
  checksum: string; // sha256 of rawText
  packageVersion: string;
  sdkVersion: string;
  minHostVersion: string;
  entrypoint: string;
  executionModel: 'worker' | 'subprocess';
  capabilities: readonly ConnectorPackageCapability[];
}

/** Default SDK/runtime fields when a dev package payload does not specify. */
const DEFAULT_SDK_VERSION = '1.0.0';
const DEFAULT_MIN_HOST_VERSION = '1.0.0';
const DEFAULT_ENTRYPOINT = 'default';
const DEFAULT_EXECUTION_MODEL: 'worker' = 'worker';

export interface FetchAndValidateOptions {
  packageUrl: string;
  expectedConnectorId?: string;
  expectedChecksum?: string;
  fetch?: FetchFn;
}

/**
 * Download a remote connector package payload, verify its shape, and compute
 * an integrity checksum the host can persist. The CLI treats the returned
 * `FetchedPackage` as the canonical install-time record — downstream callers
 * only see the derived durable `InstalledConnectorPackage`.
 *
 * Fail-closed rules:
 *   - non-2xx fetch -> `PACKAGE_DOWNLOAD_FAILED`;
 *   - malformed JSON -> `PACKAGE_PAYLOAD_INVALID`;
 *   - manifest fails schema -> `MANIFEST_INVALID`;
 *   - connector id does not match `expectedConnectorId` -> `CONNECTOR_ID_MISMATCH`;
 *   - checksum mismatch when caller supplied one -> `CHECKSUM_MISMATCH`;
 *   - non-https URLs are rejected unless the URL is explicitly on localhost
 *     (dev-connectors flow) -> `PACKAGE_URL_INSECURE`.
 */
export async function fetchAndValidatePackage(options: FetchAndValidateOptions): Promise<FetchedPackage> {
  assertSafeUrl(options.packageUrl);

  const fetchImpl: FetchFn = options.fetch ?? (async (url) => {
    const res = await fetch(url);
    return {
      ok: res.ok,
      status: res.status,
      text: () => res.text(),
    } satisfies FetchResult;
  });

  let result: FetchResult;
  try {
    result = await fetchImpl(options.packageUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError('PACKAGE_DOWNLOAD_FAILED', `Failed to download package: ${options.packageUrl}`, message);
  }

  if (!result.ok) {
    throw new CliError(
      'PACKAGE_DOWNLOAD_FAILED',
      `Package download returned HTTP ${result.status} for ${options.packageUrl}`,
    );
  }

  const rawText = await result.text();
  const checksum = sha256(rawText);

  if (options.expectedChecksum && options.expectedChecksum.trim() !== '' && options.expectedChecksum !== checksum) {
    throw new CliError(
      'CHECKSUM_MISMATCH',
      'Package checksum did not match the expected value; refusing to install.',
      `expected=${options.expectedChecksum} actual=${checksum}`,
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError('PACKAGE_PAYLOAD_INVALID', 'Package payload is not valid JSON.', message);
  }

  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new CliError('PACKAGE_PAYLOAD_INVALID', 'Package payload must be a JSON object.');
  }

  const payload = rawPayload as Record<string, unknown>;
  const manifestCandidate = (payload.manifest ?? payload) as unknown;
  let manifest: ConnectorManifest;
  try {
    manifest = parseSync(SConnectorManifest, manifestCandidate);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError('MANIFEST_INVALID', 'Package manifest failed schema validation.', message);
  }

  if (options.expectedConnectorId && options.expectedConnectorId !== manifest.id) {
    throw new CliError(
      'CONNECTOR_ID_MISMATCH',
      `Package connector id ${manifest.id} does not match expected ${options.expectedConnectorId}.`,
    );
  }

  // runtime metadata — read from package payload if present, otherwise fall
  // back to defaults so dev-connectors fixtures continue to work.
  const runtimeBlock = (payload.runtime ?? {}) as Record<string, unknown>;
  const packageVersion = validateSemverOrFallback(manifest.version, 'manifest.version');
  const sdkVersion = validateSemverOrFallback(
    typeof runtimeBlock.sdkVersion === 'string' ? runtimeBlock.sdkVersion : DEFAULT_SDK_VERSION,
    'runtime.sdkVersion',
  );
  const minHostVersion = validateSemverOrFallback(
    typeof runtimeBlock.minHostVersion === 'string' ? runtimeBlock.minHostVersion : DEFAULT_MIN_HOST_VERSION,
    'runtime.minHostVersion',
  );
  const entrypointCandidate = typeof runtimeBlock.entrypoint === 'string' && runtimeBlock.entrypoint.trim() !== ''
    ? runtimeBlock.entrypoint.trim()
    : DEFAULT_ENTRYPOINT;
  if (/\s/.test(entrypointCandidate)) {
    throw new CliError('MANIFEST_INVALID', `Runtime entrypoint must not contain whitespace: ${entrypointCandidate}`);
  }
  const executionModel = (runtimeBlock.executionModel === 'subprocess' ? 'subprocess' : DEFAULT_EXECUTION_MODEL) as 'worker' | 'subprocess';

  const declaredCapabilities = Array.isArray(runtimeBlock.capabilities)
    ? runtimeBlock.capabilities
    : [];
  const capabilities: ConnectorPackageCapability[] = [];
  for (const candidate of declaredCapabilities) {
    try {
      capabilities.push(parseSync(SConnectorPackageCapability, candidate));
    } catch {
      throw new CliError('MANIFEST_INVALID', `Runtime capability not recognised: ${String(candidate)}`);
    }
  }

  return {
    manifest,
    rawText,
    rawPayload,
    checksum,
    packageVersion,
    sdkVersion,
    minHostVersion,
    entrypoint: entrypointCandidate,
    executionModel,
    capabilities,
  };
}

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function validateSemverOrFallback(candidate: string, label: string): string {
  const parts = candidate.split('.');
  if (parts.length < 2 || parts.length > 4) {
    throw new CliError('MANIFEST_INVALID', `${label} is not a valid semver: ${candidate}`);
  }
  for (const part of parts) {
    if (!/^\d+(?:-[A-Za-z0-9.-]+)?$/.test(part) && !/^\d+$/.test(part)) {
      throw new CliError('MANIFEST_INVALID', `${label} is not a valid semver: ${candidate}`);
    }
  }
  return candidate;
}

function assertSafeUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new CliError('PACKAGE_URL_INVALID', `Invalid package URL: ${url}`);
  }

  if (parsed.protocol === 'https:') {
    return;
  }

  if (parsed.protocol === 'http:' && isLocalhostHostname(parsed.hostname)) {
    return;
  }

  throw new CliError(
    'PACKAGE_URL_INSECURE',
    `Refusing to download package from non-HTTPS URL: ${url}. Use https:// or a localhost dev registry.`,
  );
}

function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
