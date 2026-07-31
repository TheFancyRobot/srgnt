/**
 * UI Coverage Matrix — DOM/ARIA structure validation for every user-facing surface.
 *
 * This spec verifies that key UI surfaces exist, have correct ARIA roles, and
 * contain the expected structural elements. It does NOT duplicate functional tests
 * from app.spec.ts or gfm-compliance.spec.ts — it focuses purely on structural
 * coverage for surfaces that may lack dedicated assertions.
 *
 * Surfaces covered:
 *  - Titlebar: minimize, maximize/restore, close buttons
 *  - Activity Bar: toolbar with all 3 navigation items (Notes, Settings, Terminal), sections, online indicator
 *  - Side Panel: expanded/collapsed states, resize handle, toggle chevron
 *  - Settings: 3 categories (general, privacy, advanced)
 *  - Notes Side Panel: file tree, search input, action buttons
 *  - Notes Editor: display mode toggle, close button, CodeMirror container
 *  - Settings Side Panel: category navigation links
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { Page } from '@playwright/test';
import { completeOnboarding, expect, test, workspaceRootFor } from './fixtures';

/**
 * Empty the test's own Notes directory.
 *
 * This used to delete everything under `~/srgnt-workspace/Notes` — the
 * developer's real notes — because every spec onboarded into the shared default
 * workspace. Each test now gets its own workspace root, so this scopes to it.
 */
async function cleanWorkspaceNotes(userDataDir: string): Promise<void> {
  const notesDir = path.join(workspaceRootFor(userDataDir), 'Notes');
  try {
    const entries = await fs.readdir(notesDir);
    for (const entry of entries) {
      await fs.rm(path.join(notesDir, entry), { recursive: true, force: true });
    }
  } catch {
    // Directory may not exist yet — that's fine.
  }
}

/** The tree only renders once a note exists, so tests asserting it make one. */
async function createNote(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'New note' }).click();
  const inlineInput = page.locator('input[placeholder="note title..."]');
  await inlineInput.fill(title);
  await inlineInput.press('Enter');
  await expect(page.getByRole('heading', { name: title + '.md' })).toBeVisible();
}

// ─── Titlebar ──────────────────────────────────────────────────────────────

