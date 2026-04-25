import { describe, it, expect } from "vitest";
import {
  BuiltInConnectorRegistry,
  type HostContext,
  type RegisteredConnector,
} from "./registry.js";
import { BUILTIN_CONNECTOR_MANIFESTS } from "../index.js";
import type { ConnectorManifest } from "@srgnt/contracts";
import type { Connector } from "./connector.js";

// Import connector modules to trigger registration side effects
import "../outlook/connector.js";
import "../teams/connector.js";

describe("BuiltInConnectorRegistry", () => {
  // Sample manifest for testing
  const sampleManifest: ConnectorManifest = {
    id: "test-connector",
    name: "Test Connector",
    version: "1.0.0",
    description: "A test connector",
    provider: "test",
    authType: "none",
    config: { authType: "none", timeout: 30000, retryAttempts: 3 },
    capabilities: [],
    entityTypes: [],
    freshnessThresholdMs: 300000,
    metadata: {},
  };

  // Sample factory for testing
  async function createTestConnector(_host: HostContext): Promise<Connector> {
    return {
      getManifest: () => sampleManifest,
      connect: async () => {},
      disconnect: async () => {},
      getHealth: () => ({ status: "disconnected", entityCounts: {} }),
      isConnected: () => false,
    };
  }

  it("registers a connector successfully", () => {
    const connector: RegisteredConnector = {
      manifest: sampleManifest,
      factory: createTestConnector,
      lifecycleState: "installed",
    };
    BuiltInConnectorRegistry.register(connector);
    expect(BuiltInConnectorRegistry.has("test-connector")).toBe(true);
  });

  it("retrieves a registered connector by id", () => {
    const result = BuiltInConnectorRegistry.get("test-connector");
    expect(result).toBeDefined();
    expect(result?.manifest.id).toBe("test-connector");
  });

  it("returns all registered connectors", () => {
    const all = BuiltInConnectorRegistry.getAll();
    expect(all.length).toBeGreaterThan(0);
  });

  it("returns all manifests", () => {
    const manifests = BuiltInConnectorRegistry.getManifests();
    expect(manifests.length).toBeGreaterThan(0);
    expect(manifests.some((m) => m.id === "test-connector")).toBe(true);
  });

  it("throws when registering duplicate connector", () => {
    const duplicate: RegisteredConnector = {
      manifest: sampleManifest,
      factory: createTestConnector,
      lifecycleState: "installed",
    };
    expect(() => BuiltInConnectorRegistry.register(duplicate)).toThrow();
  });

  it("has returns true for registered connectors", () => {
    expect(BuiltInConnectorRegistry.has("test-connector")).toBe(true);
    expect(BuiltInConnectorRegistry.has("non-existent")).toBe(false);
  });

  it("built-in connectors outlook and teams are registered", () => {
    expect(BuiltInConnectorRegistry.has("jira")).toBe(false);
    expect(BuiltInConnectorRegistry.has("outlook")).toBe(true);
    expect(BuiltInConnectorRegistry.has("teams")).toBe(true);
  });

  it("built-in connectors have factory functions", () => {
    const outlook = BuiltInConnectorRegistry.get("outlook");
    expect(outlook?.factory).toBeDefined();
    expect(typeof outlook?.factory).toBe("function");

    const teams = BuiltInConnectorRegistry.get("teams");
    expect(teams?.factory).toBeDefined();
    expect(typeof teams?.factory).toBe("function");
  });

  it("built-in connectors have installed lifecycle state", () => {
    const outlook = BuiltInConnectorRegistry.get("outlook");
    expect(outlook?.lifecycleState).toBe("installed");

    const teams = BuiltInConnectorRegistry.get("teams");
    expect(teams?.lifecycleState).toBe("installed");
  });

  it("exports built-in manifests from the shared registry source of truth", () => {
    const exportedIds = BUILTIN_CONNECTOR_MANIFESTS.map((manifest) => manifest.id).sort();
    expect(exportedIds).toEqual(["outlook", "teams"]);

    for (const connectorId of exportedIds) {
      expect(BuiltInConnectorRegistry.has(connectorId)).toBe(true);
    }
  });
});
