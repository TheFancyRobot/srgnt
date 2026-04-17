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
 *  - Activity Bar: toolbar with all 6 navigation items, sections, online indicator
 *  - Side Panel: expanded/collapsed states, resize handle, toggle chevron
 *  - Today View: all 4 sections (blockers, priorities, schedule, attention)
 *  - Settings: 3 categories (general, privacy, advanced)
 *  - Connectors: Jira, Outlook, Teams card structure and status indicators
 *  - Notes Side Panel: file tree, search input, action buttons
 *  - Notes Editor: display mode toggle, close button, CodeMirror container
 *  - Today Side Panel: section navigation links
 *  - Settings Side Panel: category navigation links
 *  - Connectors Side Panel: connector list with status dots
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { completeOnboarding, expect, test } from './fixtures';

/**
 * Remove all entries from the shared workspace Notes directory.
 * Tests share ~/srgnt-workspace across runs, so note-creation tests
 * must clean up before asserting a fresh state.
 */
async function cleanWorkspaceNotes(): Promise<void> {
  const notesDir = path.join(os.homedir(), 'srgnt-workspace', 'Notes');
  try {
    const entries = await fs.readdir(notesDir);
    for (const entry of entries) {
      await fs.rm(path.join(notesDir, entry), { recursive: true, force: true });
    }
  } catch {
    // Directory may not exist yet — that's fine.
  }
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
    { name: 'Daily Dashboard', section: 'main' },
    { name: 'Calendar', section: 'main' },
    { name: 'Notes', section: 'main' },
    { name: 'Connectors', section: 'system' },
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

    // Daily Dashboard should be active by default
    await expect(toolbar.getByRole('button', { name: 'Daily Dashboard' })).toHaveAttribute('aria-pressed', 'true');
    await expect(toolbar.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-pressed', 'false');
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

// ─── Today View Sections ───────────────────────────────────────────────────

test.describe('Today View sections', () => {
  const todaySections = [
    { id: 'section-blockers', heading: 'Blockers & Watch-outs' },
    { id: 'section-priorities', heading: 'Priorities' },
    { id: 'section-schedule', heading: 'Schedule' },
    { id: 'section-attention-needed', heading: 'Attention Needed' },
  ];

  test('all four sections are present on Daily Dashboard', async ({ window: page }) => {
    await completeOnboarding(page);

    for (const section of todaySections) {
      await expect(page.locator(`#${section.id}`)).toBeVisible();
      await expect(page.getByRole('heading', { name: section.heading })).toBeVisible();
    }
  });

  test('summary strip shows counts', async ({ window: page }) => {
    await completeOnboarding(page);
    // The summary strip shows high priority count, meetings count, unread count
    await expect(page.locator('header').getByText('high priority')).toBeVisible();
    await expect(page.locator('header').getByText('meetings')).toBeVisible();
    await expect(page.locator('header').getByText('unread')).toBeVisible();
  });

  test('Priorities section shows fixture tasks with badges', async ({ window: page }) => {
    await completeOnboarding(page);
    const prioritiesSection = page.locator('#section-priorities');
    // Fixture has 6 tasks
    await expect(prioritiesSection.locator('.badge')).toHaveCount(6);
  });

  test('Schedule section shows fixture events', async ({ window: page }) => {
    await completeOnboarding(page);
    const scheduleSection = page.locator('#section-schedule');
    // Fixture has 5 events
    await expect(scheduleSection.locator('.font-mono-data').first()).toBeVisible();
  });

  test('Attention Needed section shows unread count badge', async ({ window: page }) => {
    await completeOnboarding(page);
    const attentionHeading = page.getByRole('heading', { name: 'Attention Needed' });
    await expect(attentionHeading.locator('.rounded-full')).toHaveText('2');
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

  // Phase 19: Settings no longer has connector toggle rows.
  // Connectors are managed via the three-state model in the ConnectorStatusPanel (Install/Connect/Disconnect/Uninstall).
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

// ─── Connectors Panel ──────────────────────────────────────────────────────

test.describe('Connectors panel structure', () => {
  const connectorIds = ['connector-jira', 'connector-outlook', 'connector-teams'];


  test('all three connector cards are present', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Connectors' }).click();

    for (const id of connectorIds) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('each connector card has name, description, and status indicator', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Connectors' }).click();

    // Verify each card by its ID, checking name and description within the card
    const jiraCard = page.locator('#connector-jira');
    await expect(jiraCard.locator('h3')).toHaveText('Jira');
    await expect(jiraCard.getByText('Tasks, stories, and sprint data')).toBeVisible();

    const outlookCard = page.locator('#connector-outlook');
    await expect(outlookCard.locator('h3')).toHaveText('Outlook Calendar');
    await expect(outlookCard.getByText('Calendar events and scheduling')).toBeVisible();

    const teamsCard = page.locator('#connector-teams');
    await expect(teamsCard.locator('h3')).toHaveText('Microsoft Teams');
    await expect(teamsCard.getByText('Messages, mentions, and channels')).toBeVisible();

    // All start disconnected — each card should show 'Disconnected' status text
    for (const id of connectorIds) {
      await expect(page.locator(`#${id}`).getByText('Disconnected')).toBeVisible();
    }
  });

  // Fresh workspace: all connectors are available but NOT installed (Phase 19 install-before-use model)
  test('fresh workspace: all connectors show Install button (not Connect)', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Connectors' }).click();

    // All connectors are uninstalled by default — show Install, not Connect
    await expect(page.getByRole('button', { name: 'Install Jira' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Install Outlook Calendar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Install Microsoft Teams' })).toBeVisible();

    // No Connect buttons visible yet (must install first)
    await expect(page.getByRole('button', { name: 'Connect Jira' })).toHaveCount(0);
  });
});

// ─── Notes Side Panel ──────────────────────────────────────────────────────

test.describe('Notes Side Panel structure', () => {
  test('shows Explorer heading and action buttons', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Notes' }).click();

    await expect(page.getByRole('heading', { name: 'Explorer' })).toBeVisible();
    // Action buttons: new note, new folder, refresh
    await expect(page.getByRole('button', { name: 'New note' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New folder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('has search input', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Notes' }).click();

    const searchInput = page.locator('input[placeholder="Search notes..."]');
    await expect(searchInput).toBeVisible();
  });

  test('shows file tree with role="tree"', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Notes' }).click();

    const tree = page.getByRole('tree', { name: 'Notes file tree' });
    await expect(tree).toBeVisible();
  });

  test('shows empty state when no notes exist', async ({ window: page }) => {
    await cleanWorkspaceNotes();
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Notes' }).click();

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
    await page.getByRole('button', { name: 'Notes' }).click();

    await expect(page.getByText('Select a note from the Explorer panel')).toBeVisible();
  });

  test('has display mode toggle and close button after selecting a note', async ({ window: page }) => {
    await cleanWorkspaceNotes();
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Notes' }).click();

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

  test('CodeMirror editor container is present when editing a note', async ({ window: page }) => {
    await cleanWorkspaceNotes();
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Notes' }).click();

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
  test('Today side panel shows section navigation', async ({ window: page }) => {
    await completeOnboarding(page);
    // Today is active by default, side panel should show section nav
    const sectionNav = page.getByRole('navigation', { name: 'Dashboard sections' });
    await expect(sectionNav).toBeVisible();
    await expect(sectionNav.getByRole('listitem')).toHaveCount(4);
  });

  test('Settings side panel shows category navigation', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Settings' }).click();

    const categoryNav = page.getByRole('navigation', { name: 'Settings categories' });
    await expect(categoryNav).toBeVisible();
    await expect(categoryNav.getByRole('listitem')).toHaveCount(3);
  });

  test('Connectors side panel shows connector list', async ({ window: page }) => {
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Connectors' }).click();

    const connectorNav = page.getByRole('navigation', { name: 'Connector list' });
    await expect(connectorNav).toBeVisible();
    await expect(connectorNav.getByRole('listitem')).toHaveCount(3);
  });
});

// ─── Focus and Keyboard Navigation ─────────────────────────────────────────

test.describe('Focus and keyboard navigation', () => {
  test('activity bar first button is focusable', async ({ window: page }) => {
    await completeOnboarding(page);
    const toolbar = page.getByRole('toolbar', { name: 'Application views' });
    const firstButton = toolbar.getByRole('button', { name: 'Daily Dashboard' });

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
