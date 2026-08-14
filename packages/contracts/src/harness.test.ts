import { describe, it, expect } from 'vitest';
import { parseSync, safeParse } from './shared-schemas.js';
import {
  SHarnessCapabilitiesFile,
  SHarnessCapabilityOverrides,
  SHarnessDefinition,
  SHarnessQuirk,
  SHarnessesFile,
  SLaunchSpec,
} from './harness.js';

/** Realistic built-in Pi definition: community pi-acp adapter over npx. */
const piDefinition = {
  id: 'pi',
  name: 'Pi',
  description: 'Pi via the community pi-acp adapter (no native ACP yet)',
  source: 'builtin',
  launch: {
    command: 'npx',
    args: ['-y', 'pi-acp@0.3.2'],
    env: { PI_ACP_LOG_LEVEL: 'warn' },
  },
  quirks: ['adapter-mediated', 'permission-routing-gaps', 'mcp-passthrough-gaps'],
  capabilityOverrides: { loadSession: false },
  docsUrl: 'https://github.com/example/pi-acp',
};

describe('SLaunchSpec', () => {
  it('decodes a minimal spec with defaults', () => {
    const spec = parseSync(SLaunchSpec, { command: 'opencode' });
    expect(spec.args).toEqual([]);
    expect(spec.env).toEqual({});
    expect(spec.cwd).toBeUndefined();
  });

  it('rejects a spec without a command', () => {
    expect(safeParse(SLaunchSpec, { args: ['acp'] }).success).toBe(false);
  });

  it('rejects non-string env values', () => {
    expect(safeParse(SLaunchSpec, { command: 'x', env: { DEBUG: 1 } }).success).toBe(false);
  });
});

describe('SHarnessQuirk', () => {
  it('accepts the declared quirk vocabulary', () => {
    for (const quirk of ['adapter-mediated', 'permission-routing-gaps', 'mcp-passthrough-gaps', 'no-session-load']) {
      expect(safeParse(SHarnessQuirk, quirk).success).toBe(true);
    }
  });

  it('rejects unknown quirks', () => {
    expect(safeParse(SHarnessQuirk, 'flaky-tuesdays').success).toBe(false);
  });
});

describe('SHarnessDefinition', () => {
  it('round-trips the realistic Pi definition', () => {
    const decoded = parseSync(SHarnessDefinition, piDefinition);
    expect(decoded.launch.command).toBe('npx');
    expect(decoded.launch.args).toEqual(['-y', 'pi-acp@0.3.2']);
    expect(decoded.launch.env).toEqual({ PI_ACP_LOG_LEVEL: 'warn' });
    expect(decoded.quirks).toEqual(['adapter-mediated', 'permission-routing-gaps', 'mcp-passthrough-gaps']);
    expect(decoded.capabilityOverrides.loadSession).toBe(false);

    const reencoded = JSON.parse(JSON.stringify(decoded));
    expect(parseSync(SHarnessDefinition, reencoded)).toEqual(decoded);
  });

  it('decodes a minimal custom definition with defaults', () => {
    const decoded = parseSync(SHarnessDefinition, {
      id: 'opencode',
      name: 'opencode',
      launch: { command: 'opencode', args: ['acp'] },
    });
    expect(decoded.source).toBe('custom');
    expect(decoded.quirks).toEqual([]);
    expect(decoded.capabilityOverrides).toEqual({});
  });

  it('rejects a definition without a launch spec', () => {
    expect(safeParse(SHarnessDefinition, { id: 'x', name: 'X' }).success).toBe(false);
  });

  it('rejects unknown quirk values inside a definition', () => {
    expect(
      safeParse(SHarnessDefinition, { ...piDefinition, quirks: ['unknown-quirk'] }).success,
    ).toBe(false);
  });

  it('rejects unknown source values', () => {
    expect(
      safeParse(SHarnessDefinition, { ...piDefinition, source: 'downloaded' }).success,
    ).toBe(false);
  });
});

describe('SHarnessCapabilityOverrides', () => {
  it('treats absent fields as "trust negotiation"', () => {
    const overrides = parseSync(SHarnessCapabilityOverrides, {});
    expect(overrides.loadSession).toBeUndefined();
    expect(overrides.mcpServers).toBeUndefined();
  });

  it('rejects non-boolean override values', () => {
    expect(safeParse(SHarnessCapabilityOverrides, { modes: 'yes' }).success).toBe(false);
  });
});

describe('SHarnessesFile', () => {
  it('decodes the workspace seed content shape', () => {
    const file = parseSync(SHarnessesFile, { version: 1, harnesses: [] });
    expect(file.harnesses).toEqual([]);
  });

  it('decodes a file with the Pi definition', () => {
    const file = parseSync(SHarnessesFile, { version: 1, harnesses: [piDefinition] });
    expect(file.harnesses).toHaveLength(1);
    expect(file.harnesses[0].id).toBe('pi');
  });

  it('rejects a zero or missing version', () => {
    expect(safeParse(SHarnessesFile, { version: 0, harnesses: [] }).success).toBe(false);
    expect(safeParse(SHarnessesFile, { harnesses: [] }).success).toBe(false);
  });
});

describe('SHarnessDefinition.detectCommand', () => {
  it('is optional — absent means "probe launch.command"', () => {
    expect(parseSync(SHarnessDefinition, piDefinition).detectCommand).toBeUndefined();
  });

  it('carries the real prerequisite binary when the launcher differs', () => {
    // Pi launches via `npx` but the user must install `pi` itself.
    expect(parseSync(SHarnessDefinition, { ...piDefinition, detectCommand: 'pi' }).detectCommand).toBe('pi');
  });

  it('rejects a non-string detectCommand', () => {
    expect(safeParse(SHarnessDefinition, { ...piDefinition, detectCommand: 42 }).success).toBe(false);
  });
});

describe('SHarnessCapabilitiesFile', () => {
  const entry = {
    negotiated: { protocolVersion: 1, loadSession: true },
    effective: { protocolVersion: 1, loadSession: false },
    agentVersion: '1.18.18',
    capturedAt: '2026-08-13T10:00:00.000Z',
    definitionFingerprint: 'abc123',
  };

  it('decodes a file with one entry', () => {
    const file = parseSync(SHarnessCapabilitiesFile, { version: 1, entries: { opencode: entry } });
    expect(file.entries.opencode?.definitionFingerprint).toBe('abc123');
    // The capability shape stays opaque — owned by @srgnt/harness.
    expect(file.entries.opencode?.negotiated.loadSession).toBe(true);
  });

  it('defaults entries to empty', () => {
    expect(parseSync(SHarnessCapabilitiesFile, { version: 1 }).entries).toEqual({});
  });

  it('rejects another file version so a bumped file decodes as "no cache"', () => {
    expect(safeParse(SHarnessCapabilitiesFile, { version: 2, entries: {} }).success).toBe(false);
  });

  it('rejects an entry missing its fingerprint', () => {
    const { definitionFingerprint: _dropped, ...incomplete } = entry;
    expect(
      safeParse(SHarnessCapabilitiesFile, { version: 1, entries: { pi: incomplete } }).success,
    ).toBe(false);
  });
});
