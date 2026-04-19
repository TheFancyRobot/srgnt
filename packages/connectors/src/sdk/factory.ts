import type { ConnectorPackageRuntime, ConnectorManifest } from "@srgnt/contracts";
import type { ConnectorFactory, HostCapabilities, HostContext } from "./registry.js";

// Re-export all factory types from registry (single source of truth)
export type { HostCapabilities, HostContext, ConnectorFactory };

// Package entrypoint shape third-party packages must export
export interface ConnectorPackage {
  manifest: ConnectorManifest;
  factory: ConnectorFactory;
  runtime: ConnectorPackageRuntime;
}
