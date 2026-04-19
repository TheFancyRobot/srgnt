import type { Connector } from "./connector.js";
import type { ConnectorPackageRuntime, ConnectorManifest } from "@srgnt/contracts";

// Narrow host capabilities exposed to third-party packages (Zone 2 owned, never raw Node/Electron)
export interface HostCapabilities {
  http: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
  crypto: {
    randomUUID: () => string;
  };
  workspace: {
    root: string;
  };
}

export interface HostContext {
  capabilities: HostCapabilities;
  connectorId: string;
  sdkVersion: string;
}

// The public factory function signature third-party packages implement
export type ConnectorFactory = (host: HostContext) => Promise<Connector>;

// Package entrypoint shape third-party packages must export
export interface ConnectorPackage {
  manifest: ConnectorManifest;
  factory: ConnectorFactory;
  runtime: ConnectorPackageRuntime;
}
