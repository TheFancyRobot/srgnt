import { Schema } from '@effect/schema';
import { SConnectorLifecycleState } from './package-runtime.js';

// Re-export lifecycle state from package-runtime for convenience
export { SConnectorLifecycleState };

// Package verification status - tracks whether package has been cryptographically verified
export const SVerificationStatus = Schema.Literal(
  'unverified', 'verifying', 'verified', 'invalid', 'expired',
);
export type VerificationStatus = Schema.Schema.Type<typeof SVerificationStatus>;

// Schema for CLI command input/output types

// Install command input
export const SInstallCommandInput = Schema.Struct({
  packageUrl: Schema.String,
  expectedConnectorId: Schema.optional(Schema.String), // validate installed package matches expected ID
});
export type InstallCommandInput = Schema.Schema.Type<typeof SInstallCommandInput>;

// Install command output  
export const SInstallCommandSuccess = Schema.Struct({
  packageId: Schema.String,
  connectorId: Schema.String,
  installedAt: Schema.String,
  installPath: Schema.String,
});
export const SInstallCommandError = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  details: Schema.optional(Schema.String),
});
export const SInstallCommandOutput = Schema.Union(SInstallCommandSuccess, SInstallCommandError);
export type InstallCommandSuccess = Schema.Schema.Type<typeof SInstallCommandSuccess>;
export type InstallCommandError = Schema.Schema.Type<typeof SInstallCommandError>;
export type InstallCommandOutput = Schema.Schema.Type<typeof SInstallCommandOutput>;

// List command output - shows all installed packages
export const SInstalledPackageSummary = Schema.Struct({
  packageId: Schema.String,
  connectorId: Schema.String,
  packageVersion: Schema.String,
  installedAt: Schema.String,
  lifecycleState: SConnectorLifecycleState,
  verificationStatus: SVerificationStatus,
});
export type InstalledPackageSummary = Schema.Schema.Type<typeof SInstalledPackageSummary>;

// Inspect command output - full package details (no secrets)
export const SInspectCommandOutput = Schema.Struct({
  packageId: Schema.String,
  connectorId: Schema.String,
  packageVersion: Schema.String,
  sdkVersion: Schema.String,
  minHostVersion: Schema.String,
  packageUrl: Schema.String,
  installPath: Schema.String,
  installedAt: Schema.String,
  lastVerifiedAt: Schema.optional(Schema.String),
  verificationStatus: SVerificationStatus,
  lifecycleState: SConnectorLifecycleState,
  entrypoint: Schema.String,
  executionModel: Schema.Literal("worker", "subprocess"),
  lastError: Schema.optional(Schema.String),
});
export type InspectCommandOutput = Schema.Schema.Type<typeof SInspectCommandOutput>;

// Remove command output
export const SRemoveCommandSuccess = Schema.Struct({
  packageId: Schema.String,
  connectorId: Schema.String,
  removedAt: Schema.String,
  cleanupPaths: Schema.Array(Schema.String), // paths that were cleaned up
});
export const SRemoveCommandError = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
});
export const SRemoveCommandOutput = Schema.Union(SRemoveCommandSuccess, SRemoveCommandError);
export type RemoveCommandSuccess = Schema.Schema.Type<typeof SRemoveCommandSuccess>;
export type RemoveCommandError = Schema.Schema.Type<typeof SRemoveCommandError>;
export type RemoveCommandOutput = Schema.Schema.Type<typeof SRemoveCommandOutput>;
