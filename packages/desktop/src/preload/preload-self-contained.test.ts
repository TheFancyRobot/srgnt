import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ipcChannels } from '@srgnt/contracts';

const PRELOAD_PATH = path.resolve(__dirname, 'index.ts');
const preloadSource = fs.readFileSync(PRELOAD_PATH, 'utf8');

describe('preload self-containment (BUG-0002 regression)', () => {
  it('only uses type-level imports from @srgnt/* packages', () => {
    // Match all import statements that reference @srgnt/* packages
    const srgntImports = preloadSource.match(/^import\s.+from\s+['"]@srgnt\/.+['"]/gm) ?? [];

    for (const importLine of srgntImports) {
      expect(
        importLine,
        `Preload must not import runtime values from workspace packages. ` +
        `Use \`import type\` instead:\n  ${importLine}`,
      ).toMatch(/^import\s+type\s/);
    }
  });

  it('inlined ipcChannels keys match the canonical @srgnt/contracts definition', () => {
    // Extract the inlined ipcChannels object from the preload source
    const channelBlockMatch = preloadSource.match(
      /const\s+ipcChannels\s*=\s*\{([\s\S]*?)\}\s*as\s+const/,
    );
    expect(channelBlockMatch, 'Could not find inlined ipcChannels in preload source').toBeTruthy();

    const channelBlock = channelBlockMatch![1];

    // Extract key-value pairs from the inlined block
    const inlinedEntries = new Map<string, string>();
    const entryPattern = /(\w+):\s*'([^']+)'/g;
    let match: RegExpExecArray | null;
    while ((match = entryPattern.exec(channelBlock)) !== null) {
      inlinedEntries.set(match[1], match[2]);
    }

    const canonicalEntries = Object.entries(ipcChannels);

    // Every canonical key must be present in the preload with the same value
    for (const [key, value] of canonicalEntries) {
      expect(
        inlinedEntries.has(key),
        `Preload is missing ipcChannel key "${key}" — add it to the inlined object in preload/index.ts`,
      ).toBe(true);
      expect(
        inlinedEntries.get(key),
        `Preload ipcChannel "${key}" has value "${inlinedEntries.get(key)}" but contracts defines "${value}"`,
      ).toBe(value);
    }

    // No extra keys in preload that aren't in contracts
    for (const [key] of inlinedEntries) {
      expect(
        key in ipcChannels,
        `Preload has extra ipcChannel key "${key}" not present in @srgnt/contracts`,
      ).toBe(true);
    }
  });
});
