import { describe, expect, it } from 'vitest';
import { applyCapabilityOverrides, negotiateCapabilities } from './capabilities.js';

describe('negotiateCapabilities', () => {
  it('derives a normalized model from a full initialize response', () => {
    const caps = negotiateCapabilities({
      protocolVersion: 1,
      agentCapabilities: {
        loadSession: true,
        promptCapabilities: { image: true, audio: false, embeddedContext: true },
        mcpCapabilities: { http: true, sse: false },
        sessionCapabilities: { resume: {} },
      },
      agentInfo: { name: 'mock-agent', version: '1.2.3' },
    });
    expect(caps).toMatchObject({
      protocolVersion: 1,
      agentName: 'mock-agent',
      agentVersion: '1.2.3',
      loadSession: true,
      resumeSession: true,
      images: true,
      audio: false,
      embeddedContext: true,
      mcpHttp: true,
      mcpSse: false,
      // protocol baseline: stdio MCP servers always allowed unless overridden
      mcpServers: true,
      // session-discovered features default false at initialize time
      modes: false,
      slashCommands: false,
    });
  });

  it('treats a minimal initialize response as all-off (except baseline mcpServers)', () => {
    const caps = negotiateCapabilities({ protocolVersion: 1 });
    expect(caps.loadSession).toBe(false);
    expect(caps.resumeSession).toBe(false);
    expect(caps.images).toBe(false);
    expect(caps.audio).toBe(false);
    expect(caps.embeddedContext).toBe(false);
    expect(caps.mcpHttp).toBe(false);
    expect(caps.mcpSse).toBe(false);
    expect(caps.mcpServers).toBe(true);
    expect(caps.agentName).toBeUndefined();
  });

  it('reads `resume: {}` as advertised and `resume: null` as not advertised', () => {
    const on = negotiateCapabilities({
      protocolVersion: 1,
      agentCapabilities: { sessionCapabilities: { resume: {} } },
    });
    const off = negotiateCapabilities({
      protocolVersion: 1,
      agentCapabilities: { sessionCapabilities: { resume: null } },
    });
    expect(on.resumeSession).toBe(true);
    expect(off.resumeSession).toBe(false);
  });
});

describe('applyCapabilityOverrides', () => {
  const negotiated = negotiateCapabilities({
    protocolVersion: 1,
    agentCapabilities: { loadSession: true, promptCapabilities: { image: true } },
  });

  it('absent override fields trust negotiation', () => {
    const caps = applyCapabilityOverrides(negotiated, {});
    expect(caps).toEqual(negotiated);
  });

  it('boolean overrides force capabilities on or off', () => {
    const caps = applyCapabilityOverrides(negotiated, {
      loadSession: false,
      images: false,
      mcpServers: false,
      slashCommands: true,
      modes: true,
    });
    expect(caps.loadSession).toBe(false);
    expect(caps.images).toBe(false);
    expect(caps.mcpServers).toBe(false);
    expect(caps.slashCommands).toBe(true);
    expect(caps.modes).toBe(true);
    // untouched fields survive
    expect(caps.resumeSession).toBe(negotiated.resumeSession);
    expect(caps.protocolVersion).toBe(1);
  });
});
