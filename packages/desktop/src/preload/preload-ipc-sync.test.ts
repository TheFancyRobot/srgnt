import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ipcChannels } from '@srgnt/contracts';

/**
 * BUG-0002 regression guard.
 *
 * The preload script runs with sandbox: true, so it cannot import runtime
 * values from workspace packages. IPC channel constants are inlined in the
 * preload source. This test ensures those inlined values stay in sync with
 * the canonical definition in @srgnt/contracts.
 */
describe('preload IPC channel sync (BUG-0002 regression)', () => {
  const preloadSource = readFileSync(
    resolve(__dirname, 'index.ts'),
    'utf-8',
  );

  it('every canonical ipcChannels key has a matching inlined entry in the preload', () => {
    const canonicalKeys = Object.keys(ipcChannels) as (keyof typeof ipcChannels)[];

    for (const key of canonicalKeys) {
      const value = ipcChannels[key];
      // Match patterns like:  terminalSpawn: 'terminal:spawn',
      const keyPattern = new RegExp(`${key}:\\s*['"]${escapeRegex(value)}['"]`);
      expect(
        keyPattern.test(preloadSource),
        `Preload is missing inlined channel: ${key}: '${value}'. ` +
        `Add it to packages/desktop/src/preload/index.ts to keep the sandboxed preload in sync.`,
      ).toBe(true);
    }
  });

  it('preload does not have extra ipcChannels keys beyond the canonical set', () => {
    // Extract all key: 'value' entries from the inlined ipcChannels block
    const blockMatch = preloadSource.match(
      /const ipcChannels\s*=\s*\{([\s\S]*?)\}\s*as\s+const/,
    );
    expect(blockMatch, 'Could not find inlined ipcChannels block in preload source').toBeTruthy();

    const block = blockMatch![1];
    const inlinedKeys = [...block.matchAll(/(\w+):\s*['"]/g)].map((m) => m[1]);
    const canonicalKeys = new Set(Object.keys(ipcChannels));

    for (const key of inlinedKeys) {
      expect(
        canonicalKeys.has(key!),
        `Preload has extra inlined channel key '${key}' not in @srgnt/contracts. ` +
        `Either add it to the canonical ipcChannels or remove it from the preload.`,
      ).toBe(true);
    }
  });

  it('preload exposes window.srgnt via contextBridge', () => {
    expect(preloadSource).toContain("contextBridge.exposeInMainWorld('srgnt', api)");
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
