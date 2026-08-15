import type { HarnessDefinition } from '@srgnt/contracts';
import { describe, expect, it } from 'vitest';
import { negotiateCapabilities } from '../acp/capabilities.js';
import {
  OPENCODE_HARNESS_ID,
  opencodeDefinition,
  PI_ACP_VERSION,
  PI_HARNESS_ID,
  piDefinition,
} from './builtins.js';
import {
  effectiveCapabilities,
  HarnessRegistry,
  loadWorkspaceHarnesses,
  UnknownHarness,
} from './registry.js';

const def = (id: string, overrides: Partial<HarnessDefinition> = {}): HarnessDefinition => ({
  id,
  name: id,
  source: 'custom',
  launch: { command: id, args: [], env: {} },
  quirks: [],
  capabilityOverrides: {},
  ...overrides,
});

describe('piDefinition (built-in)', () => {
  it('launches the pinned pi-acp adapter via npx', () => {
    expect(piDefinition.id).toBe(PI_HARNESS_ID);
    expect(piDefinition.source).toBe('builtin');
    expect(piDefinition.launch.command).toBe('npx');
    expect(piDefinition.launch.args).toEqual([`pi-acp@${PI_ACP_VERSION}`]);
  });

  it('declares the adapter-mediated quirks from the ACP research and the spike', () => {
    expect(piDefinition.quirks).toEqual([
      'adapter-mediated',
      'permission-routing-gaps',
      'mcp-passthrough-gaps',
      // Measured by STEP-22-05 probe 4: the adapter runs pi's tools in its own
      // process and calls none of srgnt's fs/terminal services. Declared so the
      // capability matrix can say so instead of leaving the column blank.
      'no-client-delegation',
    ]);
    // mcp-passthrough-gaps ⇒ clamp mcpServers off.
    expect(piDefinition.capabilityOverrides.mcpServers).toBe(false);
  });
});

