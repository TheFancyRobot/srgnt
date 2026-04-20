import { describe, it, expect } from "vitest";
import type { HostContext, HostCapabilities } from "./factory.js";

describe("HostContext", () => {
  it("accepts a valid HostContext shape", () => {
    const ctx: HostContext = {
      capabilities: {
        http: { fetch: globalThis.fetch },
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
        },
        crypto: { randomUUID: globalThis.crypto.randomUUID },
        workspace: { root: "/home/user" },
      },
      connectorId: "test-connector",
      sdkVersion: "1.0.0",
    };
    expect(ctx.connectorId).toBe("test-connector");
    expect(ctx.capabilities.workspace.root).toBe("/home/user");
  });

  it("HostContext.capabilities does not expose Node/Electron primitives", () => {
    const capabilitiesKeys = Object.keys({
      http: null,
      logger: null,
      crypto: null,
      workspace: null,
    } as HostCapabilities);
    expect(capabilitiesKeys).not.toContain("node");
    expect(capabilitiesKeys).not.toContain("electron");
    expect(capabilitiesKeys).not.toContain("fs");
    expect(capabilitiesKeys).not.toContain("secrets");
  });

  it("capabilities.http.fetch is the global fetch", () => {
    const ctx: HostContext = {
      capabilities: {
        http: { fetch: globalThis.fetch },
        logger: { info: () => {}, warn: () => {}, error: () => {} },
        crypto: { randomUUID: globalThis.crypto.randomUUID },
        workspace: { root: "/home/user" },
      },
      connectorId: "test",
      sdkVersion: "1.0.0",
    };
    expect(ctx.capabilities.http.fetch).toBe(globalThis.fetch);
  });
});