import type { InitializeResponse } from '@agentclientprotocol/sdk';
import { describe, expect, it } from 'vitest';
import spikeFrames from '../testing/fixtures/pi-spike/spike-frames.json';
import {
  applyCapabilityOverrides,
  mergeSessionCapabilities,
  negotiateCapabilities,
} from './capabilities.js';

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

describe('negotiateCapabilities: runtime-observed facts (STEP-25-01)', () => {
  it('preserves the full auth-method metadata and reads session/list', () => {
    // Driven from the *committed* pi spike capture, so the extension is proved
    // against real agent data rather than a hand-written shape.
    const init = spikeFrames.probe3_initialize_response.msg.result as unknown as InitializeResponse;
    const caps = negotiateCapabilities(init);

    expect(caps.sessionList).toBe(true);
    expect(caps.authMethods).toHaveLength(1);
    // Not a lossy {id, name} projection: the terminal-login flow needs `type`
    // and `args` to be reconstructable without hardcoding a harness id.
    expect(caps.authMethods[0]).toMatchObject({
      id: 'pi_terminal_login',
      type: 'terminal',
      args: ['--terminal-login'],
    });
  });

  it('defaults to no auth methods and no session/list when nothing is advertised', () => {
    const caps = negotiateCapabilities({ protocolVersion: 1 });
    expect(caps.authMethods).toEqual([]);
    expect(caps.sessionList).toBe(false);
  });

  it('reads `list: null` as not advertised', () => {
    const caps = negotiateCapabilities({
      protocolVersion: 1,
      agentCapabilities: { sessionCapabilities: { list: null } },
    });
    expect(caps.sessionList).toBe(false);
  });

  it('overrides never touch observed facts', () => {
    const init = spikeFrames.probe3_initialize_response.msg.result as unknown as InitializeResponse;
    const negotiated = negotiateCapabilities(init);
    const effective = applyCapabilityOverrides(negotiated, { mcpServers: false, loadSession: false });
    expect(effective.authMethods).toEqual(negotiated.authMethods);
    expect(effective.sessionList).toBe(true);
  });
});

describe('mergeSessionCapabilities (session-discovered facts)', () => {
  const base = negotiateCapabilities({ protocolVersion: 1 });

  it('lifts a capability the agent only reveals mid-session', () => {
    expect(base.slashCommands).toBe(false);
    // opencode advertises none at initialize, then sends
    // `available_commands_update` with 90+ commands on the first turn.
    expect(mergeSessionCapabilities(base, { slashCommands: true }).slashCommands).toBe(true);
    expect(mergeSessionCapabilities(base, { modes: true }).modes).toBe(true);
  });

  it('never un-observes: an absent or false observation leaves the baseline alone', () => {
    const observed = mergeSessionCapabilities(base, { slashCommands: true });
    expect(mergeSessionCapabilities(observed, {}).slashCommands).toBe(true);
    expect(mergeSessionCapabilities(observed, { slashCommands: false }).slashCommands).toBe(true);
  });

  it('touches nothing else', () => {
    const merged = mergeSessionCapabilities(base, { modes: true, slashCommands: true });
    expect({ ...merged, modes: false, slashCommands: false }).toEqual(base);
  });
});