describe('HarnessRegistry.create', () => {
  it('exposes the built-in Pi definition by default', () => {
    const registry = HarnessRegistry.create();
    expect(registry.has(PI_HARNESS_ID)).toBe(true);
    expect(registry.get(PI_HARNESS_ID)).toBe(piDefinition);
    expect(registry.list().map((d) => d.id)).toContain(PI_HARNESS_ID);
  });

  it('adds workspace definitions with new ids after the built-ins', () => {
    const registry = HarnessRegistry.create({
      builtins: [def('a')],
      workspace: { version: 1, harnesses: [def('b')] },
    });
    expect(registry.list().map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('lets a workspace entry replace a built-in sharing its id (workspace wins)', () => {
    const custom = def(PI_HARNESS_ID, { name: 'Pi (local)', launch: { command: 'pi-acp', args: [], env: {} } });
    const registry = HarnessRegistry.create({ workspace: { version: 1, harnesses: [custom] } });
    expect(registry.require(PI_HARNESS_ID)).toBe(custom);
    // Replacement keeps a single entry, not two.
    expect(registry.list().filter((d) => d.id === PI_HARNESS_ID)).toHaveLength(1);
  });

  it('resolves duplicate workspace ids as last-write-wins', () => {
    const first = def('dup', { name: 'first' });
    const second = def('dup', { name: 'second' });
    const registry = HarnessRegistry.create({
      builtins: [],
      workspace: { version: 1, harnesses: [first, second] },
    });
    expect(registry.require('dup').name).toBe('second');
    expect(registry.list()).toHaveLength(1);
  });
});

describe('HarnessRegistry lookup', () => {
  const registry = HarnessRegistry.create({ builtins: [def('a')] });

  it('get() returns undefined for an unknown id', () => {
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.has('missing')).toBe(false);
  });

  it('require() throws UnknownHarness for an unknown id', () => {
    expect(() => registry.require('missing')).toThrow(UnknownHarness);
  });
});

describe('loadWorkspaceHarnesses', () => {
  it('accepts a valid harnesses.json payload', () => {
    const result = loadWorkspaceHarnesses({
      version: 1,
      harnesses: [{ id: 'x', name: 'X', launch: { command: 'x' } }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Schema defaults fill in the omitted fields.
      expect(result.file.harnesses[0]).toMatchObject({ id: 'x', source: 'custom', quirks: [] });
      expect(result.file.harnesses[0].launch.args).toEqual([]);
    }
  });

  it('accepts a file with no harnesses array (defaults to empty)', () => {
    const result = loadWorkspaceHarnesses({ version: 1 });
    expect(result).toEqual({ ok: true, file: { version: 1, harnesses: [] } });
  });

  it('rejects a malformed payload with a typed error, not a throw', () => {
    const missingVersion = loadWorkspaceHarnesses({ harnesses: [] });
    const badHarness = loadWorkspaceHarnesses({ version: 1, harnesses: [{ name: 'no-id' }] });
    const notAnObject = loadWorkspaceHarnesses(42);
    expect(missingVersion.ok).toBe(false);
    expect(badHarness.ok).toBe(false);
    expect(notAnObject.ok).toBe(false);
  });
});

describe('effectiveCapabilities (negotiated ∩ definition overrides)', () => {
  const negotiated = negotiateCapabilities({
    protocolVersion: 1,
    agentCapabilities: {
      loadSession: true,
      promptCapabilities: { image: true },
      sessionCapabilities: { resume: {} },
    },
  });

  it('an override can disable a negotiated capability', () => {
    // Pi's real definition clamps the protocol-baseline mcpServers off.
    expect(negotiated.mcpServers).toBe(true);
    const caps = effectiveCapabilities(piDefinition, negotiated);
    expect(caps.mcpServers).toBe(false);
  });

  it('leaves negotiated capabilities untouched where the definition has no override', () => {
    const caps = effectiveCapabilities(piDefinition, negotiated);
    // Pi only overrides mcpServers; everything else flows through from negotiation.
    expect(caps.loadSession).toBe(true);
    expect(caps.resumeSession).toBe(true);
    expect(caps.images).toBe(true);
  });

  it('a definition with no overrides yields the negotiated capabilities unchanged', () => {
    const caps = effectiveCapabilities(def('plain'), negotiated);
    expect(caps).toEqual(negotiated);
  });

  it('the registry method resolves the definition by id', () => {
    const registry = HarnessRegistry.create();
    const caps = registry.effectiveCapabilities(PI_HARNESS_ID, negotiated);
    expect(caps.mcpServers).toBe(false);
    expect(() => registry.effectiveCapabilities('missing', negotiated)).toThrow(UnknownHarness);
  });
});

describe('opencodeDefinition (built-in, native ACP)', () => {
  it('launches `opencode acp` and needs no separate detect command', () => {
    expect(opencodeDefinition.id).toBe(OPENCODE_HARNESS_ID);
    expect(opencodeDefinition.source).toBe('builtin');
    expect(opencodeDefinition.launch.command).toBe('opencode');
    expect(opencodeDefinition.launch.args).toEqual(['acp']);
    expect(opencodeDefinition.detectCommand).toBeUndefined();
  });

  it('declares zero quirks and zero overrides — nothing is assumed, only measured', () => {
    expect(opencodeDefinition.quirks).toEqual([]);
    expect(opencodeDefinition.capabilityOverrides).toEqual({});
  });

  it('is registered beside pi', () => {
    const registry = HarnessRegistry.create();
    expect(registry.list().map((d) => d.id)).toEqual([PI_HARNESS_ID, OPENCODE_HARNESS_ID]);
  });

  it('effectiveCapabilities is a pure passthrough (contrast: pi clamps mcpServers)', () => {
    const negotiated = negotiateCapabilities({
      protocolVersion: 1,
      agentCapabilities: { loadSession: true, sessionCapabilities: { list: {} } },
    });
    const registry = HarnessRegistry.create();
    expect(registry.effectiveCapabilities(OPENCODE_HARNESS_ID, negotiated)).toEqual(negotiated);
    expect(registry.effectiveCapabilities(PI_HARNESS_ID, negotiated).mcpServers).toBe(false);
  });
});