test.describe('Titlebar structure', () => {
  test('has drag region with logo', async ({ window: page }) => {
    await completeOnboarding(page);
    const titlebar = page.locator('.titlebar');
    await expect(titlebar).toBeVisible();
    await expect(titlebar.locator('.titlebar-logo')).toHaveText('srgnt');
  });

  test('has all window control buttons', async ({ window: page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole('button', { name: 'Minimize' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Maximize|Restore/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('window controls have correct button classes', async ({ window: page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole('button', { name: 'Close' })).toHaveClass(/titlebar-btn-close/);
  });
});

// ─── Activity Bar ──────────────────────────────────────────────────────────

test.describe('Activity Bar structure', () => {
  const navItems = [
    { name: 'Notes', section: 'main' },
    { name: 'Settings', section: 'system' },
    { name: 'Terminal', section: 'utility' },
  ];

  test('has vertical toolbar with all navigation items', async ({ window: page }) => {
    await completeOnboarding(page);
    const toolbar = page.getByRole('toolbar', { name: 'Application views' });
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveAttribute('aria-orientation', 'vertical');

    for (const item of navItems) {
      await expect(toolbar.getByRole('button', { name: item.name })).toBeVisible();
    }
  });

  test('navigation buttons have aria-pressed state', async ({ window: page }) => {
    await completeOnboarding(page);
    const toolbar = page.getByRole('toolbar', { name: 'Application views' });

    // Notes should be active by default
    await expect(toolbar.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true');
    await expect(toolbar.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('has online status indicator', async ({ window: page }) => {
    await completeOnboarding(page);
    await expect(page.getByLabel('Online')).toBeVisible();
  });

  test('sections are visually separated with borders', async ({ window: page }) => {
    await completeOnboarding(page);
    const toolbar = page.getByRole('toolbar', { name: 'Application views' });
    // Two border-t dividers: one before system group, one before utility group
    const borders = toolbar.locator('.border-t');
    await expect(borders).toHaveCount(2);
  });
});

// ─── Side Panel ────────────────────────────────────────────────────────────

test.describe('Side Panel structure', () => {
  test('starts in expanded state after onboarding', async ({ window: page }) => {
    await completeOnboarding(page);
    const sidePanel = page.getByRole('complementary', { name: 'Side panel' });
    await expect(sidePanel).toBeVisible();
    await expect(sidePanel).toHaveAttribute('data-collapsed', 'false');
  });

  test('has collapse/expand toggle button', async ({ window: page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole('button', { name: 'Collapse side panel' })).toBeVisible();
  });

  test('shows resize handle when expanded', async ({ window: page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole('separator', { name: 'Resize side panel' })).toBeVisible();
  });

  test('collapses and hides resize handle', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Collapse side panel' }).click();
    await expect(page.getByRole('complementary', { name: 'Side panel' })).toHaveAttribute('data-collapsed', 'true');
    await expect(page.getByRole('separator', { name: 'Resize side panel' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Expand side panel' })).toBeVisible();
  });
});

// ─── Settings Sections ─────────────────────────────────────────────────────

test.describe('Settings sections', () => {
  const settingsCategories = [
    { id: 'settings-section-general', heading: 'General' },
    { id: 'settings-section-privacy', heading: 'Privacy' },
    { id: 'settings-section-advanced', heading: 'Advanced' },
  ];

  test('all three settings categories are visible', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    for (const cat of settingsCategories) {
      await expect(page.locator(`#${cat.id}`)).toBeVisible();
      await expect(page.getByRole('heading', { name: cat.heading })).toBeVisible();
    }
  });

  test('General section has workspace path, theme, and update channel settings', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Settings' }).click();

    const general = page.locator('#settings-section-general');
    await expect(general.getByText('Workspace Path')).toBeVisible();
    await expect(general.getByText('Theme')).toBeVisible();
    await expect(general.getByText('Update Channel')).toBeVisible();
  });

  test('Privacy section has boolean toggle settings', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Settings' }).click();

    const privacy = page.locator('#settings-section-privacy');
    await expect(privacy.getByText('Allow Redacted Usage Telemetry')).toBeVisible();
    await expect(privacy.getByText('Allow Future Crash Uploads')).toBeVisible();
    // Boolean settings use checkbox inputs
    await expect(privacy.locator('input[type="checkbox"]')).toHaveCount(2);
  });

  // Phase 21: the aggregator connector surface is deleted entirely.
  // This test verifies Settings has exactly 3 sections (no Connectors section) and no old boolean connector toggles.
  test('Settings has three sections (General, Privacy, Advanced) without connector toggles', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Settings' }).click();

    // Exactly 3 section headings: General, Privacy, Advanced
    await expect(page.getByRole('heading', { level: 2, name: 'General' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Privacy' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Advanced' })).toBeVisible();

    // No old Jira/Outlook/Teams toggle rows
    await expect(page.locator('#settings-section-connectors')).not.toBeVisible();

    // Privacy section still has its two toggles
    const privacy = page.locator('#settings-section-privacy');
    await expect(privacy.locator('input[type="checkbox"]')).toHaveCount(2);
  });

  test('Advanced section has debug mode toggle', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Settings' }).click();

    const advanced = page.locator('#settings-section-advanced');
    await expect(advanced.getByText('Debug Mode')).toBeVisible();
    await expect(advanced.getByText('Max Concurrent Runs')).toBeVisible();
  });
});

// ─── Notes Side Panel ──────────────────────────────────────────────────────

test.describe('Notes Side Panel structure', () => {
  test('shows Explorer heading and action buttons', async ({ window: page }) => {
    await completeOnboarding(page);

    await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();
    // Action buttons: new note, new folder, refresh
    await expect(page.getByRole('button', { name: 'New note' })).toBeVisible();
    await expect(page.locator('button[title="New folder"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('has search input', async ({ window: page }) => {
    await completeOnboarding(page);

    const searchInput = page.locator('input[placeholder="Search notes..."]');
    await expect(searchInput).toBeVisible();
  });

  test('shows file tree with role="tree"', async ({ window: page }) => {
    await completeOnboarding(page);
    // Seeded explicitly. This passed only because every spec shared one
    // workspace and some earlier test had left a note in it.
    await createNote(page, 'Tree Fixture Note');
    const tree = page.getByRole('tree', { name: 'Notes file tree' });
    await expect(tree).toBeVisible({ timeout: 20000 });
  });

  test('shows empty state when no notes exist', async ({ window: page, userDataDir }) => {
    await cleanWorkspaceNotes(userDataDir);
    await completeOnboarding(page);

    // Wait for the loading indicator to disappear, then assert empty state.
    const loadingText = page.getByText('Loading notes...');
    if (await loadingText.isVisible()) {
      await expect(loadingText).not.toBeVisible();
    }
    await expect(page.getByText('No notes yet')).toBeVisible();
  });
});

// ─── Notes Editor ──────────────────────────────────────────────────────────

test.describe('Notes Editor structure', () => {
  test('shows placeholder when no note is selected', async ({ window: page }) => {
    await completeOnboarding(page);

    await expect(page.getByText('Select a note from the Explorer panel')).toBeVisible();
  });

  test('has display mode toggle and close button after selecting a note', async ({ window: page, userDataDir }) => {
    await cleanWorkspaceNotes(userDataDir);
    await completeOnboarding(page);

    // Create a note first
    await page.getByRole('button', { name: 'New note' }).click();
    const inlineInput = page.locator('input[placeholder="note title..."]');
    await inlineInput.fill('Coverage Test Note');
    await inlineInput.press('Enter');

    // Verify editor UI appears without relying on fixed delays
    await expect(page.getByRole('heading', { name: 'Coverage Test Note.md' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle fully rendered mode' })).toBeVisible();
    await expect(page.locator('.btn-ghost').getByText('Close')).toBeVisible();
  });

  test('CodeMirror editor container is present when editing a note', async ({ window: page, userDataDir }) => {
    await cleanWorkspaceNotes(userDataDir);
    await completeOnboarding(page);

    // Create a note
    await page.getByRole('button', { name: 'New note' }).click();
    const inlineInput = page.locator('input[placeholder="note title..."]');
    await inlineInput.fill('Editor Test');
    await inlineInput.press('Enter');

    // CodeMirror should be mounted
    await expect(page.locator('.cm-editor')).toBeVisible();
  });
});

// ─── Side Panel Content Variants ───────────────────────────────────────────

test.describe('Side Panel content variants', () => {
  test('Settings side panel shows category navigation', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Settings' }).click();

    const categoryNav = page.getByRole('navigation', { name: 'Settings categories' });
    await expect(categoryNav).toBeVisible();
    await expect(categoryNav.getByRole('listitem')).toHaveCount(3);
  });
});

// ─── Focus and Keyboard Navigation ─────────────────────────────────────────

test.describe('Focus and keyboard navigation', () => {
  test('activity bar first button is focusable', async ({ window: page }) => {
    await completeOnboarding(page);
    const toolbar = page.getByRole('toolbar', { name: 'Application views' });
    const firstButton = toolbar.getByRole('button', { name: 'Notes' });

    // The ActivityBar uses roving tabindex — first item has tabIndex=0 by default
    // Focus it explicitly and verify it's focusable
    await firstButton.focus();
    await expect(firstButton).toBeFocused();
  });

  test('side panel toggle is keyboard accessible', async ({ window: page }) => {
    await completeOnboarding(page);
    const toggle = page.getByRole('button', { name: 'Collapse side panel' });

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('complementary', { name: 'Side panel' })).toHaveAttribute('data-collapsed', 'true');
  });

  test('Ctrl+B toggles sidebar', async ({ window: page }) => {
    await completeOnboarding(page);
    // Side panel starts expanded
    await expect(page.getByRole('complementary', { name: 'Side panel' })).toHaveAttribute('data-collapsed', 'false');

    await page.keyboard.press('Control+b');
    await expect(page.getByRole('complementary', { name: 'Side panel' })).toHaveAttribute('data-collapsed', 'true');

    await page.keyboard.press('Control+b');
    await expect(page.getByRole('complementary', { name: 'Side panel' })).toHaveAttribute('data-collapsed', 'false');
  });
});
