import type {
  InstalledConnectorPackage,
} from '@srgnt/contracts';

/**
 * Redact anything that looks sensitive before printing from the CLI. The CLI
 * guarantees its stdout/stderr are safe to paste into bug reports and chat, so
 * tokens, api keys, email addresses, and absolute filesystem paths are removed
 * the same way `sanitizeErrorMessage` handles host logs.
 */
export function redactForCli(raw: string): string {
  if (!raw) return '';
  return raw
    // drop anything that looks like an email address
    .replace(/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    // drop obvious filesystem paths (abs unix and windows)
    .replace(/(?:[A-Za-z]:)?[\\/](?:[A-Za-z0-9._-]+[\\/]){1,}[A-Za-z0-9._-]+/g, '[redacted-path]')
    // redact token/secret/apikey= values
    .replace(/(token|secret|api[_-]?key)=[^\s]+/gi, '$1=[redacted]');
}

export type OutputFormat = 'text' | 'json';

export interface InstallSuccessResult {
  kind: 'installed';
  packageId: string;
  connectorId: string;
  packageVersion: string;
  verificationStatus: 'unverified' | 'verified' | 'failed';
  lifecycleState: InstalledConnectorPackage['lifecycleState'];
  checksum: string;
}

export interface InstallErrorResult {
  kind: 'install-error';
  code: string;
  message: string;
  details?: string;
}

export interface RemoveSuccessResult {
  kind: 'removed';
  packageId: string;
  connectorId: string;
}

export interface RemoveErrorResult {
  kind: 'remove-error';
  code: string;
  message: string;
}

export interface ListResult {
  kind: 'list';
  packages: Array<{
    packageId: string;
    connectorId: string;
    packageVersion: string;
    lifecycleState: InstalledConnectorPackage['lifecycleState'];
    verificationStatus: 'unverified' | 'verified' | 'failed';
    executionModel: 'worker' | 'subprocess';
    lastError?: string;
  }>;
}

export interface InspectResult {
  kind: 'inspect';
  packageId: string;
  connectorId: string;
  packageVersion: string;
  sdkVersion: string;
  minHostVersion: string;
  // Host part only — never the full query string. Keeps the output
  // copy-paste safe.
  sourceHost: string;
  installedAt: string;
  lifecycleState: InstalledConnectorPackage['lifecycleState'];
  verificationStatus: 'unverified' | 'verified' | 'failed';
  executionModel: 'worker' | 'subprocess';
  checksum?: string;
  lastError?: string;
}

export interface InspectErrorResult {
  kind: 'inspect-error';
  code: string;
  message: string;
}

export type CliResult =
  | InstallSuccessResult
  | InstallErrorResult
  | RemoveSuccessResult
  | RemoveErrorResult
  | ListResult
  | InspectResult
  | InspectErrorResult;

export function renderJson(result: CliResult): string {
  return JSON.stringify(result, null, 2);
}

export function renderText(result: CliResult): string {
  switch (result.kind) {
    case 'installed': {
      return [
        `installed ${result.connectorId} (${result.packageId})`,
        `  version:       ${result.packageVersion}`,
        `  verification:  ${result.verificationStatus}`,
        `  lifecycle:     ${result.lifecycleState}`,
        `  checksum:      ${result.checksum}`,
      ].join('\n');
    }
    case 'install-error': {
      const base = `install failed: ${result.code}`;
      const detail = result.details ? `\n  details: ${redactForCli(result.details)}` : '';
      return `${base}\n  ${redactForCli(result.message)}${detail}`;
    }
    case 'removed': {
      return `removed ${result.connectorId} (${result.packageId})`;
    }
    case 'remove-error': {
      return `remove failed: ${result.code}\n  ${redactForCli(result.message)}`;
    }
    case 'inspect-error': {
      return `inspect failed: ${result.code}\n  ${redactForCli(result.message)}`;
    }
    case 'list': {
      if (result.packages.length === 0) {
        return 'no connector packages installed';
      }
      const header = 'CONNECTOR            PACKAGE                             VERSION   LIFECYCLE    VERIFY      EXEC       LAST_ERROR';
      const rows = result.packages.map((pkg) => {
        const err = pkg.lastError ? redactForCli(pkg.lastError).slice(0, 60) : '';
        return [
          pkg.connectorId.padEnd(20),
          pkg.packageId.padEnd(35).slice(0, 35),
          pkg.packageVersion.padEnd(9),
          pkg.lifecycleState.padEnd(12),
          pkg.verificationStatus.padEnd(11),
          pkg.executionModel.padEnd(10),
          err,
        ].join(' ');
      });
      return [header, ...rows].join('\n');
    }
    case 'inspect': {
      const lines: string[] = [
        `connector:         ${result.connectorId}`,
        `packageId:         ${result.packageId}`,
        `packageVersion:    ${result.packageVersion}`,
        `sdkVersion:        ${result.sdkVersion}`,
        `minHostVersion:    ${result.minHostVersion}`,
        `sourceHost:        ${result.sourceHost}`,
        `installedAt:       ${result.installedAt}`,
        `lifecycleState:    ${result.lifecycleState}`,
        `verification:      ${result.verificationStatus}`,
        `executionModel:    ${result.executionModel}`,
      ];
      if (result.checksum) lines.push(`checksum:          ${result.checksum}`);
      if (result.lastError) lines.push(`lastError:         ${redactForCli(result.lastError)}`);
      return lines.join('\n');
    }
  }
}

/**
 * Derive the host-only portion of a package URL for safe inspect output. Drops
 * the pathname/query/hash to avoid leaking tokens or internal paths that may
 * appear in a private package URL.
 */
export function hostOnly(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '[redacted-url]';
  }
}
