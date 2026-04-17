/**
 * Semantic Search Offline Validation E2E Tests
 *
 * Validates that the semantic search subsystem works without network access:
 * - Bundled model loads from local path
 * - Indexing works offline
 * - Search works offline
 * - No network calls are made during operation
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, expect, test, waitForDesktopReady } from './fixtures';

test.describe('Semantic Search Offline Validation', () => {
  test.beforeEach(async ({ window: page }) => {
    await waitForDesktopReady(page);
    await completeOnboarding(page);
  });

  test('enableForWorkspace works without network access', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Track network calls
    const networkCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      // Ignore localhost and file:// URLs (our app)
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        networkCalls.push(url);
      }
    });

    // Enable semantic search (should use bundled model)
    const result = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceRoot,
    );

    // Wait a bit for any delayed network calls
    await page.waitForTimeout(1000);

    // Should succeed without network
    expect(result.enabled).toBe(true);

    // Filter to only external network calls (not localhost dev server)
    const externalCalls = networkCalls.filter(
      (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
    );

    // Should have made no external network calls for model loading
    expect(externalCalls, 'Should not make external network calls').toHaveLength(0);
  });

  test('indexWorkspace completes without network access', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Enable first
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceRoot,
    );

    // Track network calls
    const networkCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        networkCalls.push(url);
      }
    });

    // Index workspace
    const result = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    await page.waitForTimeout(1000);

    // Should complete successfully
    expect(result).toHaveProperty('indexedChunkCount');
    expect(result).toHaveProperty('durationMs');

    // Should have made no external network calls
    const externalCalls = networkCalls.filter(
      (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
    );
    expect(externalCalls, 'Should not make external network calls during indexing').toHaveLength(0);
  });

  test('search returns results without network access', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Enable and index first
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // Track network calls
    const networkCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        networkCalls.push(url);
      }
    });

    // Search
    const result = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchSearch(root, 'workspace test', 5, 0.3);
      },
      workspaceRoot,
    );

    await page.waitForTimeout(1000);

    // Should return results structure
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);

    // Should have made no external network calls
    const externalCalls = networkCalls.filter(
      (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
    );
    expect(externalCalls, 'Should not make external network calls during search').toHaveLength(0);
  });

  test('rebuildAll works without network access', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Enable first
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceRoot,
    );

    // Track network calls
    const networkCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
        networkCalls.push(url);
      }
    });

    // Rebuild
    const result = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchRebuildAll(root);
      },
      workspaceRoot,
    );

    await page.waitForTimeout(1000);

    // Should complete successfully
    expect(result).toHaveProperty('totalChunkCount');
    expect(result).toHaveProperty('durationMs');

    // Should have made no external network calls
    const externalCalls = networkCalls.filter(
      (url) => !url.includes('localhost') && !url.includes('127.0.0.1'),
    );
    expect(externalCalls, 'Should not make external network calls during rebuild').toHaveLength(0);
  });

  test('model asset path uses bundled local assets', async ({ window: page }) => {
    // Read the main process source to verify model asset path
    const candidatePaths = [
      path.join(process.cwd(), 'src/main/semantic-search/host.ts'),
      path.join(process.cwd(), 'packages/desktop/src/main/semantic-search/host.ts'),
      path.join(__dirname, 'src/main/semantic-search/host.ts'),
    ];

    let mainSource = '';
    for (const candidate of candidatePaths) {
      try {
        mainSource = await fs.readFile(candidate, 'utf-8');
        break;
      } catch {
        // try next
      }
    }

    expect(mainSource).not.toEqual('');

    // Verify that the host uses bundled model path (not remote)
    expect(mainSource).toContain('node_modules/@huggingface/transformers/models');
  });
});
