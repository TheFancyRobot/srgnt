import type { Connector } from "./connector.js";
import type { ConnectorManifest } from "@srgnt/contracts";

// All shared types for connector factory and registry
// This is the single source of truth for these types

export interface HostCapabilities {
  http: {
    fetch: typeof fetch;
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
  credentials?: {
    getToken: (connectorId: string) => Promise<string | undefined>;
  };
  /** File system operations via the privileged host boundary. Connectors use this instead of direct filesystem access. */
  files?: {
    writeFile(path: string, content: string): Promise<void>;
    readFile(path: string): Promise<string>;
    mkdir(path: string): Promise<void>;
    delete(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
  };
}

export interface HostContext {
  capabilities: HostCapabilities;
  connectorId: string;
  sdkVersion: string;
}

// The public factory function signature third-party packages implement
export type ConnectorFactory = (host: HostContext) => Promise<Connector>;

// ConnectorPackage + lifecycle state for internal tracking
export interface RegisteredConnector {
  manifest: ConnectorManifest;
  factory: ConnectorFactory;
  lifecycleState: 'installed' | 'verified' | 'activated' | 'loaded' | 'connected' | 'errored';
}

// Built-in connector registry - single source of truth for all built-in connectors
// Both built-ins and third-party packages use this same registration pattern
class BuiltInConnectorRegistryImpl {
  private connectors = new Map<string, RegisteredConnector>();

  register(connector: RegisteredConnector): void {
    if (this.connectors.has(connector.manifest.id)) {
      throw new Error(`Connector "${connector.manifest.id}" is already registered`);
    }
    this.connectors.set(connector.manifest.id, connector);
  }

  get(connectorId: string): RegisteredConnector | undefined {
    return this.connectors.get(connectorId);
  }

  getAll(): RegisteredConnector[] {
    return Array.from(this.connectors.values());
  }

  getManifests(): ConnectorManifest[] {
    return this.getAll().map((c) => c.manifest);
  }

  has(connectorId: string): boolean {
    return this.connectors.has(connectorId);
  }
}

// Singleton registry instance
export const BuiltInConnectorRegistry = new BuiltInConnectorRegistryImpl();
