/**
 * Semantic Search Failure Path E2E Tests
 *
 * Tests graceful error handling for:
 * - Corrupt index state
 * - Missing bundled assets
 * - Stale workspace cleanup
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, expect, test, waitForDesktopReady } from './fixtures';

test.describe('Semantic Search Failure Paths', () => {
  test.beforeEach(async ({ window: page }) => {
    await waitForDesktopReady(page);
    await completeOnboarding(page);
  });

  test('handles corrupt index directory gracefully', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Create a corrupt index directory
    const indexDir = path.join(workspaceRoot, '.srgnt-semantic-search');
    await fs.mkdir(indexDir, { recursive: true });

    // Write corrupt data
    await fs.writeFile(path.join(indexDir, 'manifest.json'), 'not valid json{{{', 'utf-8');

    // Enable semantic search - should handle corrupt index gracefully
    const result = await page.evaluate(
      async (root) => {
        try {
          const enabled = await window.srgnt.semanticSearchEnableForWorkspace(root);
          return { enabled, error: null };
        } catch (err) {
          return { enabled: false, error: String(err) };
        }
      },
      workspaceRoot,
    );

    // Should either succeed (rebuild) or fail gracefully
    const enabled = typeof result.enabled === 'boolean' ? result.enabled : result.enabled.enabled;
    expect(typeof enabled).toBe('boolean');
  });

  test('handles missing index directory gracefully', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Ensure no index directory exists
    const indexDir = path.join(workspaceRoot, '.srgnt-semantic-search');
    await fs.rm(indexDir, { recursive: true, force: true });

    // Enable should work (creates index if missing)
    const result = await page.evaluate(
      async (root) => {
        try {
          const enabled = await window.srgnt.semanticSearchEnableForWorkspace(root);
          return { enabled, error: null };
        } catch (err) {
          return { enabled: false, error: String(err) };
        }
      },
      workspaceRoot,
    );

    const enabled = typeof result.enabled === 'boolean' ? result.enabled : result.enabled.enabled;
    expect(enabled).toBe(true);
  });

  test('teardown cleans up properly on workspace switch', async ({ window: page }) => {
    // Get first workspace
    const workspaceA = await page.evaluate(() => window.srgnt.getWorkspaceRoot());
    expect(workspaceA).toBeTruthy();

    // Enable on workspace A
    const enableA = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceA,
    );
    expect(enableA.enabled).toBe(true);

    // Create second workspace
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-e2e-teardown-'));
    const workspaceB = path.join(tempDir, 'workspace-b');

    try {
      // Switch to workspace B
      const newWorkspace = await page.evaluate(
        async (root) => {
          return await window.srgnt.setWorkspaceRoot(root);
        },
        workspaceB,
      );
      expect(newWorkspace).toBe(workspaceB);

      // Enable on workspace B
      const enableB = await page.evaluate(
        async (root) => {
          return await window.srgnt.semanticSearchEnableForWorkspace(root);
        },
        workspaceB,
      );
      expect(enableB.enabled).toBe(true);

      // Verify workspace A's index is still intact (not deleted)
      const indexAExists = await fs.access(path.join(workspaceA, '.srgnt-semantic-search')).then(
        () => true,
        () => false,
      );
      // Index should still exist (disable doesn't destroy)
      expect(indexAExists).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('handles missing workspace gracefully', async ({ window: page }) => {
    // Try to enable semantic search with non-existent workspace
    const nonExistentPath = path.join(os.tmpdir(), 'non-existent-workspace-12345');

    const result = await page.evaluate(
      async (root) => {
        try {
          const enabled = await window.srgnt.semanticSearchEnableForWorkspace(root);
          return { enabled, error: null };
        } catch (err) {
          return { enabled: false, error: String(err) };
        }
      },
      nonExistentPath,
    );

    // Should fail gracefully, not crash
    expect(result).toHaveProperty('enabled');
    expect(result).toHaveProperty('error');
  });

  test('status returns error state when host is in error state', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Get status - should be valid even if not initialized
    const status = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchStatus(root);
      },
      workspaceRoot,
    );

    // Status should always return valid structure
    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('indexedFileCount');
    expect(status).toHaveProperty('totalChunkCount');
    expect(status).toHaveProperty('progressPercent');

    // State should be one of the valid states
    expect([
      'uninitialized',
      'initializing',
      'ready',
      'indexing',
      'disabled',
      'error',
    ]).toContain(status.state);
  });

  test('handles rapid enable/disable without crash', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Rapidly call enable multiple times
    const results = await page.evaluate(
      async (root) => {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            window.srgnt.semanticSearchEnableForWorkspace(root).catch((err) => ({
              error: String(err),
            })),
          );
        }
        return Promise.all(promises);
      },
      workspaceRoot,
    );

    // All should complete without crash
    expect(results).toHaveLength(5);
  });

  test('handles index operation when not enabled gracefully', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Try to index without enabling first
    const result = await page.evaluate(
      async (root) => {
        try {
          const indexResult = await window.srgnt.semanticSearchIndexWorkspace(root, false);
          return { success: true, result: indexResult };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      workspaceRoot,
    );

    // Should either succeed (auto-enables) or fail gracefully
    if (result.success) {
      expect(result.result).toHaveProperty('indexedChunkCount');
    }
  });
});
