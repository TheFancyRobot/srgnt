/**
 * Semantic Search Query Flow E2E Tests
 *
 * Tests the full end-to-end semantic search flow:
 * 1. Complete onboarding
 * 2. Create notes with searchable content
 * 3. Enable semantic search for workspace
 * 4. Index the workspace
 * 5. Toggle to semantic search mode
 * 6. Type a search query in the semantic search input
 * 7. Verify search results appear
 * 8. Click a search result
 * 9. Verify the note opens in the editor
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { completeOnboarding, expect, test, waitForDesktopReady } from './fixtures';

test.describe('Semantic Search Query Flow', () => {
  test.beforeEach(async ({ window: page }) => {
    await waitForDesktopReady(page);
    await completeOnboarding(page);
  });

  test('semantic search mode: query → results → open note', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // 1. Create a note with searchable content
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });

    const noteContent = `---\ntitle: Semantic Notes\n---\n\nMeeting about project planning and roadmap discussion.\nThis is a unique phrase: quasar constellation alignment.\n`;
    const notePath = path.join(notesDir, 'SemanticNotes.md');
    await fs.writeFile(notePath, noteContent, 'utf-8');

    // 2. Enable and index semantic search
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // 3. Navigate to Notes via Activity Bar
    await page.getByRole('button', { name: 'Notes' }).click();
    await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();

    // 4. Click Semantic mode toggle
    await page.getByTestId('semantic-search-mode').click();
    await expect(page.locator('input[placeholder="Search semantically..."]')).toBeVisible();

    // 5. Type a semantic search query
    const searchInput = page.locator('input[placeholder="Search semantically..."]');
    await searchInput.fill('quasar constellation');

    // 6. Wait for search results to appear
    await expect(page.getByText('Semantic Notes')).toBeVisible({ timeout: 15000 });

    // 7. Click the search result
    await page.getByRole('button', { name: /Semantic Notes/i }).click();

    // 8. Verify the note opens in the editor
    await expect(page.getByRole('heading', { name: 'SemanticNotes.md' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('markdown-editor-wrapper')).toBeVisible();

    // Verify content was loaded
    const editorContent = await page.locator('.cm-content').textContent();
    expect(editorContent).toContain('quasar constellation');
  });

  test('semantic search: unique term finds correct note', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Create multiple notes
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });

    const note1Content = `# Alpha Note\n\nThis is about regular stuff.\n`;
    const note2Content = `# Beta Note\n\nThis contains unique artifact id SRGNT-UNIQUE-789.\n`;
    const note3Content = `# Gamma Note\n\nAnother regular note with different content.\n`;

    await fs.writeFile(path.join(notesDir, 'AlphaNote.md'), note1Content, 'utf-8');
    await fs.writeFile(path.join(notesDir, 'BetaNote.md'), note2Content, 'utf-8');
    await fs.writeFile(path.join(notesDir, 'GammaNote.md'), note3Content, 'utf-8');

    // Enable and index
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // Navigate to Notes
    await page.getByRole('button', { name: 'Notes' }).click();

    // Toggle to Semantic mode
    await page.getByTestId('semantic-search-mode').click();

    // Search for the unique term
    const searchInput = page.locator('input[placeholder="Search semantically..."]');
    await searchInput.fill('SRGNT-UNIQUE-789');

    // Wait for results
    await expect(page.getByText('Beta Note')).toBeVisible({ timeout: 15000 });

    // Click result
    await page.getByRole('button', { name: /Beta Note/i }).click();

    // Verify note opened
    await expect(page.getByRole('heading', { name: 'BetaNote.md' })).toBeVisible({ timeout: 5000 });

    // Verify content
    const editorContent = await page.locator('.cm-content').textContent();
    expect(editorContent).toContain('SRGNT-UNIQUE-789');
  });

  test('semantic search clears when switching back to notes mode', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Create a note
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });
    await fs.writeFile(
      path.join(notesDir, 'ClearTest.md'),
      '# Clear Test\n\nContent for clearing test with unique keyword: palindrome.\n',
      'utf-8',
    );

    // Enable and index
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // Navigate to Notes
    await page.getByRole('button', { name: 'Notes' }).click();

    // Toggle to Semantic mode
    await page.getByTestId('semantic-search-mode').click();
    const semanticInput = page.locator('input[placeholder="Search semantically..."]');
    await semanticInput.fill('palindrome');

    // Wait for results
    await expect(page.getByText('Clear Test')).toBeVisible({ timeout: 15000 });

    // Switch back to Notes mode
    await page.getByTestId('notes-search-mode').click();
    const notesInput = page.locator('input[placeholder="Search notes..."]');
    await expect(notesInput).toBeVisible();

    // Tree view should return
    await expect(page.getByRole('treeitem', { name: /ClearTest\.md/ })).toBeVisible();
  });

  test('semantic search shows no results for non-matching query', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Create a note
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });
    await fs.writeFile(
      path.join(notesDir, 'ExistingNote.md'),
      '# Existing Note\n\nThis note has specific content about alpha particles.\n',
      'utf-8',
    );

    // Enable and index
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // Navigate to Notes
    await page.getByRole('button', { name: 'Notes' }).click();

    // Toggle to Semantic mode
    await page.getByTestId('semantic-search-mode').click();

    // Search for something that definitely doesn't semantically related
    const searchInput = page.locator('input[placeholder="Search semantically..."]');
    await searchInput.fill('xyznonexistentquery789 banana apple orange');

    // Wait for search to complete
    await page.waitForTimeout(1000);

    // Should show no results message
    await expect(page.getByText('No results for')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('xyznonexistentquery789')).toBeVisible();
  });

  test('notes search still works after semantic mode exists', async ({ window: page }) => {
    const workspaceRoot = await page.evaluate(() => window.srgnt.getWorkspaceRoot());

    // Create notes
    const notesDir = path.join(workspaceRoot, 'Notes');
    await fs.mkdir(notesDir, { recursive: true });
    await fs.writeFile(
      path.join(notesDir, 'AlphaNote.md'),
      '# Alpha Note\n\nThis contains the word pineapple.\n',
      'utf-8',
    );

    // Enable and index
    await page.evaluate(
      async (root) => {
        await window.srgnt.semanticSearchEnableForWorkspace(root);
        await window.srgnt.semanticSearchIndexWorkspace(root, false);
      },
      workspaceRoot,
    );

    // Navigate to Notes
    await page.getByRole('button', { name: 'Notes' }).click();

    // Stay in Notes mode (default)
    const searchInput = page.locator('input[placeholder="Search notes..."]');
    await searchInput.fill('pineapple');

    // Wait for results
    await expect(page.getByText('Alpha Note')).toBeVisible({ timeout: 10000 });

    // Click result
    await page.getByRole('button', { name: /Alpha Note/i }).click();

    // Verify note opened
    await expect(page.getByRole('heading', { name: 'AlphaNote.md' })).toBeVisible({ timeout: 5000 });
  });
});
