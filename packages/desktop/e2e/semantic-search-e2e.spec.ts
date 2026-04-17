/**
 * Semantic Search Integration E2E Tests
 *
 * Tests the semantic search subsystem through the full Electron app stack:
 * - Preload API access
 * - Search execution and result delivery
 * - Workspace switching
 * - Status reporting
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { completeOnboarding, expect, test, waitForDesktopReady } from './fixtures';

test.describe('Semantic Search Integration', () => {
  test.beforeEach(async ({ window: page }) => {
    await waitForDesktopReady(page);
    await completeOnboarding(page);
  });

  test('preload API exposes semantic search methods', async ({ window: page }) => {
    const hasApi = await page.evaluate(() => {
      return {
        semanticSearchInit: typeof window.srgnt.semanticSearchInit === 'function',
        semanticSearchEnableForWorkspace:
          typeof window.srgnt.semanticSearchEnableForWorkspace === 'function',
        semanticSearchIndexWorkspace:
          typeof window.srgnt.semanticSearchIndexWorkspace === 'function',
        semanticSearchRebuildAll:
          typeof window.srgnt.semanticSearchRebuildAll === 'function',
        semanticSearchSearch: typeof window.srgnt.semanticSearchSearch === 'function',
        semanticSearchStatus: typeof window.srgnt.semanticSearchStatus === 'function',
      };
    });

    expect(hasApi.semanticSearchInit).toBe(true);
    expect(hasApi.semanticSearchEnableForWorkspace).toBe(true);
    expect(hasApi.semanticSearchIndexWorkspace).toBe(true);
    expect(hasApi.semanticSearchRebuildAll).toBe(true);
    expect(hasApi.semanticSearchSearch).toBe(true);
    expect(hasApi.semanticSearchStatus).toBe(true);
  });

  test('semanticSearchStatus returns valid state structure', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    const status = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchStatus(root);
      },
      workspaceRoot,
    );

    // Status should have the expected shape
    expect(status).toHaveProperty('state');
    expect(['uninitialized', 'initializing', 'ready', 'indexing', 'disabled', 'error']).toContain(
      status.state,
    );
    expect(status).toHaveProperty('indexedFileCount');
    expect(status).toHaveProperty('totalChunkCount');
    expect(status).toHaveProperty('progressPercent');
  });

  test('enableForWorkspace triggers and returns enabled=true', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    const result = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceRoot,
    );

    expect(result.enabled).toBe(true);
  });

  test('indexWorkspace returns expected result shape', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Enable first
    await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceRoot,
    );

    // Index workspace
    const result = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    expect(result).toHaveProperty('indexedChunkCount');
    expect(result).toHaveProperty('skippedCount');
    expect(result).toHaveProperty('durationMs');
    expect(typeof result.indexedChunkCount).toBe('number');
    expect(typeof result.skippedCount).toBe('number');
    expect(typeof result.durationMs).toBe('number');
  });

  test('search returns array of result entries with correct shape', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Enable and index first
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // Search
    const response = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchSearch(root, 'test query', 10, 0.5);
      },
      workspaceRoot,
    );

    expect(response).toHaveProperty('results');
    expect(Array.isArray(response.results)).toBe(true);

    // If there are results, verify shape
    if (response.results.length > 0) {
      const firstResult = response.results[0];
      expect(firstResult).toHaveProperty('score');
      expect(firstResult).toHaveProperty('title');
      expect(firstResult).toHaveProperty('workspaceRelativePath');
      expect(firstResult).toHaveProperty('snippet');
      expect(typeof firstResult.score).toBe('number');
      expect(typeof firstResult.title).toBe('string');
      expect(typeof firstResult.workspaceRelativePath).toBe('string');
      expect(typeof firstResult.snippet).toBe('string');
    }
  });

  test('rebuildAll returns expected result shape', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Enable first
    await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceRoot,
    );

    // Rebuild all
    const result = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchRebuildAll(root);
      },
      workspaceRoot,
    );

    expect(result).toHaveProperty('totalChunkCount');
    expect(result).toHaveProperty('durationMs');
    expect(typeof result.totalChunkCount).toBe('number');
    expect(typeof result.durationMs).toBe('number');
  });

  test('workspace switching tears down and reinitializes semantic search', async ({ window: page }) => {
    // Get first workspace
    const workspaceA = await page.evaluate(() => window.srgnt.getWorkspaceRoot());
    expect(workspaceA).toBeTruthy();

    // Enable semantic search on workspace A
    const enableA = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchEnableForWorkspace(root);
      },
      workspaceA,
    );
    expect(enableA.enabled).toBe(true);

    // Create a second workspace
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'srgnt-e2e-semantic-'));
    const workspaceB = path.join(tempDir, 'workspace-b');

    try {
      // Set new workspace root
      const newWorkspace = await page.evaluate(
        async (root) => {
          return await window.srgnt.setWorkspaceRoot(root);
        },
        workspaceB,
      );
      expect(newWorkspace).toBe(workspaceB);

      // Verify workspace changed
      const currentWorkspace = await page.evaluate(() => window.srgnt.getWorkspaceRoot());
      expect(currentWorkspace).toBe(workspaceB);

      // Status should reflect disabled state after workspace switch
      const status = await page.evaluate(
        async (root) => {
          return await window.srgnt.semanticSearchStatus(root);
        },
        workspaceB,
      );
      // State could be 'disabled', 'uninitialized', or 'ready' depending on timing
      expect(['disabled', 'uninitialized', 'ready']).toContain(status.state);
    } finally {
      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('status updates after indexing operation', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Enable and index
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // Get status after indexing
    const statusAfter = await page.evaluate(
      async (root) => {
        return await window.srgnt.semanticSearchStatus(root);
      },
      workspaceRoot,
    );

    // Status should be 'ready' after indexing
    expect(statusAfter.state).toBe('ready');
  });

  test('query → results → open note flow in semantic search UI', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });

    const noteContent =
      '# Semantic Notes\n\nThis note includes the phrase "quantum lattice" so semantic search can find it.';
    const notePath = path.join(notesDir, 'SemanticNotes.md');
    await fs.writeFile(notePath, noteContent, 'utf-8');

    await page.evaluate(async (root) => {
      await window.srgnt.semanticSearchEnableForWorkspace(root);
      await window.srgnt.semanticSearchIndexWorkspace(root, true);
    }, workspaceRoot);

    await page.getByRole('button', { name: 'Notes' }).click();
    await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();
    await page.getByTestId('semantic-search-mode').click();

    const searchInput = page.locator('input[placeholder="Search semantically..."]');
    await searchInput.fill('quantum lattice');

    const result = page.getByRole('button', { name: /Semantic Notes/i });
    await expect(result).toBeVisible({ timeout: 10000 });
    await result.click();

    await expect(page.getByRole('heading', { name: 'SemanticNotes.md' })).toBeVisible({ timeout: 5000 });
    const editorContent = await page.locator('.cm-content').textContent();
    expect(editorContent).toContain('quantum lattice');
  });
});
