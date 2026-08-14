import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { HarnessDefinition } from '@srgnt/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  HarnessCapabilityCache,
  harnessCapabilitiesPath,
  harnessDefinitionFingerprint,
} from './capability-cache.js';

const definition: HarnessDefinition = {
  id: 'opencode',
  name: 'opencode',
  source: 'builtin',
  launch: { command: 'opencode', args: ['acp'], env: {} },
  quirks: [],
  capabilityOverrides: {},
};

const capture = (protocolVersion: number, agentVersion = '1.18.18') => ({
  negotiated: { protocolVersion, agentVersion, mcpServers: true },
  effective: { protocolVersion, agentVersion, mcpServers: true },
});

let root: string;
let cache: HarnessCapabilityCache;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'srgnt-capcache-'));
  cache = new HarnessCapabilityCache(root);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const readFile = (): unknown => JSON.parse(readFileSync(harnessCapabilitiesPath(root), 'utf8'));

describe('HarnessCapabilityCache', () => {
  it('round-trips a capture', async () => {
    await cache.record(definition, capture(1));
    const result = await cache.get(definition);
    expect(result.status).toBe('measured');
    if (result.status === 'missing') return;
    expect(result.entry.negotiated.protocolVersion).toBe(1);
    expect(result.entry.agentVersion).toBe('1.18.18');
    expect(Date.parse(result.entry.capturedAt)).not.toBeNaN();
  });

  it('reports an unmeasured harness as missing', async () => {
    expect(await cache.get(definition)).toEqual({ status: 'missing' });
  });

  it('keeps entries for other harnesses when one is rewritten', async () => {
    const pi: HarnessDefinition = { ...definition, id: 'pi', name: 'Pi' };
    await cache.record(definition, capture(1));
    await cache.record(pi, capture(2));
    await cache.record(definition, capture(3));
    expect((await cache.get(pi)).status).toBe('measured');
    expect(readFile()).toMatchObject({ entries: { pi: {}, opencode: {} } });
  });

  it('treats an entry measured against a changed definition as stale', async () => {
    await cache.record(definition, capture(1));
    // Same id, different launch spec — e.g. a workspace entry shadowing a built-in.
    const shadowed: HarnessDefinition = {
      ...definition,
      launch: { command: '/opt/opencode', args: ['acp'], env: {} },
    };
    const result = await cache.get(shadowed);
    expect(result.status).toBe('stale');
  });

  it.each([
    ['missing file', undefined],
    ['corrupt JSON', '{ not json'],
    ['empty file', ''],
    ['a bumped file version', JSON.stringify({ version: 2, entries: {} })],
    ['a schema-violating entry', JSON.stringify({ version: 1, entries: { pi: { negotiated: 1 } } })],
  ])('decodes %s as an empty cache instead of throwing', async (_label, contents) => {
    if (contents !== undefined) writeFileSync(harnessCapabilitiesPath(root), contents);
    expect(await cache.read()).toEqual({ version: 1, entries: {} });
  });

  it('rewrites a corrupt file on the next record', async () => {
    writeFileSync(harnessCapabilitiesPath(root), '{ not json');
    await cache.record(definition, capture(7));
    expect((await cache.get(definition)).status).toBe('measured');
  });

  it('serializes concurrent writes: both land, the file is never torn', async () => {
    // Last write wins by design — the only assertions are that neither write
    // errors and the result decodes cleanly with one of the two negotiations.
    await Promise.all([cache.record(definition, capture(1)), cache.record(definition, capture(2))]);
    const result = await cache.get(definition);
    expect(result.status).toBe('measured');
    if (result.status === 'missing') return;
    expect([1, 2]).toContain(result.entry.negotiated.protocolVersion);
    expect(readFile()).toMatchObject({ version: 1 });
  });

  it('keeps both entries when two harnesses are recorded concurrently', async () => {
    // The read-modify-write is only safe while every writer shares one queue.
    // Two harnesses connecting at once through separate cache instances would
    // each rewrite the file from its own stale read and drop the other's row —
    // so callers must reuse one instance per workspace root, and this asserts
    // the shared-queue path they depend on.
    const pi: HarnessDefinition = { ...definition, id: 'pi', name: 'Pi' };
    await Promise.all([cache.record(definition, capture(1)), cache.record(pi, capture(2))]);
    expect((await cache.get(definition)).status).toBe('measured');
    expect((await cache.get(pi)).status).toBe('measured');
    expect(readFile()).toMatchObject({ entries: { pi: {}, opencode: {} } });
  });

  it('leaves no temp files behind', async () => {
    await cache.record(definition, capture(1));
    const { readdirSync } = await import('fs');
    expect(readdirSync(root).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });
});

describe('harnessDefinitionFingerprint', () => {
  it('is stable across key ordering', () => {
    const reordered = {
      capabilityOverrides: {},
      quirks: [],
      launch: { env: {}, args: ['acp'], command: 'opencode' },
      source: 'builtin',
      name: 'opencode',
      id: 'opencode',
    } as HarnessDefinition;
    expect(harnessDefinitionFingerprint(reordered)).toBe(harnessDefinitionFingerprint(definition));
  });

  it('changes when the launch spec or an override changes', () => {
    const base = harnessDefinitionFingerprint(definition);
    expect(
      harnessDefinitionFingerprint({
        ...definition,
        launch: { ...definition.launch, args: ['acp', '--verbose'] },
      }),
    ).not.toBe(base);
    expect(
      harnessDefinitionFingerprint({ ...definition, capabilityOverrides: { mcpServers: false } }),
    ).not.toBe(base);
  });
});
