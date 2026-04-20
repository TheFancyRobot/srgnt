import { Schema } from '@effect/schema';
import { SemVerString, UrlString } from '../shared-schemas.js';
import { SConnectorLifecycleState } from './package-runtime.js';

// The durable installed-package record
export const SInstalledConnectorPackage = Schema.Struct({
  packageId: Schema.String, // unique package identifier (URL-based or name@version)
  connectorId: Schema.String, // must match manifest.id
  packageVersion: SemVerString, // installed package version
  sdkVersion: SemVerString, // host SDK version package was built for
  minHostVersion: SemVerString, // minimum compatible host SDK
  sourceUrl: UrlString, // original install URL
  installedAt: Schema.String, // ISO timestamp
  checksum: Schema.optional(Schema.String), // integrity checksum (sha256)
  verificationStatus: Schema.Literal('unverified', 'verified', 'failed'),
  lifecycleState: SConnectorLifecycleState,
  lastError: Schema.optional(Schema.String),
  executionModel: Schema.Literal('worker', 'subprocess'),
});

export const SConnectorPackageRegistry = Schema.Struct({
  packages: Schema.Array(SInstalledConnectorPackage),
});

// Parsed types
export type InstalledConnectorPackage = Schema.Schema.Type<typeof SInstalledConnectorPackage>;
export type ConnectorPackageRegistry = Schema.Schema.Type<typeof SConnectorPackageRegistry>;
